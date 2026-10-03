import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { MAIN_CONNECTION } from '../SqlAccounting/connection';
import { ValidationError } from '../SqlAccounting/errors';
import { buildRequest, errorToJson, SqlCredentials } from '../SqlAccounting/execute/runOperation';
import { normalizeData, toArray } from '../SqlAccounting/normalize';
import { callProxy } from '../SqlAccounting/transport';
import { AiCallInput, prepareCall } from './aiRequest';
import { describeAll, describeResource, findResource } from './describe';

const DESCRIPTION =
	'Look up SQL Accounting data for an AI agent. Start with Describe to find the resources and their fields, then List or Get records. Create, update and delete only work when Allow Changes is on.';

export class SqlAccountingAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQL Accounting AI',
		name: 'sqlAccountingAi',
		icon: { light: 'file:../../icons/sqlaccounting.svg', dark: 'file:../../icons/sqlaccounting.dark.svg' },
		usableAsTool: true,
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operationName"] + ": " + $parameter["resourceName"]}}',
		description: DESCRIPTION,
		defaults: { name: 'SQL Accounting AI' },
		inputs: [MAIN_CONNECTION],
		outputs: [MAIN_CONNECTION],
		credentials: [{ name: 'sqlAccountingApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operationName',
				type: 'options',
				options: [
					{ name: 'Create', value: 'create', description: 'Create a record (needs Allow Changes)' },
					{ name: 'Delete', value: 'delete', description: 'Delete a record (needs Allow Changes)' },
					{ name: 'Describe', value: 'describe', description: 'List the resources, or the fields of one resource' },
					{ name: 'Get', value: 'get', description: 'Get one record by its ID' },
					{ name: 'List', value: 'list', description: 'List records, with optional filters' },
					{ name: 'Update', value: 'update', description: 'Update a record (needs Allow Changes)' },
				],
				default: 'describe',
				description: 'What to do. Use Describe first to find the resources and their fields.',
			},
			{
				displayName: 'Resource Name',
				name: 'resourceName',
				type: 'string',
				default: '',
				description:
					'Resource key, for example customer or salesinvoice. Leave empty with Describe to list all resources.',
			},
			{
				displayName: 'Record ID',
				name: 'recordId',
				type: 'string',
				default: '',
				description: 'Code, DocKey or AutoKey of the record, for Get, Update and Delete. Describe shows which one a resource uses.',
			},
			{
				displayName: 'Filters (JSON)',
				name: 'filters',
				type: 'json',
				default: '{}',
				description:
					'Filters for List as a JSON object, for example {"code":"CUS*"}. Wildcards (*term*) and ranges (from~to) are supported.',
			},
			{
				displayName: 'Body (JSON)',
				name: 'body',
				type: 'json',
				default: '{}',
				description:
					'Fields to create or update, as a JSON object. For documents include a sdsdocdetail array of line items. Describe shows an example.',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Start position for List. The API returns up to 50 records per request.',
			},
			{
				displayName: 'Max Records',
				name: 'maxRecords',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1, maxValue: 50 },
				description: 'Maximum number of records to return from List',
			},
			{
				displayName: 'Allow Changes',
				name: 'allowChanges',
				type: 'boolean',
				noDataExpression: true,
				default: false,
				description:
					'Whether the AI may create, update or delete records. Leave off for read-only access. The AI cannot change this setting.',
			},
			{
				displayName: 'Return Errors to the AI',
				name: 'returnErrors',
				type: 'boolean',
				noDataExpression: true,
				default: true,
				description: 'Whether to return errors as data so the AI can correct itself, instead of failing the step',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		const creds = (await this.getCredentials('sqlAccountingApi')) as unknown as SqlCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				const rows = await runCall(this, i, creds);
				output.push(...rows.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.getNodeParameter('returnErrors', i, true) === true || this.continueOnFail()) {
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

function readInput(ctx: IExecuteFunctions, i: number): AiCallInput {
	return {
		resource: String(ctx.getNodeParameter('resourceName', i, '')),
		operation: String(ctx.getNodeParameter('operationName', i, 'describe')),
		recordId: ctx.getNodeParameter('recordId', i, ''),
		filters: ctx.getNodeParameter('filters', i, '{}'),
		body: ctx.getNodeParameter('body', i, '{}'),
		offset: Number(ctx.getNodeParameter('offset', i, 0)),
		limit: Number(ctx.getNodeParameter('maxRecords', i, 10)),
		allowChanges: ctx.getNodeParameter('allowChanges', i, false) === true,
	};
}

async function runCall(ctx: IExecuteFunctions, i: number, creds: SqlCredentials): Promise<IDataObject[]> {
	const call = prepareCall(readInput(ctx, i));

	if (call.kind === 'describe') {
		const def = call.resource ? findResource(call.resource) : undefined;
		return [def ? describeResource(def, new Date().toISOString().slice(0, 10)) : describeAll()];
	}

	const request = buildRequest(call.op, creds, call.pathParam, call.body, call.query);
	const response = await callProxy(ctx, creds.proxyBaseUrl, request);
	if (!call.op.isPaginated) return normalizeData(call.op, response.data, call.pathParam);

	const all = toArray(response.data) as IDataObject[];
	const rows = all.slice(0, call.limit);
	const offset = Number(call.query.offset ?? 0);
	if (response.pagination?.has_more || all.length > rows.length) {
		rows.push({ _note: `More records exist. Call List again with offset ${offset + call.limit}.` });
	}
	return rows;
}
