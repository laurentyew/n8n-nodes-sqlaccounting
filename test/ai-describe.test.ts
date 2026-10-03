import { describeAll, describeResource, findResource, suggestResources } from '../nodes/SqlAccountingAi/describe';

const resource = (key: string) => findResource(key)!;

test('describeAll lists every resource compactly', () => {
	const { resources } = describeAll() as { resources: string[] };
	expect(resources).toHaveLength(81);
	expect(resources).toContain('currency | Currency | master | operations: list, get, create, update, delete | id: Code');
	expect(resources.find((r) => r.startsWith('tax |'))).toContain('id: AutoKey');
	expect(resources.find((r) => r.startsWith('profile |'))).toContain('operations: get');
});

test('findResource accepts key, display name and odd spacing', () => {
	expect(findResource('salesinvoice')?.value).toBe('salesinvoice');
	expect(findResource('Sales Invoice')?.value).toBe('salesinvoice');
	expect(findResource(' sales_invoice ')?.value).toBe('salesinvoice');
	expect(findResource('nonsense')).toBeUndefined();
	expect(findResource('')).toBeUndefined();
});

test('suggestResources is helpful and bounded', () => {
	expect(suggestResources('invoice')).toEqual(expect.arrayContaining(['salesinvoice', 'purchaseinvoice']));
	expect(suggestResources('invoice').length).toBeLessThanOrEqual(5);
	expect(suggestResources('')).toEqual([]);
});

test('describing master data shows typed fields with required flags', () => {
	const d = describeResource(resource('tax'), '2026-09-30') as { fields: { name: string; required: boolean; type: string }[]; recordId: string };
	expect(d.fields.find((f) => f.name === 'taxtype')).toMatchObject({ required: true, type: 'integer' });
	expect(d.recordId).toContain('AutoKey');
	expect(d.recordId).toContain('not the code');
});

test('describing a document includes line fields and an example body', () => {
	const d = describeResource(resource('salesinvoice'), '2026-09-30') as { lineFields: { name: string }[]; exampleBody: { docdate: string; sdsdocdetail: unknown[] } };
	expect(d.lineFields.map((f) => f.name)).toEqual(expect.arrayContaining(['itemcode', 'qty', 'unitprice']));
	expect(d.exampleBody.docdate).toBe('2026-09-30');
	expect(d.exampleBody.sdsdocdetail).toHaveLength(1);
});

test('enum fields list their allowed values; decimals say they are sent as text', () => {
	const d = describeResource(resource('account'), '2026-09-30') as { fields: { name: string; allowed?: string[]; type: string }[] };
	expect(d.fields.find((f) => f.name === 'acctype')?.allowed).toContain('CA');
	const cur = describeResource(resource('currency'), '2026-09-30') as { fields: { name: string; type: string }[] };
	expect(cur.fields.find((f) => f.name === 'buyingrate')?.type).toContain('as text');
});

test('reports and raw-only documents are described without fields', () => {
	expect(describeResource(resource('stockcard'), '2026-09-30')).toMatchObject({ kind: 'report', note: expect.stringContaining('Read-only') });
	const raw = describeResource(resource('paymentvoucher'), '2026-09-30') as { fields?: unknown; exampleBody: unknown };
	expect(raw.fields).toBeUndefined();
	expect(raw.exampleBody).toBeDefined();
});
