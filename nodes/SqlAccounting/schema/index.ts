import type { ResourceSchema } from './types';
import { SIMPLE_SCHEMAS, bool, codeField, descriptionField, typed } from './simple';
import { FINANCE_SCHEMAS } from './finance';
import { PARTY_SCHEMAS } from './parties';
import { STOCK_SCHEMAS } from './stock';
import { ASSET_SCHEMAS } from './assets';
import { DOCUMENT_SCHEMAS } from './documents';

// The API reference lists ~20 member point fields but documents only these.
const MEMBERPOINT: ResourceSchema = {
	resource: 'memberpoint',
	fields: [
		codeField('MP-01'), descriptionField('Standard Points'),
		typed('pointrate', 'Point Rate', 'Point rate.', 'number'),
		typed('redeemrate', 'Redeem Rate', 'Redeem rate.', 'number'),
		typed('expiry', 'Expiry', 'YYYY-MM-DD.', 'date'),
		bool('isactive', 'Active', 'Whether active.', true),
	],
};

const ALL: ResourceSchema[] = [
	...SIMPLE_SCHEMAS, ...FINANCE_SCHEMAS, ...PARTY_SCHEMAS, ...STOCK_SCHEMAS, ...ASSET_SCHEMAS, MEMBERPOINT, ...DOCUMENT_SCHEMAS,
];

export const SCHEMAS: Record<string, ResourceSchema> = Object.fromEntries(ALL.map((s) => [s.resource, s]));

export function getSchema(resource: string): ResourceSchema | undefined {
	return SCHEMAS[resource];
}

export function lookupPairs(): { resource: string; valueField: string }[] {
	const seen = new Set<string>();
	const pairs: { resource: string; valueField: string }[] = [];
	for (const schema of Object.values(SCHEMAS)) {
		for (const field of [...schema.fields, ...(schema.lineFields ?? [])]) {
			if (!field.lookup) continue;
			const valueField = field.lookupValue ?? 'code';
			const key = `${field.lookup}:${valueField}`;
			if (!seen.has(key)) {
				seen.add(key);
				pairs.push({ resource: field.lookup, valueField });
			}
		}
	}
	return pairs;
}
