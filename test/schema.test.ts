import { SCHEMAS, getSchema, lookupPairs } from '../nodes/SqlAccounting/schema';
import { REGISTRY } from '../nodes/SqlAccounting/registry.generated';

const REQUIRED: Record<string, string[]> = {
	currency: ['code', 'description'],
	tax: ['code', 'description', 'taxtype'],
	terms: ['code', 'description'],
	stockcategory: ['code', 'description'],
	stockgroup: ['code', 'description'],
	companycategory: ['code', 'description'],
	location: ['code', 'description'],
	project: ['code', 'description'],
	area: ['code', 'description'],
	agent: ['code', 'description'],
	shipper: ['code', 'description'],
	pricetag: ['code', 'description'],
	account: ['parent', 'code', 'description', 'acctype'],
	tariff: ['code', 'description'],
	whtax: ['code', 'description', 'taxaccountdr', 'taxaccountcr'],
	customer: ['code', 'companyname'],
	supplier: ['code', 'companyname'],
	stockitem: ['code', 'description'],
	batch: ['code', 'description'],
	assetgroup: ['code', 'description', 'assetacc', 'accumdepracc', 'depracc'],
	assetitem: ['code', 'description', 'assetgroup', 'assetacc'],
	assetdisposal: ['asset', 'postdate'],
	itemtemplate: ['code', 'description'],
	memberpoint: ['code', 'description'],
};

test.each(Object.entries(REQUIRED))('%s required fields match the API doc', (resource, required) => {
	const schema = getSchema(resource)!;
	expect(schema).toBeDefined();
	const actual = schema.fields.filter((f) => f.required).map((f) => f.name).sort();
	expect(actual).toEqual([...required].sort());
});

test('every master resource in the registry has a schema', () => {
	for (const r of REGISTRY.filter((x) => x.kind === 'master' && x.ops.includes('create'))) {
		expect(SCHEMAS[r.resource]).toBeDefined();
	}
});

test('field types follow the doc', () => {
	const t = (r: string, n: string) => getSchema(r)!.fields.find((f) => f.name === n)!.type;
	expect(t('tax', 'taxtype')).toBe('integer');
	expect(t('tax', 'taxrate')).toBe('number');
	expect(t('currency', 'buyingrate')).toBe('decimal');
	expect(t('currency', 'color')).toBe('integer');
	expect(t('account', 'parent')).toBe('integer');
	expect(t('account', 'acctype')).toBe('enum');
	expect(t('stockgroup', 'costingmethod')).toBe('integer');
	expect(t('customer', 'creditlimit')).toBe('decimal');
	expect(t('assetitem', 'assetgroup')).toBe('integer');
	expect(t('project', 'projectvalue')).toBe('number');
});

test('account create defaults match the doc POST template', () => {
	expect(getSchema('account')!.createDefaults).toEqual({
		dockey: 0, description2: '', specialacctype: '  ', tax: '', cashflowtype: 0, sic: '',
	});
});

test('acctype and specialacctype enumerate documented values', () => {
	const opts = (n: string) => getSchema('account')!.fields.find((f) => f.name === n)!.options!.map((o) => o.value);
	expect(opts('acctype')).toEqual(['CP', 'CA', 'CL', 'FA', 'EP', 'CO', 'SA', 'OI', 'SL', 'RE', 'OA']);
	expect(opts('specialacctype')).toEqual(['  ', 'DC', 'CC', 'BA', 'CH', 'BS', 'AD']);
});

test('lookup fields point at real list resources', () => {
	for (const { resource } of lookupPairs()) {
		expect(REGISTRY.find((r) => r.resource === resource)?.ops).toContain('list');
	}
	expect(lookupPairs()).toContainEqual({ resource: 'account', valueField: 'dockey' });
	expect(lookupPairs()).toContainEqual({ resource: 'account', valueField: 'code' });
});

test('code fields are createOnly on code-keyed masters', () => {
	expect(getSchema('currency')!.fields.find((f) => f.name === 'code')!.createOnly).toBe(true);
});
