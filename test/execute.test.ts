import { startMockProxy, MockProxy } from './mock-proxy';
import { fakeExecuteContext } from './helpers/fakeContext';
import { SqlAccounting } from '../nodes/SqlAccounting/SqlAccounting.node';

let proxy: MockProxy;
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ code: `C${i}`, description: `d${i}` }));
beforeAll(async () => {
	proxy = await startMockProxy({ tables: { currency: rows(120), tax: [{ autokey: 5, code: 'ST' }] } });
});
afterAll(() => proxy.close());

const run = (params: Record<string, unknown>[], extra: { continueOnFail?: boolean } = {}) =>
	new SqlAccounting().execute.call(fakeExecuteContext({ params, proxyUrl: proxy.url, ...extra }));

test('Return All fetches all 120 rows in 3 pages (offsets 0,50,100)', async () => {
	const before = proxy.requests.length;
	const [out] = await run([{ operation: 'currency.list', returnAll: true }]);
	expect(out).toHaveLength(120);
	const offsets = (proxy.requests.slice(before) as { query: { offset: number } }[]).map((r) => r.query.offset);
	expect(offsets).toEqual([0, 50, 100]);
});

test('single page honours limit', async () => {
	const [out] = await run([{ operation: 'currency.list', returnAll: false, limit: 10 }]);
	expect(out).toHaveLength(10);
});

test('create sends typed body (integers as numbers) with real JSON types', async () => {
	await run([{ operation: 'tax.create', tax__code: 'X', tax__description: 'Y', tax__taxtype: 0, tax__additional: { taxrate: '6', isactive: true } }]);
	const last = proxy.requests.at(-1) as { operation: string; body: Record<string, unknown> };
	expect(last.operation).toBe('tax.create');
	expect(last.body).toEqual({ code: 'X', description: 'Y', taxtype: 0, taxrate: 6, isactive: true });
});

test('AUTOKEY path param must be an integer (client-side)', async () => {
	await expect(run([{ operation: 'tax.get', pathParamAutokey: 'ST-6%' }])).rejects.toThrow('AutoKey must be a positive whole number');
});

test('delete returns a success item', async () => {
	const [out] = await run([{ operation: 'tax.delete', pathParamAutokey: 5 }]);
	expect(out[0].json).toMatchObject({ success: true, deleted: 5 });
});

test('empty update is rejected before any request', async () => {
	const before = proxy.requests.length;
	await expect(run([{ operation: 'currency.update', pathParamCode: 'C1', currency__update: {} }])).rejects.toThrow('Some inputs are invalid');
	expect(proxy.requests.length).toBe(before);
});

test('sales invoice raw {} is blocked; journal imbalance is blocked', async () => {
	await expect(run([{ operation: 'salesinvoice.create', salesinvoice__useRaw: true, salesinvoice__rawBody: '{}' }])).rejects.toThrow();
	await expect(
		run([{ operation: 'journalentry.create', journalentry__useRaw: true, journalentry__rawBody: JSON.stringify({ sdsdocdetail: [{ code: 'a', dr: '5', cr: '0' }] }) }]),
	).rejects.toThrow();
});

test('typed sales quotation with line items sends dtlkey and cast lines', async () => {
	await run([{
		operation: 'salesquotation.create',
		salesquotation__code: 'CUS-01',
		salesquotation__docdate: '2026-09-30T00:00:00.000Z',
		salesquotation__lines: { line: [{ itemcode: 'STK-1', qty: '2', unitprice: '10.50' }] },
	}]);
	const last = proxy.requests.at(-1) as { body: Record<string, unknown> };
	expect(last.body).toEqual({
		dockey: 0, docno: '', code: 'CUS-01', docdate: '2026-09-30',
		sdsdocdetail: [{ dtlkey: 0, itemcode: 'STK-1', qty: '2', unitprice: '10.50' }],
	});
});

test('typed document without lines reports the missing line', async () => {
	await expect(run([{ operation: 'salesquotation.create', salesquotation__code: 'CUS-01', salesquotation__docdate: '2026-09-30' }])).rejects.toThrow('Some inputs are invalid');
});

test('continueOnFail returns code and issues', async () => {
	const [out] = await run([{ operation: 'currency.update', pathParamCode: 'C1', currency__update: {} }], { continueOnFail: true });
	expect(out[0].json).toMatchObject({ code: 'validation_failed' });
});

test('proxy errors surface as code-based messages', async () => {
	const bad = await startMockProxy({ subscription: 'inactive' });
	await expect(
		new SqlAccounting().execute.call(fakeExecuteContext({ params: [{ operation: 'currency.list' }], proxyUrl: bad.url })),
	).rejects.toThrow('subscription is not active');
	await bad.close();
});
