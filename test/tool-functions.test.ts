import { startMockProxy, MockProxy } from './mock-proxy';
import { fakeExecuteContext } from './helpers/fakeContext';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import type { SqlCredentials } from '../nodes/SqlAccounting/execute/runOperation';
import { ValidationError } from '../nodes/SqlAccounting/errors';
import {
	buildToolCall,
	getToolFunction,
	runToolFunction,
	TOOL_FUNCTIONS,
	DEFAULT_LIMIT,
	MAX_LIMIT,
} from '../nodes/SqlAccountingTool/functions';

let proxy: MockProxy;
const customers = Array.from({ length: 30 }, (_, i) => ({ code: `300-C${i}`, companyname: `Co ${i}` }));
beforeAll(async () => {
	proxy = await startMockProxy({
		tables: { customer: customers, supplier: [{ code: '400-S1', companyname: 'Sup 1' }], stockitem: [{ dockey: 7, code: 'STK-1', description: 'Widget' }] },
	});
});
afterAll(() => proxy.close());

const creds = (): SqlCredentials => ({
	platformApiKey: 'sqlnode_test', sqlAccessKey: 'ak', sqlSecretKey: 'sk',
	service: 'sqlaccount', region: 'ap-southeast-5', proxyBaseUrl: proxy.url,
});
const ctx = () => fakeExecuteContext({ params: [{}], proxyUrl: proxy.url }) as unknown as ISupplyDataFunctions;

describe('buildToolCall', () => {
	test('lists the five v1 functions, all read-only', () => {
		expect(TOOL_FUNCTIONS.map((f) => f.name)).toEqual([
			'searchCustomers', 'searchSuppliers', 'searchStockItems', 'getCustomer', 'getSupplier',
		]);
		for (const f of TOOL_FUNCTIONS) expect(f.operation).toMatch(/\.(list|get)$/);
	});

	test('search maps whitelisted filters and defaults limit to 10', () => {
		const call = buildToolCall('searchCustomers', { companyname: 'Test*' });
		expect(call).toEqual({
			operation: 'customer.list',
			code: null,
			filters: [{ field: 'companyname', value: 'Test*' }],
			limit: DEFAULT_LIMIT,
		});
	});

	test('search skips empty filter values', () => {
		const call = buildToolCall('searchStockItems', { code: '', description: 'Widget' });
		expect(call.filters).toEqual([{ field: 'description', value: 'Widget' }]);
	});

	test.each([
		[0, 1], [-5, 1], [1000, MAX_LIMIT], [12.7, 12], ['20', 20], ['abc', DEFAULT_LIMIT], [undefined, DEFAULT_LIMIT],
	])('limit %p is clamped to %p', (raw, expected) => {
		expect(buildToolCall('searchSuppliers', { limit: raw }).limit).toBe(expected);
	});

	test('unknown filter key is rejected', () => {
		expect(() => buildToolCall('searchCustomers', { creditlimit: '5' })).toThrow(ValidationError);
		expect(() => buildToolCall('searchCustomers', { creditlimit: '5' })).toThrow('creditlimit');
	});

	test('get requires a code', () => {
		expect(() => buildToolCall('getCustomer', {})).toThrow('code is required');
		expect(() => buildToolCall('getCustomer', { code: '  ' })).toThrow('code is required');
		expect(buildToolCall('getSupplier', { code: ' 400-S1 ' })).toMatchObject({ operation: 'supplier.get', code: '400-S1' });
	});

	test('unknown function name is rejected', () => {
		expect(() => getToolFunction('deleteCustomer')).toThrow(ValidationError);
	});
});

describe('runToolFunction', () => {
	test('search returns at most limit rows from one page and sends filters', async () => {
		const before = proxy.requests.length;
		const rows = (await runToolFunction(ctx(), creds(), 'searchCustomers', { code: '300*', limit: 5 })) as unknown[];
		expect(rows).toHaveLength(5);
		const sent = proxy.requests.slice(before) as { operation: string; query: Record<string, unknown> }[];
		expect(sent).toHaveLength(1);
		expect(sent[0].operation).toBe('customer.list');
		expect(sent[0].query).toEqual({ offset: 0, code: '300*' });
	});

	test('get returns the record as a one-item array', async () => {
		const rows = await runToolFunction(ctx(), creds(), 'getSupplier', { code: '400-S1' });
		expect(rows).toEqual([{ code: '400-S1', companyname: 'Sup 1' }]);
	});

	test('stock search exposes DocKey in rows', async () => {
		const rows = (await runToolFunction(ctx(), creds(), 'searchStockItems', {})) as { dockey: number }[];
		expect(rows[0].dockey).toBe(7);
	});

	test('validation problems come back as JSON, not thrown, and send no request', async () => {
		const before = proxy.requests.length;
		const out = await runToolFunction(ctx(), creds(), 'searchCustomers', { bogus: 'x' });
		expect(out).toMatchObject({ code: 'validation_failed' });
		expect(proxy.requests.length).toBe(before);
	});

	test('proxy errors come back as JSON with the proxy code', async () => {
		const out = await runToolFunction(ctx(), creds(), 'getCustomer', { code: 'NOPE' });
		expect(out).toMatchObject({ code: 'upstream_error' });
	});
});
