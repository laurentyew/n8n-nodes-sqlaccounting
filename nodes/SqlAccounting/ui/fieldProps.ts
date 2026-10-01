import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import type { FieldDef } from '../schema/types';
import { lookupMethodName } from './names';

const describe = (f: FieldDef): string => `${f.description}${f.example ? ` Example: ${f.example}.` : ''}`.trim();

/** Bare property (usable inside collections). Callers add name overrides, displayOptions and required. */
export function baseProperty(f: FieldDef): INodeProperties {
	const common = { displayName: f.label, name: f.name, description: describe(f) };
	if (f.lookup) {
		return {
			...common,
			type: 'options',
			default: '',
			typeOptions: { loadOptionsMethod: lookupMethodName(f.lookup, f.lookupValue ?? 'code') },
		};
	}
	switch (f.type) {
		case 'integer':
			return { ...common, type: 'number', default: (f.default as number) ?? 0, typeOptions: { numberPrecision: 0 } };
		case 'number':
			return { ...common, type: 'number', default: (f.default as number) ?? 0 };
		case 'boolean':
			return { ...common, type: 'boolean', default: (f.default as boolean) ?? false };
		case 'date':
			return { ...common, type: 'dateTime', default: '' };
		case 'enum': {
			const options = (f.options ?? []).map((o): INodePropertyOptions => ({ name: o.name, value: o.value }));
			return { ...common, type: 'options', options, default: f.default ?? options[0]?.value ?? '' };
		}
		default:
			return { ...common, type: 'string', default: (f.default as string) ?? '' };
	}
}
