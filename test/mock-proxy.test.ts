import { startMockProxy, MockProxy } from './mock-proxy';

let proxy: MockProxy;
const call = (body: object, token = 'sqlnode_test') =>
	fetch(`${proxy.url}/functions/v1/sqlaccount`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }).then((r) => r.json() as Promise<any>);
const base = { contract_version: 1, sql: {}, path_param: null, query: {}, body: null };

beforeAll(async () => { proxy = await startMockProxy({ tables: { currency: Array.from({ length: 120 }, (_, i) => ({ code: `C${i}` })) } }); });
afterAll(() => proxy.close());

test('list paginates by 50 with has_more', async () => {
	const p1 = await call({ ...base, operation: 'currency.list', query: { offset: 0 } });
	expect(p1.data).toHaveLength(50);
	expect(p1.pagination.has_more).toBe(true);
	const p3 = await call({ ...base, operation: 'currency.list', query: { offset: 100 } });
	expect(p3.data).toHaveLength(20);
	expect(p3.pagination.has_more).toBe(false);
});
test('rejects bad token, unknown op, empty body, wrong path param', async () => {
	expect((await call({ ...base, operation: 'currency.list' }, 'x')).error.code).toBe('invalid_token');
	expect((await call({ ...base, operation: 'nope.list' })).error.code).toBe('unknown_operation');
	expect((await call({ ...base, operation: 'currency.create', body: {} })).error.code).toBe('validation_failed');
	expect((await call({ ...base, operation: 'tax.get', path_param: 'ST-6%' })).error.code).toBe('validation_failed');
});
test('pmmethod.create is unknown', async () => {
	expect((await call({ ...base, operation: 'pmmethod.create', body: { code: 'x' } })).error.code).toBe('unknown_operation');
});
