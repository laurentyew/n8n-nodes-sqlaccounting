import { buildProperties } from '../nodes/SqlAccounting/ui/properties';
import { fieldParam, linesParam, rawBodyParam, additionalParam, useRawParam } from '../nodes/SqlAccounting/ui/names';

const props = buildProperties();
const find = (name: string) => props.filter((p) => p.name === name);
const ops = (p: { displayOptions?: { show?: Record<string, unknown[]> } }) => p.displayOptions?.show?.operation;

test('generated parameter names are unique', () => {
	const gen = props.filter((p) => p.name.includes('__'));
	const names = gen.map((p) => p.name);
	expect(new Set(names).size).toBe(names.length);
});

test('currency create shows code and description as required inputs scoped to currency.create', () => {
	const code = find(fieldParam('currency', 'code'))[0];
	expect(code.required).toBe(true);
	expect(ops(code)).toEqual(['currency.create']);
	expect(find(fieldParam('currency', 'buyingrate'))).toHaveLength(0);
	expect(JSON.stringify(find(additionalParam('currency'))[0].options)).toContain('buyingrate');
});

test('account type is a dropdown of the documented values', () => {
	const p = find(fieldParam('account', 'acctype'))[0];
	expect(p.type).toBe('options');
	expect((p.options as { value: string }[]).map((o) => o.value)).toContain('CA');
});

test('lookup fields use loadOptionsMethod', () => {
	expect(JSON.stringify(find(additionalParam('customer'))[0].options)).toContain('lookup_terms_code');
	expect(JSON.stringify(find(fieldParam('account', 'parent'))[0])).toContain('lookup_account_dockey');
});

test('integer fields are numbers with precision 0', () => {
	const p = find(fieldParam('tax', 'taxtype'))[0];
	expect(p.type).toBe('number');
	expect(p.typeOptions).toMatchObject({ numberPrecision: 0 });
});

test('sales invoice has line items and a raw json toggle with a template default', () => {
	expect(find(linesParam('salesinvoice'))).toHaveLength(1);
	expect(find(useRawParam('salesinvoice'))).toHaveLength(1);
	expect(String(find(rawBodyParam('salesinvoice'))[0].default)).toContain('sdsdocdetail');
});

test('raw-only documents always show raw body', () => {
	const raw = find(rawBodyParam('paymentvoucher'))[0];
	expect(ops(raw)).toEqual(['paymentvoucher.create']);
	expect(raw.displayOptions?.show?.[useRawParam('paymentvoucher')]).toBeUndefined();
});

test('pmmethod has no create fields', () => {
	expect(props.some((p) => ops(p)?.includes('pmmethod.create'))).toBe(false);
});

test('one path-param property per kind', () => {
	for (const n of ['pathParamCode', 'pathParamDockey', 'pathParamAutokey']) expect(find(n)).toHaveLength(1);
	expect(ops(find('pathParamAutokey')[0])).toContain('shipper.get');
	expect(ops(find('pathParamAutokey')[0])).not.toContain('memberpoint.get');
});

test('limit is capped at 50 and maxPages exists', () => {
	expect(find('limit')[0].typeOptions).toMatchObject({ minValue: 1, maxValue: 50 });
	expect(find('maxPages')).toHaveLength(1);
});

test('typed filters per resource and a custom free-text filter', () => {
	expect(find('currency__filters')).toHaveLength(1);
	expect(find('customFilters')).toHaveLength(1);
});
