import { ValidationError } from '../errors';
import type { FieldDef, ResourceSchema } from './types';

export function castValue(field: FieldDef, raw: unknown): string | number | boolean {
	const text = String(raw).trim();
	switch (field.type) {
		case 'integer': {
			const n = typeof raw === 'number' ? raw : Number(text);
			if (text === '' || !Number.isInteger(n)) throw new Error(`${field.label} must be a whole number`);
			return n;
		}
		case 'number': {
			const n = typeof raw === 'number' ? raw : Number(text);
			if (text === '' || !Number.isFinite(n)) throw new Error(`${field.label} must be a number`);
			return n;
		}
		case 'decimal': {
			if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`${field.label} must be a number`);
			return text;
		}
		case 'boolean': {
			if (typeof raw === 'boolean') return raw;
			if (text === 'true') return true;
			if (text === 'false') return false;
			throw new Error(`${field.label} must be true or false`);
		}
		case 'date': {
			const day = text.slice(0, 10);
			if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`${field.label} must be a date (YYYY-MM-DD)`);
			return day;
		}
		default:
			return typeof raw === 'number' ? raw : text;
	}
}

const isBlank = (v: unknown): boolean => v === undefined || v === null || v === '';

export function buildFieldsBody(
	schema: ResourceSchema,
	values: Record<string, unknown>,
	mode: 'create' | 'update',
	extra: Record<string, unknown> = {},
): Record<string, unknown> {
	const issues: string[] = [];
	const typed: Record<string, unknown> = {};

	for (const field of schema.fields) {
		if (mode === 'update' && field.createOnly) continue;
		const raw = values[field.name];
		if (isBlank(raw)) continue;
		try {
			typed[field.name] = castValue(field, raw);
		} catch (e) {
			issues.push(`${(e as Error).message}.`);
		}
	}

	const body: Record<string, unknown> = {
		...(mode === 'create' ? schema.createDefaults : {}),
		...extra,
		...typed,
	};

	if (mode === 'create') {
		for (const field of schema.fields) {
			if (field.required && isBlank(body[field.name]) && !issues.some((i) => i.startsWith(field.label))) {
				issues.push(`${field.label} is required.`);
			}
		}
	}
	if (issues.length === 0 && Object.keys(body).length === 0) {
		issues.push('Nothing to send: set at least one field.');
	}
	if (issues.length > 0) throw new ValidationError(issues);
	return body;
}

export function parseJsonObject(raw: unknown, label: string): Record<string, unknown> {
	if (raw === undefined || raw === null || raw === '') return {};
	let value: unknown = raw;
	if (typeof raw === 'string') {
		try {
			value = JSON.parse(raw);
		} catch {
			throw new ValidationError([`${label} is not valid JSON.`]);
		}
	}
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new ValidationError([`${label} must be a JSON object.`]);
	}
	return value as Record<string, unknown>;
}
