import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ValidationError } from '../errors';
import type { OperationDef } from '../registry';
import { buildFieldsBody, castValue, parseJsonObject } from '../schema/cast';
import { getSchema } from '../schema';
import type { FieldDef } from '../schema/types';
import { assertValidDocument } from '../validation';
import { additionalParam, extraJsonParam, fieldParam, linesParam, rawBodyParam, updateParam, useRawParam } from '../ui/names';

type Body = Record<string, unknown>;

function readLines(ctx: IExecuteFunctions, i: number, resource: string, fields: FieldDef[]): Body[] {
	const data = ctx.getNodeParameter(linesParam(resource), i, {}) as IDataObject;
	const raw = (data.line as IDataObject[] | undefined) ?? [];
	const issues: string[] = [];
	const lines = raw.map((line, idx) => {
		const out: Body = { dtlkey: 0 };
		for (const f of fields) {
			const v = line[f.name];
			if (v === undefined || v === null || v === '') {
				if (f.required) issues.push(`Line ${idx + 1}: ${f.label} is required.`);
				continue;
			}
			try {
				out[f.name] = castValue(f, v);
			} catch (e) {
				issues.push(`Line ${idx + 1}: ${(e as Error).message}.`);
			}
		}
		return out;
	});
	if (issues.length) throw new ValidationError(issues);
	return lines;
}

function readTypedValues(ctx: IExecuteFunctions, i: number, op: OperationDef, fields: FieldDef[]): Body {
	if (op.op === 'update') return ctx.getNodeParameter(updateParam(op.resource), i, {}) as Body;
	const values: Body = {};
	for (const f of fields.filter((x) => x.required)) {
		values[f.name] = ctx.getNodeParameter(fieldParam(op.resource, f.name), i, '');
	}
	return { ...values, ...(ctx.getNodeParameter(additionalParam(op.resource), i, {}) as Body) };
}

export function readBody(ctx: IExecuteFunctions, i: number, op: OperationDef): Body {
	const mode = op.op === 'update' ? 'update' : 'create';
	const schema = getSchema(op.resource);
	const useRaw =
		op.kind === 'transactional' &&
		(!schema || mode === 'update' || ctx.getNodeParameter(useRawParam(op.resource), i, false) === true);

	if (useRaw) {
		const raw = ctx.getNodeParameter(rawBodyParam(op.resource, mode), i, '{}');
		const body = parseJsonObject(raw, 'Request Body (JSON)');
		assertValidDocument(op.resource, body, mode);
		return body;
	}
	if (!schema) throw new ValidationError([`No field schema for ${op.resource}; use the JSON body.`]);

	const extra = parseJsonObject(ctx.getNodeParameter(extraJsonParam(op.resource), i, '{}'), 'Extra Fields (JSON)');
	const body = buildFieldsBody(schema, readTypedValues(ctx, i, op, schema.fields), mode, extra);
	if (op.kind === 'transactional') {
		if (schema.lineFields) body.sdsdocdetail = readLines(ctx, i, op.resource, schema.lineFields);
		assertValidDocument(op.resource, body, mode);
	}
	return body;
}
