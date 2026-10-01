import { callProxy } from '../nodes/SqlAccounting/transport';
import { ProxyCallError } from '../nodes/SqlAccounting/errors';
import type { ProxyRequest } from '../nodes/SqlAccounting/contractTypes';

const req: ProxyRequest = {
	contract_version: 1,
	sql: { access_key: 'a', secret_key: 's', region: 'r', service: 'sqlaccount' },
	operation: 'profile.get',
	path_param: null,
	query: {},
	body: null,
};

function ctxReturning(response: unknown) {
	const httpRequestWithAuthentication = jest.fn().mockResolvedValue(response);
	return {
		ctx: {
			helpers: { httpRequestWithAuthentication },
			getNode: () => ({ name: 'SQL Accounting', type: 'x', typeVersion: 1, position: [0, 0], parameters: {}, id: '1' }),
		},
		httpRequestWithAuthentication,
	};
}

test('posts to proxy path with ignoreHttpStatusErrors and returns success', async () => {
	const ok = { ok: true, data: [], meta: { request_id: 'r', upstream_status: 200, contract_version: 1 } };
	const { ctx, httpRequestWithAuthentication } = ctxReturning(ok);
	const res = await callProxy(ctx as never, 'https://p.example/', req);
	expect(res).toBe(ok);
	const [cred, options] = httpRequestWithAuthentication.mock.calls[0].slice(-2);
	expect(cred).toBe('sqlAccountingApi');
	expect(options.url).toBe('https://p.example/functions/v1/sqlaccount');
	expect(options.method).toBe('POST');
	expect(options.ignoreHttpStatusErrors).toBe(true);
	expect(options.body).toEqual(req);
});

test('proxy error envelope becomes ProxyCallError with code and field', async () => {
	const err = { ok: false, error: { code: 'validation_failed', message: 'bad', field: 'body.x' }, meta: { request_id: 'r1' } };
	const { ctx } = ctxReturning(err);
	await expect(callProxy(ctx as never, 'https://p.example', req)).rejects.toMatchObject({
		proxyCode: 'validation_failed',
		field: 'body.x',
	});
	await expect(callProxy(ctx as never, 'https://p.example', req)).rejects.toBeInstanceOf(ProxyCallError);
});

test('non-envelope response is rejected with a proxy-url hint', async () => {
	const { ctx } = ctxReturning('<html>oops</html>');
	await expect(callProxy(ctx as never, 'https://p.example', req)).rejects.toThrow('Unexpected response');
});
