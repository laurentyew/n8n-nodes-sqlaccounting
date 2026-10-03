import type { ISupplyDataFunctions } from 'n8n-workflow';
import { ValidationError } from '../SqlAccounting/errors';
import { buildRequest, errorToJson, SqlCredentials } from '../SqlAccounting/execute/runOperation';
import { toArray } from '../SqlAccounting/normalize';
import { getOperation } from '../SqlAccounting/registry';
import { buildQuery, FilterInput, parsePathParam, pathParamLabel } from '../SqlAccounting/request';
import { callProxy } from '../SqlAccounting/transport';

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

export interface ToolFunction {
	name: string;
	description: string;
	operation: string;
	kind: 'search' | 'get';
	filters: string[];
}

export interface ToolCall {
	operation: string;
	code: string | null;
	filters: FilterInput[];
	limit: number;
}

const WILDCARD_HINT = 'Use * as a wildcard, e.g. "Test*" matches names starting with Test.';

export const TOOL_FUNCTIONS: ToolFunction[] = [
	{
		name: 'searchCustomers',
		description: `Search SQL Accounting customers. Filter by code and/or companyname. ${WILDCARD_HINT} Returns up to limit records.`,
		operation: 'customer.list',
		kind: 'search',
		filters: ['code', 'companyname'],
	},
	{
		name: 'searchSuppliers',
		description: `Search SQL Accounting suppliers. Filter by code and/or companyname. ${WILDCARD_HINT} Returns up to limit records.`,
		operation: 'supplier.list',
		kind: 'search',
		filters: ['code', 'companyname'],
	},
	{
		name: 'searchStockItems',
		description: `Search SQL Accounting stock items. Filter by code and/or description. ${WILDCARD_HINT} Each record includes dockey, the numeric ID of the stock item.`,
		operation: 'stockitem.list',
		kind: 'search',
		filters: ['code', 'description'],
	},
	{
		name: 'getCustomer',
		description: 'Get one SQL Accounting customer by exact code. If the code is unknown, call searchCustomers first.',
		operation: 'customer.get',
		kind: 'get',
		filters: [],
	},
	{
		name: 'getSupplier',
		description: 'Get one SQL Accounting supplier by exact code. If the code is unknown, call searchSuppliers first.',
		operation: 'supplier.get',
		kind: 'get',
		filters: [],
	},
];

export function getToolFunction(name: string): ToolFunction {
	const fn = TOOL_FUNCTIONS.find((f) => f.name === name);
	if (!fn) throw new ValidationError([`Unknown function "${name}".`]);
	return fn;
}

function clampLimit(raw: unknown): number {
	const n = Math.floor(Number(raw));
	if (raw === undefined || raw === null || raw === '' || !Number.isFinite(n)) return DEFAULT_LIMIT;
	return Math.min(MAX_LIMIT, Math.max(1, n));
}

function allowedKeys(fn: ToolFunction): string[] {
	return fn.kind === 'get' ? ['code'] : [...fn.filters, 'limit'];
}

export function buildToolCall(name: string, input: Record<string, unknown>): ToolCall {
	const fn = getToolFunction(name);
	const allowed = allowedKeys(fn);
	const unknown = Object.keys(input).filter((k) => !allowed.includes(k));
	if (unknown.length > 0) {
		throw new ValidationError([`Unknown input: ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}.`]);
	}

	if (fn.kind === 'get') {
		const code = String(input.code ?? '').trim();
		if (!code) throw new ValidationError(['code is required.']);
		return { operation: fn.operation, code, filters: [], limit: 1 };
	}

	const filters = fn.filters
		.map((field) => ({ field, value: String(input[field] ?? '').trim() }))
		.filter((f) => f.value !== '');
	return { operation: fn.operation, code: null, filters, limit: clampLimit(input.limit) };
}

export async function runToolFunction(
	ctx: ISupplyDataFunctions,
	creds: SqlCredentials,
	name: string,
	input: Record<string, unknown>,
): Promise<unknown> {
	try {
		const call = buildToolCall(name, input);
		const op = getOperation(call.operation);
		const pathParam = op.pathParam ? parsePathParam(op.pathParam, call.code, pathParamLabel(op.pathParam)) : null;
		const query = op.isPaginated ? buildQuery(0, call.filters) : {};
		const res = await callProxy(ctx, creds.proxyBaseUrl, buildRequest(op, creds, pathParam, null, query));
		return toArray(res.data).slice(0, call.limit);
	} catch (error) {
		return errorToJson(error);
	}
}
