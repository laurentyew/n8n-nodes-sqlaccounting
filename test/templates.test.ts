import { templateFor } from '../nodes/SqlAccounting/templates';

const parse = (r: string) => JSON.parse(templateFor(r, '2026-09-30'));

test('item documents template matches the doc', () => {
	expect(parse('salesquotation')).toEqual({
		dockey: 0, docno: '', docdate: '2026-09-30', code: '', terms: '30 Days', currencycode: '----',
		sdsdocdetail: [{ dtlkey: 0, itemcode: '', qty: '1.00', unitprice: '0.00', uom: 'UNIT' }],
	});
});
test('invoice has postdate and amount', () => {
	const t = parse('salesinvoice');
	expect(t.postdate).toBe('2026-09-30');
	expect(t.sdsdocdetail[0]).toHaveProperty('amount');
});
test('journal, payment, stock adjustment shapes', () => {
	expect(parse('journalentry').journal).toBe('GENERAL');
	expect(parse('journalentry').sdsdocdetail).toHaveLength(2);
	expect(parse('customerpayment').paymentmethod).toBe('');
	expect(parse('customerpayment').sdsdocdetail[0]).toHaveProperty('fromdoctype');
	expect(parse('stockadjustment').sdsdocdetail[0]).toHaveProperty('location');
});
test('unknown resource gets a generic header template that is not empty', () => {
	expect(Object.keys(parse('joborder')).length).toBeGreaterThan(1);
});
