import type { IDataObject } from 'n8n-workflow';
import type { OperationDef } from './registry';

export function toArray(data: unknown): unknown[] {
	if (Array.isArray(data)) return data;
	if (data !== null && typeof data === 'object') return [data];
	return [];
}

export function normalizeData(
	op: OperationDef,
	data: unknown,
	pathParam: string | number | null,
): IDataObject[] {
	if (op.op === 'delete') {
		return [{ success: true, resource: op.resource, deleted: pathParam }];
	}
	return toArray(data) as IDataObject[];
}
