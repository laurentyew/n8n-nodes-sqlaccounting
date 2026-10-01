import { startMockProxy, MockProxy } from './mock-proxy';
import { fakeLoadOptionsContext } from './helpers/fakeContext';
import { lookupMethods, toOption } from '../nodes/SqlAccounting/lookups';

let proxy: MockProxy;
beforeAll(async () => {
	proxy = await startMockProxy({ tables: { account: [{ code: '300-000', description: 'DEBTORS', dockey: 18 }] } });
});
afterAll(() => proxy.close());

test('account lookup by code and by dockey', async () => {
	const ctx = fakeLoadOptionsContext({ params: {}, proxyUrl: proxy.url });
	expect(await lookupMethods.lookup_account_code.call(ctx)).toEqual([{ name: '300-000 - DEBTORS', value: '300-000' }]);
	expect(await lookupMethods.lookup_account_dockey.call(ctx)).toEqual([{ name: '300-000 - DEBTORS', value: '18' }]);
});

test('toOption falls back to companyname and code only', () => {
	expect(toOption({ code: 'C1', companyname: 'Acme' }, 'code').name).toBe('C1 - Acme');
	expect(toOption({ code: 'C1' }, 'code').name).toBe('C1');
});
