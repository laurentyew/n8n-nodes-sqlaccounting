import { startMockProxy, MockProxy } from './mock-proxy';
import { fakeExecuteContext } from './helpers/fakeContext';
import { SqlAccountingAi } from '../nodes/SqlAccountingAi/SqlAccountingAi.node';

let proxy: MockProxy;
beforeAll(async () => {
	proxy = await startMockProxy({
		tables: { currency: Array.from({ length: 30 }, (_, i) => ({ code: `C${i}`, description: `d${i}` })) },
	});
});
afterAll(() => proxy.close());

const run = (params: Record<string, unknown>) =>
	new SqlAccountingAi().execute.call(fakeExecuteContext({ params: [params], proxyUrl: proxy.url }));
const rows = async (params: Record<string, unknown>) => (await run(params))[0].map((i) => i.json);

test('describe needs no request and lists resources', async () => {
	const before = proxy.requests.length;
	const [first] = await rows({ operationName: 'describe', resourceName: '' });
	expect((first.resources as string[]).length).toBe(81);
	expect(proxy.requests.length).toBe(before);
});

test('describe of one resource returns its fields', async () => {
	const [first] = await rows({ operationName: 'describe', resourceName: 'currency' });
	expect(first.resource).toBe('currency');
	expect(first.fields).toBeDefined();
});

test('list honours maxRecords and points at the next offset', async () => {
	const result = await rows({ operationName: 'list', resourceName: 'currency', maxRecords: 5 });
	expect(result.filter((r) => r.code)).toHaveLength(5);
	expect(String(result.at(-1)?._note)).toContain('offset 5');
});

test('list sends filters and offset to the proxy', async () => {
	await rows({ operationName: 'list', resourceName: 'currency', filters: '{"code":"C1*"}', offset: 10, maxRecords: 3 });
	const last = proxy.requests.at(-1) as { operation: string; query: Record<string, unknown> };
	expect(last.operation).toBe('currency.list');
	expect(last.query).toEqual({ offset: 10, code: 'C1*' });
});

test('get returns the record; delete is blocked without Allow Changes (and no request is made)', async () => {
	const [rec] = await rows({ operationName: 'get', resourceName: 'currency', recordId: 'C3' });
	expect(rec).toMatchObject({ code: 'C3' });
	const before = proxy.requests.length;
	const [err] = await rows({ operationName: 'delete', resourceName: 'currency', recordId: 'C3' });
	expect(err).toMatchObject({ code: 'validation_failed' });
	expect(JSON.stringify(err)).toContain('Changes are disabled');
	expect(proxy.requests.length).toBe(before);
});

test('create works when Allow Changes is on, with typed body', async () => {
	await rows({ operationName: 'create', resourceName: 'currency', allowChanges: true, body: '{"code":"SGD","description":"Singapore","buyingrate":3.2}' });
	const last = proxy.requests.at(-1) as { operation: string; body: Record<string, unknown> };
	expect(last.operation).toBe('currency.create');
	expect(last.body).toEqual({ code: 'SGD', description: 'Singapore', buyingrate: '3.2' });
});

test('errors come back as data so the AI can correct itself', async () => {
	const [err] = await rows({ operationName: 'list', resourceName: 'nonsense' });
	expect(err).toMatchObject({ code: 'validation_failed' });
	expect(JSON.stringify(err)).toContain('Unknown resource');
});

test('with Return Errors off the step fails', async () => {
	await expect(run({ operationName: 'list', resourceName: 'nonsense', returnErrors: false })).rejects.toThrow('Some inputs are invalid');
});

test('proxy errors keep their code and details', async () => {
	const bad = await startMockProxy({ subscription: 'inactive' });
	const out = await new SqlAccountingAi().execute.call(fakeExecuteContext({ params: [{ operationName: 'list', resourceName: 'currency' }], proxyUrl: bad.url }));
	expect(out[0][0].json).toMatchObject({ code: 'subscription_inactive' });
	await bad.close();
});

test('Allow Changes and Return Errors cannot be set by the AI (no expressions)', () => {
	const props = new SqlAccountingAi().description.properties;
	for (const name of ['allowChanges', 'returnErrors']) {
		expect(props.find((p) => p.name === name)?.noDataExpression).toBe(true);
	}
});
