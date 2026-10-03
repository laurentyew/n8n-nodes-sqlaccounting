import { DynamicStructuredTool } from '@langchain/core/tools';
import type { INodeType, INodeTypeDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { z } from 'zod';
import type { SqlCredentials } from '../SqlAccounting/execute/runOperation';
import { DEFAULT_LIMIT, getToolFunction, MAX_LIMIT, runToolFunction, TOOL_FUNCTIONS, ToolFunction } from './functions';

// Older n8n releases do not export NodeConnectionTypes; fall back to the literal they used.
const AI_TOOL_CONNECTION = NodeConnectionTypes?.AiTool ?? 'ai_tool';

// @langchain/core 0.3.x's DynamicStructuredTool generic inference triggers TS2589
// ("Type instantiation is excessively deep and possibly infinite") under this project's
// tsconfig. The runtime shape is stable, so we type the constructor locally and skip the
// recursive generics.
interface ToolLike {
	name: string;
	description: string;
	invoke(input: unknown): Promise<unknown>;
}

const DynamicTool = DynamicStructuredTool as unknown as new (fields: {
	name: string;
	description: string;
	schema: z.ZodTypeAny;
	func: (input: Record<string, unknown>) => Promise<string>;
}) => ToolLike;

function schemaFor(fn: ToolFunction): z.ZodObject<z.ZodRawShape> {
	if (fn.kind === 'get') {
		return z.object({ code: z.string().min(1).describe('Exact record code, e.g. 300-A0001.') });
	}
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const field of fn.filters) {
		shape[field] = z.string().optional().describe(`Match on ${field}. Use * as a wildcard.`);
	}
	shape.limit = z
		.number()
		.optional()
		.describe(`Maximum records to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`);
	return z.object(shape);
}

export class SqlAccountingTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQL Accounting Tool',
		name: 'sqlAccountingTool',
		icon: { light: 'file:../../icons/sqlaccounting.svg', dark: 'file:../../icons/sqlaccounting.dark.svg' },
		group: ['output'],
		version: 1,
		description: 'Read-only SQL Accounting lookups (customers, suppliers, stock items) for an AI Agent.',
		defaults: { name: 'SQL Accounting Tool' },
		inputs: [],
		outputs: [AI_TOOL_CONNECTION],
		outputNames: ['Tool'],
		credentials: [{ name: 'sqlAccountingApi', required: true }],
		properties: [
			{
				displayName: 'Function',
				name: 'function',
				type: 'options',
				noDataExpression: true,
				// Literal (not TOOL_FUNCTIONS[0].name) so the n8n lint rule can read it; must match the first entry.
				default: 'searchCustomers',
				description: 'The lookup the AI Agent can call. Add one tool node per function.',
				options: TOOL_FUNCTIONS.map((f) => ({ name: f.name, value: f.name, description: f.description })),
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const fn = getToolFunction(this.getNodeParameter('function', itemIndex) as string);
		const creds = (await this.getCredentials('sqlAccountingApi')) as unknown as SqlCredentials;
		const tool = new DynamicTool({
			name: fn.name,
			description: fn.description,
			schema: schemaFor(fn),
			func: async (input: Record<string, unknown>) =>
				JSON.stringify(await runToolFunction(this, creds, fn.name, input)),
		});
		return { response: tool };
	}
}
