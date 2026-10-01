import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { CONTRACT_VERSION } from './registry';
import { DEFAULT_REGION, DEFAULT_SERVICE, LOOKUP_CACHE_MS, LOOKUP_MAX_PAGES } from './config';
import { fetchAllPages } from './pagination';
import { toArray } from './normalize';
import { callProxy } from './transport';
import { lookupPairs } from './schema';
import { lookupMethodName } from './ui/names';

type Row = Record<string, unknown>;
const cache = new Map<string, { at: number; rows: Row[] }>();

async function fetchRows(ctx: ILoadOptionsFunctions, resource: string): Promise<Row[]> {
	const creds = await ctx.getCredentials('sqlAccountingApi');
	const key = `${String(creds.proxyBaseUrl)}|${String(creds.sqlAccessKey)}|${resource}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < LOOKUP_CACHE_MS) return hit.rows;

	const rows = (await fetchAllPages(
		async (offset) => {
			const res = await callProxy(ctx, String(creds.proxyBaseUrl), {
				contract_version: CONTRACT_VERSION,
				sql: {
					access_key: String(creds.sqlAccessKey),
					secret_key: String(creds.sqlSecretKey),
					region: String(creds.region || DEFAULT_REGION),
					service: String(creds.service || DEFAULT_SERVICE),
				},
				operation: `${resource}.list`,
				path_param: null,
				query: { offset },
				body: null,
			});
			return { data: toArray(res.data), pagination: res.pagination };
		},
		{ startOffset: 0, maxPages: LOOKUP_MAX_PAGES },
	)) as Row[];
	cache.set(key, { at: Date.now(), rows });
	return rows;
}

export const toOption = (row: Row, valueField: string): INodePropertyOptions => {
	const label = String(row.description ?? row.companyname ?? row.name ?? '');
	const code = String(row.code ?? row[valueField] ?? '');
	return { name: label ? `${code} - ${label}` : code, value: String(row[valueField] ?? '') };
};

export const lookupMethods: Record<string, (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>> =
	Object.fromEntries(
		lookupPairs().map(({ resource, valueField }) => [
			lookupMethodName(resource, valueField),
			async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await fetchRows(this, resource);
				return rows
					.filter((r) => r[valueField] !== undefined && r[valueField] !== null)
					.map((r) => toOption(r, valueField));
			},
		]),
	);
