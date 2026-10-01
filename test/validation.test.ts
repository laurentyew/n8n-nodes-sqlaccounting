import { validateDocument, assertValidDocument } from '../nodes/SqlAccounting/validation';
import { ValidationError } from '../nodes/SqlAccounting/errors';

const line = { itemcode: 'STK-1', qty: '1', unitprice: '10' };

test('empty body rejected', () => {
	expect(validateDocument('salesinvoice', {}, 'create')[0]).toContain('empty');
	expect(validateDocument('salesinvoice', {}, 'update')[0]).toContain('empty');
});

test('valid sales invoice passes', () => {
	expect(validateDocument('salesinvoice', { docdate: '2026-09-30', code: 'CUS-01', sdsdocdetail: [line] }, 'create')).toEqual([]);
});

test('reports every problem at once', () => {
	const issues = validateDocument('salesinvoice', { docdate: '30/09/2026', code: '', sdsdocdetail: [] }, 'create');
	expect(issues).toEqual(expect.arrayContaining([
		expect.stringContaining('docdate'),
		expect.stringContaining('code'),
		expect.stringContaining('sdsdocdetail'),
	]));
});

test('update does not require lines or party code', () => {
	expect(validateDocument('salesinvoice', { description: 'x' }, 'update')).toEqual([]);
});

test('deposit needs depositaccount but not lines', () => {
	expect(validateDocument('customerdeposit', { code: 'CUS-01' }, 'create')).toEqual([expect.stringContaining('depositaccount')]);
	expect(validateDocument('customerdeposit', { code: 'CUS-01', depositaccount: '310-000' }, 'create')).toEqual([]);
});

test('payment needs paymentmethod', () => {
	expect(validateDocument('customerpayment', { code: 'C', sdsdocdetail: [{ amount: '1' }] }, 'create')).toEqual([expect.stringContaining('paymentmethod')]);
});

test('journal must balance in cents', () => {
	const ok = { sdsdocdetail: [{ code: '100-000', dr: '0.10', cr: '0.00' }, { code: '500-000', dr: '0.20', cr: '0.30' }] };
	expect(validateDocument('journalentry', ok, 'create')).toEqual([]);
	const bad = { sdsdocdetail: [{ code: '100-000', dr: '1000', cr: '0' }, { code: '500-000', dr: '0', cr: '900' }] };
	expect(validateDocument('journalentry', bad, 'create')[0]).toContain('debits');
	expect(validateDocument('journalentry', { sdsdocdetail: [{ code: '', dr: '1', cr: '1' }] }, 'create').join(' ')).toContain('Line 1');
});

test('assert throws ValidationError', () => {
	expect(() => assertValidDocument('salesinvoice', {}, 'create')).toThrow(ValidationError);
});
