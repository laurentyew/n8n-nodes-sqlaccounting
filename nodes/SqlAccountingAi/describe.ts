import type { IDataObject } from 'n8n-workflow';
import { RESOURCE_DEFS, ResourceDef } from '../SqlAccounting/registry';
import { pathParamLabel } from '../SqlAccounting/request';
import { getSchema } from '../SqlAccounting/schema';
import type { FieldDef } from '../SqlAccounting/schema/types';
import { templateFor } from '../SqlAccounting/templates';

const compact = (text: string): string =>
	text.toLowerCase().replace(/\(unverified\)/g, '').replace(/[^a-z0-9]/g, '');

/** Accepts the resource key (salesinvoice) or its display name (Sales Invoice). */
export function findResource(raw: string): ResourceDef | undefined {
	const key = compact(raw);
	if (!key) return undefined;
	return RESOURCE_DEFS.find((r) => r.value === key || compact(r.name) === key);
}

export function suggestResources(raw: string, max = 5): string[] {
	const key = compact(raw);
	if (!key) return [];
	return RESOURCE_DEFS.filter(
		(r) => r.value.includes(key) || key.includes(r.value) || compact(r.name).includes(key),
	)
		.slice(0, max)
		.map((r) => r.value);
}

function idLabel(def: ResourceDef): string | null {
	const withId = def.operations.find((o) => o.pathParam !== null);
	return withId ? pathParamLabel(withId.pathParam) : null;
}

export function describeAll(): IDataObject {
	return {
		resources: RESOURCE_DEFS.map((r) => {
			const id = idLabel(r);
			const ops = r.operations.map((o) => o.op).join(', ');
			return `${r.value} | ${r.name} | ${r.kind} | operations: ${ops}${id ? ` | id: ${id}` : ''}`;
		}),
		hint: 'Call Describe again with a resource to see its fields and an example body.',
	};
}

function describeField(f: FieldDef): IDataObject {
	return {
		name: f.name,
		type: f.type === 'decimal' ? 'decimal (send as text, for example "10.50")' : f.type,
		required: f.required === true,
		description: f.description,
		...(f.options ? { allowed: f.options.map((o) => o.value) } : {}),
		...(f.example ? { example: f.example } : {}),
		...(f.lookup ? { refersTo: `${f.lookup} (${f.lookupValue ?? 'code'})` } : {}),
		...(f.createOnly ? { createOnly: true } : {}),
	};
}

export function describeResource(def: ResourceDef, today: string): IDataObject {
	const schema = getSchema(def.value);
	const id = idLabel(def);
	const out: IDataObject = {
		resource: def.value,
		name: def.name,
		kind: def.kind,
		operations: def.operations.map((o) => o.op),
		recordId:
			id === null
				? 'not used'
				: id === 'Code'
					? 'Code'
					: `${id} (SQL Account's internal numeric ID, not the code: find it with List and a filter)`,
	};
	if (schema) {
		out.fields = schema.fields.map(describeField);
		if (schema.lineFields) out.lineFields = schema.lineFields.map(describeField);
		if (schema.createDefaults) out.addedAutomaticallyOnCreate = schema.createDefaults;
	}
	if (def.kind === 'transactional' && def.operations.some((o) => o.op === 'create')) {
		out.exampleBody = JSON.parse(templateFor(def.value, today));
	}
	if (def.kind === 'report') out.note = 'Read-only report. Use List with filters.';
	return out;
}
