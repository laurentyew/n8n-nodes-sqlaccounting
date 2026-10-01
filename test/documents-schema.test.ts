import { getSchema } from '../nodes/SqlAccounting/schema';

const req = (r: string, kind: 'fields' | 'lineFields') =>
	(getSchema(r)![kind] ?? []).filter((f) => f.required).map((f) => f.name).sort();

test('sales invoice header and line requirements', () => {
	expect(req('salesinvoice', 'fields')).toEqual(['code', 'docdate']);
	expect(req('salesinvoice', 'lineFields')).toEqual(['itemcode', 'qty', 'unitprice']);
});
test('journal lines', () => {
	expect(req('journalentry', 'lineFields')).toEqual(['code']);
	expect(getSchema('journalentry')!.fields.find((f) => f.name === 'journal')!.default).toBe('GENERAL');
});
test('payment', () => {
	expect(req('customerpayment', 'fields')).toEqual(['code', 'docamt', 'docdate', 'paymentmethod']);
	expect(req('customerpayment', 'lineFields')).toEqual(['amount', 'fromdocno', 'fromdoctype']);
});
test('deposit has no lines', () => {
	expect(getSchema('supplierdeposit')!.lineFields).toBeUndefined();
	expect(req('supplierdeposit', 'fields')).toContain('depositaccount');
});
test('raw-only documents have no schema', () => {
	for (const r of ['paymentvoucher', 'receiptvoucher', 'bankadjustment', 'customercontra', 'suppliercontra', 'joborder', 'assembly', 'disassembly']) {
		expect(getSchema(r)).toBeUndefined();
	}
});
test('defaults', () => {
	expect(getSchema('salesorder')!.createDefaults).toEqual({ dockey: 0, docno: '' });
	expect(getSchema('customerpayment')!.createDefaults).toEqual({ docno: '' });
});
test('every schema-backed document type has fields', () => {
	for (const r of ['salesquotation', 'purchaseorder', 'stockadjustment', 'stocktransfer', 'goodsreceived', 'suppliercreditnote']) {
		expect(getSchema(r)!.fields.length).toBeGreaterThan(2);
	}
});
test('supplier-side documents look up suppliers, sales-side customers', () => {
	expect(getSchema('purchaseorder')!.fields.find((f) => f.name === 'code')!.lookup).toBe('supplier');
	expect(getSchema('salesorder')!.fields.find((f) => f.name === 'code')!.lookup).toBe('customer');
});
