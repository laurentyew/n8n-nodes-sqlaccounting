import { startMockProxy, MockProxy } from './mock-proxy';
import { fakeExecuteContext } from './helpers/fakeContext';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { SqlAccountingTool } from '../nodes/SqlAccountingTool/SqlAccountingTool.node';
import { TOOL_FUNCTIONS } from '../nodes/SqlAccountingTool/functions';

let proxy: MockProxy;
beforeAll(async () => {
	proxy = await startMockProxy({ tables: { customer: [{ code: '300-A', companyname: 'Alpha' }, { code: '300-B', companyname: 'Beta' }] } });
});
afterAll(() => proxy.close());

const supply = (fn: string) =>
	new SqlAccountingTool().supplyData.call(
		fakeExecuteContext({ params: [{ function: fn }], proxyUrl: proxy.url }) as unknown as ISupplyDataFunctions,
		0,
	);

test('description exposes an ai_tool output, no inputs, one option per function', () => {
	const d = new SqlAccountingTool().description;
	expect(d.outputs).toEqual(['ai_tool']);
	expect(d.inputs).toEqual([]);
	expect(d.credentials).toEqual([{ name: 'sqlAccountingApi', required: true }]);
	const fnProp = d.properties.find((p) => p.name === 'function');
	expect(fnProp?.options?.map((o) => (o as { value: string }).value)).toEqual(TOOL_FUNCTIONS.map((f) => f.name));
});

test('supplyData returns a tool named after the function, with its description', async () => {
	const { response } = await supply('searchCustomers');
	const tool = response as { name: string; description: string };
	expect(tool.name).toBe('searchCustomers');
	expect(tool.description).toContain('Search SQL Accounting customers');
});

test('tool invoke runs the search and returns JSON text', async () => {
	const { response } = await supply('searchCustomers');
	const text = await (response as { invoke(i: unknown): Promise<string> }).invoke({ companyname: 'A*', limit: 1 });
	expect(JSON.parse(text)).toEqual([{ code: '300-A', companyname: 'Alpha' }]);
});

test('tool invoke returns error JSON for bad input instead of throwing', async () => {
	const { response } = await supply('getCustomer');
	const text = await (response as { invoke(i: unknown): Promise<string> }).invoke({ code: 'MISSING' });
	expect(JSON.parse(text)).toMatchObject({ code: 'upstream_error' });
});

test('get tool schema rejects missing code before running', async () => {
	const { response } = await supply('getCustomer');
	await expect((response as { invoke(i: unknown): Promise<string> }).invoke({})).rejects.toThrow();
});
