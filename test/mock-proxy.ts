import * as http from 'http';
import { REGISTRY, PAGE_SIZE } from '../nodes/SqlAccounting/registry.generated';

export interface MockProxyOptions {
	token?: string;
	subscription?: 'active' | 'inactive';
	tables?: Record<string, Record<string, unknown>[]>;
}
export interface MockProxy {
	url: string;
	close(): Promise<void>;
	requests: unknown[];
}

const send = (res: http.ServerResponse, status: number, body: unknown) => {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
};
const fail = (res: http.ServerResponse, status: number, code: string, message: string, extra: object = {}) =>
	send(res, status, { ok: false, error: { code, message, ...extra }, meta: { request_id: 'mock', contract_version: 1 } });

export async function startMockProxy(opts: MockProxyOptions = {}, port = 0): Promise<MockProxy> {
	const token = opts.token ?? 'sqlnode_test';
	const tables: Record<string, Record<string, unknown>[]> = { ...(opts.tables ?? {}) };
	const requests: unknown[] = [];

	const server = http.createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on('data', (c) => chunks.push(c));
		req.on('end', () => {
			if (req.headers.authorization !== `Bearer ${token}`) return fail(res, 401, 'invalid_token', 'bad token');
			if (opts.subscription === 'inactive') return fail(res, 402, 'subscription_inactive', 'inactive');
			const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
			requests.push(body);
			if (body.contract_version !== 1) return fail(res, 400, 'unsupported_version', 'version');
			const [resource, op] = String(body.operation).split('.');
			const entry = REGISTRY.find((r) => r.resource === resource);
			if (!entry || !entry.ops.includes(op as never)) return fail(res, 400, 'unknown_operation', String(body.operation));

			const needsParam = ['get', 'update', 'delete'].includes(op) && entry.pathParam !== null;
			if (needsParam) {
				const p = body.path_param;
				const okInt = entry.pathParam === 'CODE' || (Number.isInteger(Number(p)) && Number(p) > 0);
				if (p === null || p === undefined || p === '' || !okInt) {
					return fail(res, 422, 'validation_failed', 'bad path_param', { field: 'path_param' });
				}
			}
			if ((op === 'create' || op === 'update') && (!body.body || Object.keys(body.body).length === 0)) {
				return fail(res, 422, 'validation_failed', 'empty body', { field: 'body' });
			}

			const rows = (tables[resource] = tables[resource] ?? []);
			const meta = { request_id: 'mock', upstream_status: 200, contract_version: 1 };
			const key = String(body.path_param);
			const find = () => rows.find((r) => [r.code, r.dockey, r.autokey].map(String).includes(key));

			if (op === 'list' || entry.kind === 'report') {
				const offset = Number(body.query?.offset ?? 0);
				const data = rows.slice(offset, offset + PAGE_SIZE);
				return send(res, 200, { ok: true, data, pagination: { offset, limit: PAGE_SIZE, count: data.length, has_more: data.length === PAGE_SIZE }, meta });
			}
			if (op === 'get') {
				const row = find();
				return row ? send(res, 200, { ok: true, data: row, meta }) : fail(res, 502, 'upstream_error', 'not found', { upstream_status: 404 });
			}
			if (op === 'create') { rows.push(body.body); return send(res, 200, { ok: true, data: body.body, meta }); }
			if (op === 'update') {
				const row = find();
				if (!row) return fail(res, 502, 'upstream_error', 'not found', { upstream_status: 404 });
				Object.assign(row, body.body);
				return send(res, 200, { ok: true, data: row, meta });
			}
			const idx = rows.findIndex((r) => r === find());
			if (idx >= 0) rows.splice(idx, 1);
			return send(res, 200, { ok: true, data: { success: true }, meta });
		});
	});

	await new Promise<void>((resolve) => server.listen(port, resolve));
	const address = server.address() as { port: number };
	return {
		url: `http://localhost:${address.port}`,
		requests,
		close: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
}
