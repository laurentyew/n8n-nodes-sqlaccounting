import { startMockProxy } from '../test/mock-proxy';

startMockProxy(
	{
		tables: {
			currency: [{ code: 'MYR', description: 'Ringgit' }, { code: 'USD', description: 'US Dollar' }],
			account: [{ code: '300-000', description: 'TRADE DEBTORS', dockey: 18 }],
		},
	},
	8787,
).then((p) => console.error(`Mock proxy on ${p.url}  (token: sqlnode_test)`));
