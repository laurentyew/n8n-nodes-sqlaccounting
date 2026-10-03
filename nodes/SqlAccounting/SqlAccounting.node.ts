import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { MAIN_CONNECTION } from './connection';
import { ValidationError } from './errors';
import { getOperation } from './registry';
import { errorToJson, runOperation, SqlCredentials } from './execute/runOperation';
import { lookupMethods } from './lookups';
import { buildProperties } from './ui/properties';

export class SqlAccounting implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQL Accounting',
		name: 'sqlAccounting',
		icon: { light: 'file:../../icons/sqlaccounting.svg', dark: 'file:../../icons/sqlaccounting.dark.svg' },
		usableAsTool: true,
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the SQL Accounting REST API via the SQL Accounting n8n Node service.',
		defaults: { name: 'SQL Accounting' },
		inputs: [MAIN_CONNECTION],
		outputs: [MAIN_CONNECTION],
		credentials: [{ name: 'sqlAccountingApi', required: true }],
		properties: buildProperties(),
	};

	methods = { loadOptions: lookupMethods };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		const creds = (await this.getCredentials('sqlAccountingApi')) as unknown as SqlCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				const op = getOperation(this.getNodeParameter('operation', i) as string);
				const rows = await runOperation(this, i, op, creds);
				output.push(...rows.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({ json: errorToJson(error), pairedItem: { item: i } });
					continue;
				}
				if (error instanceof ValidationError) {
					throw new NodeOperationError(this.getNode(), 'Some inputs are invalid.', {
						itemIndex: i,
						description: error.issues.join('\n'),
					});
				}
				const description = error instanceof NodeOperationError ? error.description : undefined;
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i, description });
			}
		}
		return [output];
	}
}
