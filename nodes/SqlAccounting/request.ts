import type { PathParamType } from './registry.generated';

export interface FilterInput {
	field?: string;
	value?: string;
}

const RESERVED_QUERY_KEYS = new Set(['offset']);

export function buildQuery(offset: number, filters: FilterInput[]): Record<string, string | number> {
	if (!Number.isInteger(offset) || offset < 0) {
		throw new Error('Offset must be a non-negative whole number.');
	}
	const query: Record<string, string | number> = { offset };
	for (const filter of filters) {
		const name = filter.field?.trim();
		const value = filter.value;
		if (!name || value === undefined || value === '') continue;
		if (RESERVED_QUERY_KEYS.has(name.toLowerCase())) continue;
		query[name] = value;
	}
	return query;
}

export function pathParamLabel(kind: PathParamType): string {
	if (kind === 'CODE') return 'Code';
	if (kind === 'DOCKEY') return 'DocKey';
	if (kind === 'AUTOKEY') return 'AutoKey';
	return 'Record ID';
}

export function parsePathParam(kind: PathParamType, raw: unknown, label: string): string | number {
	const text = String(raw ?? '').trim();
	if (!text) throw new Error(`${label} is required.`);
	if (kind === 'CODE') return text;
	if (!/^[1-9]\d*$/.test(text)) {
		throw new Error(
			`${label} must be a positive whole number (it is SQL Account's internal numeric ID, not the document/record code). Use the List operation with a filter to find it.`,
		);
	}
	return Number(text);
}
