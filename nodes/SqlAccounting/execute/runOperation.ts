import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { CONTRACT_VERSION, PAGE_SIZE, OperationDef } from '../registry';
import { DEFAULT_REGION, DEFAULT_SERVICE, MAX_PAGES_DEFAULT } from '../config';
import { ProxyCallError, ValidationError } from '../errors';
import { normalizeData, toArray } from '../normalize';
import { fetchAllPages } from '../pagination';
import { buildQuery, parsePathParam, pathParamLabel } from '../request';
import { callProxy } from '../transport';
import type { ProxyRequest } from '../contractTypes';
import { PATH_PARAM_NAME } from '../ui/names';
import { readBody } from './readBody';
import { readFilters } from './readFilters';

export interface SqlCredentials {
	platformApiKey: string;
	sqlAccessKey: string;
	sqlSecretKey: string;
	service: string;
	region: string;
	proxyBaseUrl: string;
}

function readPathParam(ctx: IExecuteFunctions, i: number, op: OperationDef): string | number | null {
	if (!op.pathParam) return null;
	const raw = ctx.getNodeParameter(PATH_PARAM_NAME[op.pathParam], i, '');
	return parsePathParam(op.pathParam, raw, pathParamLabel(op.pathParam));
}

export function buildRequest(
	op: OperationDef,
	creds: SqlCredentials,
	pathParam: string | number | null,
	body: Record<string, unknown> | null,
	query: Record<string, string | number | boolean>,
): ProxyRequest {
	return {
		contract_version: CONTRACT_VERSION,
		sql: {
			access_key: creds.sqlAccessKey,
			secret_key: creds.sqlSecretKey,
			region: creds.region || DEFAULT_REGION,
			service: creds.service || DEFAULT_SERVICE,
		},
		operation: op.key,
		path_param: pathParam,
		query,
		body,
	};
}

export async function runOperation(
	ctx: IExecuteFunctions,
	i: number,
	op: OperationDef,
	creds: SqlCredentials,
): Promise<IDataObject[]> {
	const pathParam = readPathParam(ctx, i, op);
	const body = op.writesBody ? readBody(ctx, i, op) : null;
	const send = (query: Record<string, string | number | boolean>) =>
		callProxy(ctx, creds.proxyBaseUrl, buildRequest(op, creds, pathParam, body, query));

	if (!op.isPaginated) {
		const res = await send({});
		return normalizeData(op, res.data, pathParam);
	}

	const filters = readFilters(ctx, i, op.resource);
	const startOffset = ctx.getNodeParameter('offset', i, 0) as number;

	if (ctx.getNodeParameter('returnAll', i, false) as boolean) {
		const maxPages = ctx.getNodeParameter('maxPages', i, MAX_PAGES_DEFAULT) as number;
		const rows = await fetchAllPages(
			async (offset) => {
				const res = await send(buildQuery(offset, filters));
				return { data: toArray(res.data), pagination: res.pagination };
			},
			{ startOffset, maxPages },
		);
		return rows as IDataObject[];
	}

	const res = await send(buildQuery(startOffset, filters));
	const limit = ctx.getNodeParameter('limit', i, PAGE_SIZE) as number;
	return toArray(res.data).slice(0, limit) as IDataObject[];
}

export function errorToJson(error: unknown): IDataObject {
	if (error instanceof ValidationError) {
		return { error: error.message, code: 'validation_failed', issues: error.issues };
	}
	if (error instanceof ProxyCallError) {
		return { error: error.message, code: error.proxyCode, field: error.field ?? null, details: error.description ?? null };
	}
	return { error: error instanceof Error ? error.message : String(error) };
}
