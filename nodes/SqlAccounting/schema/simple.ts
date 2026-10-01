import type { FieldDef, ResourceSchema } from './types';

export const str = (name: string, label: string, description: string, extra: Partial<FieldDef> = {}): FieldDef => ({
	name, label, type: 'string', description, ...extra,
});

/** Typed field helper (integer, number, decimal, date...). */
export const typed = (name: string, label: string, description: string, type: FieldDef['type'], extra: Partial<FieldDef> = {}): FieldDef => ({
	name, label, type, description, ...extra,
});

export const bool = (name: string, label: string, description: string, def = false): FieldDef => ({
	name, label, type: 'boolean', description, default: def,
});

export const lookup = (name: string, label: string, description: string, resource: string, valueField = 'code', extra: Partial<FieldDef> = {}): FieldDef => ({
	name, label, type: 'string', description, lookup: resource, lookupValue: valueField, ...extra,
});

export const codeField = (example: string): FieldDef =>
	str('code', 'Code', 'Unique identifier. Cannot be changed after creation.', { required: true, createOnly: true, example, filterable: true });

export const descriptionField = (example: string): FieldDef =>
	str('description', 'Description', 'Display name.', { required: true, example, filterable: true });

export function simpleSchema(resource: string, example: string, withActive = false): ResourceSchema {
	const fields = [codeField(example), descriptionField(example)];
	if (withActive) fields.push(bool('isactive', 'Active', 'Whether the record is active.', true));
	return { resource, fields };
}

export const SIMPLE_SCHEMAS: ResourceSchema[] = [
	simpleSchema('stockcategory', 'SC-01'),
	simpleSchema('companycategory', 'CC-01', true),
	simpleSchema('area', 'KL', true),
	simpleSchema('agent', 'AGT-01', true),
	simpleSchema('pricetag', 'PT-01'),
	simpleSchema('itemtemplate', 'ITM-01'),
	simpleSchema('tariff', 'TRF-01', true),
];
