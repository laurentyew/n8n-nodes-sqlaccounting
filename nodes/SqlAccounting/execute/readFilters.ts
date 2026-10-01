import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { FilterInput } from '../request';
import { filtersParam } from '../ui/names';

const rows = (data: IDataObject): FilterInput[] => (data.filter as FilterInput[] | undefined) ?? [];

export function readFilters(ctx: IExecuteFunctions, i: number, resource: string): FilterInput[] {
	const typed = ctx.getNodeParameter(filtersParam(resource), i, {}) as IDataObject;
	const custom = ctx.getNodeParameter('customFilters', i, {}) as IDataObject;
	return [...rows(typed), ...rows(custom)];
}
