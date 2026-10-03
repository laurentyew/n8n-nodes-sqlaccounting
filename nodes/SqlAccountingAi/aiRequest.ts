import { ValidationError } from '../SqlAccounting/errors';
import { OperationDef, PAGE_SIZE } from '../SqlAccounting/registry';
import { buildQuery, FilterInput, parsePathParam, pathParamLabel } from '../SqlAccounting/request';
import { getSchema } from '../SqlAccounting/schema';
import { buildFieldsBody, castValue, parseJsonObject } from '../SqlAccounting/schema/cast';
import type { FieldDef, ResourceSchema } from '../SqlAccounting/schema/types';
import { assertValidDocument } from '../SqlAccounting/validation';
import { findResource, suggestResources } from './describe';

export interface AiCallInput {
	resource: string;
	operation: string;
	recordId: unknown;
	filters: unknown;
	body: unknown;
	offset: number;
	limit: number;
	allowChanges: boolean;
}

export type PreparedCall =
	| { kind: 'describe'; resource: string }
	| {
			kind: 'proxy';
			op: OperationDef;
			pathParam: string | number | null;
			query: Record<string, string | number>;
			body: Record<string, unknown> | null;
			limit: number;
	  };

type Attempt<T> = { ok: true; value: T } | { ok: false; message: string };

// Collects a thrown message as data so callers can raise a single ValidationError outside the catch.
function attempt<T>(fn: () => T): Attempt<T> {
	try {
		return { ok: true, value: fn() };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

const OPERATIONS = ['describe', 'list', 'get', 'create', 'update', 'delete'];
const WRITES = ['create', 'update', 'delete'];

function filtersFrom(raw: unknown): FilterInput[] {
	const object = parseJsonObject(raw, 'Filters');
	return Object.entries(object).map(([field, value]) => ({ field, value: String(value) }));
}

function castKnown(
	fields: FieldDef[],
	row: Record<string, unknown>,
	prefix: string,
	issues: string[],
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...row };
	for (const f of fields) {
		const raw = row[f.name];
		if (raw === undefined || raw === null || raw === '') continue;
		const result = attempt(() => castValue(f, raw));
		if (result.ok) out[f.name] = result.value;
		else issues.push(`${prefix}${result.message}.`);
	}
	return out;
}

function normalizeDocument(
	resource: string,
	schema: ResourceSchema | undefined,
	body: Record<string, unknown>,
	mode: 'create' | 'update',
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...(mode === 'create' ? schema?.createDefaults : {}), ...body };
	const issues: string[] = [];
	let result = schema ? castKnown(schema.fields, merged, '', issues) : merged;
	if (schema?.lineFields && Array.isArray(result.sdsdocdetail)) {
		const lineFields = schema.lineFields;
		result = {
			...result,
			sdsdocdetail: (result.sdsdocdetail as Record<string, unknown>[]).map((line, i) => ({
				dtlkey: 0,
				...castKnown(lineFields, line, `Line ${i + 1}: `, issues),
			})),
		};
	}
	if (issues.length > 0) throw new ValidationError(issues);
	assertValidDocument(resource, result, mode);
	return result;
}

function normalizeMaster(
	schema: ResourceSchema,
	body: Record<string, unknown>,
	mode: 'create' | 'update',
): Record<string, unknown> {
	const keep = (key: string): boolean =>
		mode === 'create' || !schema.fields.some((f) => f.name === key && f.createOnly);
	const extra = Object.fromEntries(Object.entries(body).filter(([key]) => keep(key)));
	return buildFieldsBody(schema, body, mode, extra);
}

function buildBody(
	op: OperationDef,
	body: Record<string, unknown>,
): Record<string, unknown> | null {
	if (!op.writesBody) return null;
	const mode = op.op === 'update' ? 'update' : 'create';
	const schema = getSchema(op.resource);
	if (op.kind === 'transactional') return normalizeDocument(op.resource, schema, body, mode);
	if (!schema) throw new ValidationError([`No field list is available for ${op.resource}.`]);
	return normalizeMaster(schema, body, mode);
}

export function prepareCall(input: AiCallInput): PreparedCall {
	const operation = input.operation.trim().toLowerCase();
	if (!OPERATIONS.includes(operation)) {
		throw new ValidationError([`Unknown operation "${input.operation}". Use one of: ${OPERATIONS.join(', ')}.`]);
	}
	const resourceText = input.resource.trim();

	if (operation === 'describe') {
		if (resourceText && !findResource(resourceText)) {
			throw new ValidationError([unknownResource(resourceText)]);
		}
		return { kind: 'describe', resource: resourceText };
	}
	if (!resourceText) {
		throw new ValidationError([
			'resource is required. Call the Describe operation with an empty resource to list the valid resources.',
		]);
	}
	const def = findResource(resourceText);
	if (!def) throw new ValidationError([unknownResource(resourceText)]);

	// Reports only have a "get" operation; accept "list" for them.
	const opName = def.kind === 'report' && operation === 'list' ? 'get' : operation;
	const op = def.operations.find((o) => o.op === opName);
	if (!op) {
		const available = def.operations.map((o) => o.op).join(', ');
		throw new ValidationError([`Operation "${operation}" is not available for ${def.value}. Available: ${available}.`]);
	}
	if (WRITES.includes(op.op) && !input.allowChanges) {
		throw new ValidationError([
			`Changes are disabled for this tool, so "${op.op}" is not allowed. Only the owner of the workflow can enable Allow Changes. Use Describe, List or Get instead.`,
		]);
	}

	const limit = Math.min(Math.max(1, Math.floor(input.limit) || 1), PAGE_SIZE);
	const idKind = op.pathParam;
	const pathParam = idKind
		? attempt(() => parsePathParam(idKind, input.recordId, pathParamLabel(idKind)))
		: ({ ok: true, value: null } as Attempt<null>);
	if (!pathParam.ok) throw new ValidationError([pathParam.message]);

	const query = op.isPaginated ? buildQuery(input.offset, filtersFrom(input.filters)) : {};
	const body = op.writesBody ? buildBody(op, parseJsonObject(input.body, 'Body')) : null;
	return { kind: 'proxy', op, pathParam: pathParam.value, query, body, limit };
}

function unknownResource(text: string): string {
	const suggestions = suggestResources(text);
	const hint = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
	return `Unknown resource "${text}".${hint} Call Describe with an empty resource to list all resources.`;
}
