import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	RESOURCES,
	OPERATION_MAP,
	OPS_WITH_PATH_PARAM,
	OPS_LIST,
	OPS_GET_NO_PARAM,
	OPS_RAW_JSON,
	OPS_GUIDED,
} from './operations';

// ── Update this if your Supabase project changes ──────────────────────────────
const EDGE_FUNCTION_URL =
	'https://cqcxkvptxgslpneeobhv.supabase.co/functions/v1/sqlaccount';

export class SqlAccounting implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SQL Accounting',
		name: 'sqlAccounting',
		icon: 'file:sqlaccounting.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description:
			'Interact with the SQL Accounting REST API via the SQL Accounting n8n Node platform.',
		defaults: { name: 'SQL Accounting' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sqlAccountingApi',
				required: true,
			},
		],
		properties: [
			// ── Resource dropdown ────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: RESOURCES.map((r) => ({
					name: r.name,
					value: r.value,
				})),
				default: 'profile',
				required: true,
			},

			// ── Operation dropdown — one per resource ────────────────────────────
			...RESOURCES.map((resource) => ({
				displayName: 'Operation',
				name: 'operation',
				type: 'options' as const,
				noDataExpression: true,
				displayOptions: { show: { resource: [resource.value] } },
				options: resource.operations.map((op) => ({
					name: op.name,
					value: op.key,
					description: op.description,
					action: op.description,
				})),
				default: resource.operations[0]?.key ?? '',
			})),

			// ── Record ID — shown for Get / Update / Delete ──────────────────────
			{
				displayName: 'Record ID',
				name: 'pathParam',
				type: 'string',
				default: '',
				required: true,
				description: 'The CODE, DocKey, or AutoKey of the record to get, update, or delete',
				displayOptions: { show: { operation: OPS_WITH_PATH_PARAM } },
			},

			// ── Offset — shown for List operations ───────────────────────────────
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description:
					'Pagination offset. Each page returns up to 100 records. Increment by 100 for the next page.',
				displayOptions: { show: { operation: OPS_GET_NO_PARAM } },
			},

			// ── Return All — shown for List (not reports) ────────────────────────
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { operation: OPS_LIST } },
			},

			// ── Filters — optional query params for List operations ──────────────
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Filter',
				description:
					'Optional query filters. See the SQL Accounting API docs for available filter fields per resource.',
				displayOptions: { show: { operation: OPS_GET_NO_PARAM } },
				options: [
					{
						name: 'filter',
						displayName: 'Filter',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								placeholder: 'e.g. code, description, isactive',
								description: 'The filter field name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The filter value',
							},
						],
					},
				],
			},

			// ── Raw JSON Body — shown for transactional Create / Update ──────────
			{
				displayName: 'Request Body (JSON)',
				name: 'rawBody',
				type: 'json',
				default: '{}',
				required: true,
				description:
					'Full JSON body for this document. Include the sdsdocdetail array for line items. See the README for schema examples per document type.',
				displayOptions: { show: { operation: OPS_RAW_JSON } },
			},

			// ── Guided Fields — shown for master data Create / Update ────────────
			{
				displayName: 'Fields',
				name: 'guidedFields',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Field',
				description:
					'Fields to set on this record. See the SQL Accounting API docs for available fields per resource.',
				displayOptions: { show: { operation: OPS_GUIDED } },
				options: [
					{
						name: 'field',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. code, description, isactive',
								description: 'The field name as defined in the SQL Accounting API',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set for this field',
							},
						],
					},
				],
			},
		],
	};

	// ── execute() ─────────────────────────────────────────────────────────────
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials (used only to build the request body — auth header is
		// injected automatically by httpRequestWithAuthentication via authenticate{})
		const credentials = await this.getCredentials('sqlAccountingApi');
		const sqlAccessKey = credentials.sqlAccessKey as string;
		const sqlSecretKey = credentials.sqlSecretKey as string;
		const service = (credentials.service as string) || 'sqlaccount';
		const region = (credentials.region as string) || 'ap-southeast-5';

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operationKey = this.getNodeParameter('operation', i) as string;
				const opDef = OPERATION_MAP[operationKey];

				if (!opDef) {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown operation: ${operationKey}`,
						{ itemIndex: i },
					);
				}

				// ── Build path (inject path param for Get/Update/Delete) ─────────
				let resolvedPath = opDef.path;
				if (opDef.pathParam !== null) {
					const paramValue = this.getNodeParameter('pathParam', i) as string;
					if (!paramValue?.trim()) {
						throw new NodeOperationError(
							this.getNode(),
							`Record ID is required for the ${opDef.name} operation.`,
							{ itemIndex: i },
						);
					}
					resolvedPath = `${opDef.path}/${encodeURIComponent(paramValue.trim())}`;
				}

				// ── Build query string (List / Report operations) ────────────────
				let queryString = '';
				if (opDef.pathParam === null && opDef.method === 'GET') {
					const queryParts: string[] = [];
					const offset = this.getNodeParameter('offset', i, 0) as number;
					queryParts.push(`offset=${offset}`);

					const filtersData = this.getNodeParameter('filters', i, {}) as IDataObject;
					const filterItems = (filtersData.filter as IDataObject[]) ?? [];
					for (const f of filterItems) {
						const fieldName = (f.field as string | undefined)?.trim();
						const fieldValue = f.value as string | undefined;
						if (fieldName && fieldValue !== undefined && fieldValue !== '') {
							queryParts.push(
								`${encodeURIComponent(fieldName)}=${encodeURIComponent(fieldValue)}`,
							);
						}
					}
					queryString = queryParts.join('&');
				}

				// ── Build request body ───────────────────────────────────────────
				let bodyString = '';
				if (opDef.bodyMode === 'raw_json') {
					const rawBody = this.getNodeParameter('rawBody', i) as
						| string
						| IDataObject;
					bodyString =
						typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
				} else if (opDef.bodyMode === 'guided') {
					const guidedData = this.getNodeParameter(
						'guidedFields',
						i,
						{},
					) as IDataObject;
					const fieldItems = (guidedData.field as IDataObject[]) ?? [];
					const bodyObj: IDataObject = {};
					for (const f of fieldItems) {
						if (f.name) bodyObj[f.name as string] = f.value;
					}
					bodyString = JSON.stringify(bodyObj);
				}

				// ── Handle Return All (auto-paginate) ────────────────────────────
				const isListOp =
					opDef.pathParam === null &&
					opDef.method === 'GET' &&
					opDef.docType !== 'report';

				const returnAll = isListOp
					? (this.getNodeParameter('returnAll', i, false) as boolean)
					: false;

				if (returnAll) {
					const allResults: IDataObject[] = [];
					let currentOffset = 0;
					let hasMore = true;

					while (hasMore) {
						const pageQuery = queryString
							? queryString.replace(/offset=\d+/, `offset=${currentOffset}`)
							: `offset=${currentOffset}`;

						const pageResult = await callEdge(
							this,
							sqlAccessKey,
							sqlSecretKey,
							service,
							region,
							operationKey,
							opDef.method,
							resolvedPath,
							pageQuery,
							'',
						);

						const pageData = Array.isArray(pageResult)
							? pageResult
							: [pageResult];

						if (pageData.length === 0) {
							hasMore = false;
						} else {
							allResults.push(...pageData);
							currentOffset += 100;
							// Safety cap — prevent infinite loops on bad responses
							if (currentOffset > 100000) hasMore = false;
						}
					}

					for (const record of allResults) {
						returnData.push({
							json: record as IDataObject,
							pairedItem: { item: i },
						});
					}
				} else {
					// ── Single call ────────────────────────────────────────────
					const result = await callEdge(
						this,
						sqlAccessKey,
						sqlSecretKey,
						service,
						region,
						operationKey,
						opDef.method,
						resolvedPath,
						queryString,
						bodyString,
					);

					if (Array.isArray(result)) {
						for (const record of result) {
							returnData.push({
								json: record as IDataObject,
								pairedItem: { item: i },
							});
						}
					} else {
						returnData.push({
							json: result as IDataObject,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				// continueOnFail support — required by n8n linter
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function caller
//
// Uses this.helpers.httpRequestWithAuthentication() — the n8n-approved method
// that satisfies the no-http-request-with-manual-auth linter rule.
// The Authorization: Bearer <platformApiKey> header is injected automatically
// from the credential's authenticate{} property. We never touch it here.
// ─────────────────────────────────────────────────────────────────────────────
async function callEdge(
	ctx: IExecuteFunctions,
	accessKey: string,
	secretKey: string,
	service: string,
	region: string,
	operation: string,
	method: string,
	path: string,
	query: string,
	body: string,
): Promise<IDataObject | IDataObject[]> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: EDGE_FUNCTION_URL,
		headers: {
			'Content-Type': 'application/json',
		},
		body: {
			access_key: accessKey,
			secret_key: secretKey,
			service,
			region,
			operation,
			method,
			path,
			query,
			body,
		},
		json: true,
	};

	let response: IDataObject;
	try {
		// httpRequestWithAuthentication auto-injects the Bearer token from
		// the credential's authenticate{} definition — no manual header needed.
		response = (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			'sqlAccountingApi',
			options,
		)) as IDataObject;
	} catch (error) {
		// Parse n8n's wrapped HTTP error to give the user a clear message
		const msg = (error as Error).message ?? '';
		if (msg.includes('401') || msg.includes('invalid_api_key')) {
			throw new NodeOperationError(ctx.getNode(),'Authentication failed. Check your Platform API Key in the credential.',
);
		}
		if (msg.includes('402') || msg.includes('insufficient_credits')) {
			throw new NodeOperationError(ctx.getNode(),'Insufficient credits. Top up your balance at the portal before retrying.',
);
		}
		throw error;
	}

	return response;
}
