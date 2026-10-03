import { prepareCall, AiCallInput } from '../nodes/SqlAccountingAi/aiRequest';
import { ValidationError } from '../nodes/SqlAccounting/errors';

const base: AiCallInput = {
	resource: '', operation: 'list', recordId: '', filters: '{}', body: '{}', offset: 0, limit: 10, allowChanges: false,
};
const call = (over: Partial<AiCallInput>) => prepareCall({ ...base, ...over });
const issues = (over: Partial<AiCallInput>): string => {
	try {
		call(over);
	} catch (e) {
		expect(e).toBeInstanceOf(ValidationError);
		return (e as ValidationError).issues.join(' ');
	}
	throw new Error('expected a ValidationError');
};

describe('describe', () => {
	test('works with and without a resource', () => {
		expect(call({ operation: 'describe' })).toEqual({ kind: 'describe', resource: '' });
		expect(call({ operation: 'Describe', resource: 'Sales Invoice' })).toEqual({ kind: 'describe', resource: 'Sales Invoice' });
	});
	test('unknown resource suggests close matches', () => {
		const msg = issues({ operation: 'describe', resource: 'invoice' });
		expect(msg).toContain('salesinvoice');
		expect(msg).toContain('Describe');
	});
});

describe('validation of the request', () => {
	test('unknown operation lists the valid ones', () => {
		expect(issues({ operation: 'explode' })).toContain('describe, list, get, create, update, delete');
	});
	test('resource is required for anything but describe', () => {
		expect(issues({ resource: '' })).toContain('Describe');
	});
	test('operation not offered by the resource', () => {
		expect(issues({ resource: 'pmmethod', operation: 'create', allowChanges: true })).toContain('Available: list, get, delete');
	});
	test('accepts the display name and ignores case and spaces', () => {
		const c = call({ resource: ' Sales  Invoice ', operation: 'list' });
		expect(c.kind === 'proxy' && c.op.key).toBe('salesinvoice.list');
	});
});

describe('read-only by default', () => {
	test.each(['create', 'update', 'delete'])('%s is blocked without Allow Changes', (operation) => {
		const msg = issues({ resource: 'currency', operation, recordId: 'USD', body: '{"description":"x"}' });
		expect(msg).toContain('Changes are disabled');
	});
	test('reads are always allowed', () => {
		expect(call({ resource: 'currency', operation: 'list' }).kind).toBe('proxy');
		expect(call({ resource: 'currency', operation: 'get', recordId: 'USD' }).kind).toBe('proxy');
	});
});

describe('list', () => {
	test('builds query from filters and offset; clamps the limit to 1..50', () => {
		const c = call({ resource: 'customer', filters: '{"code":"CUS*","isactive":true}', offset: 50, limit: 999 });
		expect(c).toMatchObject({ kind: 'proxy', query: { offset: 50, code: 'CUS*', isactive: 'true' }, limit: 50 });
		expect(call({ resource: 'customer', limit: 0 })).toMatchObject({ limit: 1 });
	});
	test('a report accepts list as get', () => {
		const c = call({ resource: 'stockcard', operation: 'list' });
		expect(c.kind === 'proxy' && c.op.key).toBe('stockcard.get');
	});
	test('invalid filters JSON is reported', () => {
		expect(issues({ resource: 'customer', filters: '{bad' })).toContain('Filters is not valid JSON');
	});
});

describe('record id', () => {
	test('integer ids are parsed and checked', () => {
		expect(call({ resource: 'tax', operation: 'get', recordId: '5' })).toMatchObject({ pathParam: 5 });
		expect(issues({ resource: 'tax', operation: 'get', recordId: 'ST-6%' })).toContain('AutoKey must be a positive whole number');
	});
	test('missing id is reported', () => {
		expect(issues({ resource: 'currency', operation: 'get', recordId: '' })).toContain('Code is required');
	});
});

describe('writes (Allow Changes on)', () => {
	const on = { allowChanges: true };
	test('master create casts types and keeps unknown keys', () => {
		const c = call({ ...on, resource: 'currency', operation: 'create', body: '{"code":"SGD","description":"Singapore","buyingrate":3.2,"custom":"x"}' });
		expect(c.kind === 'proxy' && c.body).toEqual({ code: 'SGD', description: 'Singapore', buyingrate: '3.2', custom: 'x' });
	});
	test('master create reports missing required fields', () => {
		expect(issues({ ...on, resource: 'tax', operation: 'create', body: '{"code":"X"}' })).toContain('Description is required');
	});
	test('master update does not send createOnly fields', () => {
		const c = call({ ...on, resource: 'currency', operation: 'update', recordId: 'USD', body: '{"code":"NEW","description":"Dollar"}' });
		expect(c.kind === 'proxy' && c.body).toEqual({ description: 'Dollar' });
	});
	test('document create normalizes date, lines and defaults', () => {
		const body = JSON.stringify({
			code: 'CUS-01', docdate: '2026-09-30T00:00:00.000Z',
			sdsdocdetail: [{ itemcode: 'STK-1', qty: 2, unitprice: 10.5 }],
		});
		const c = call({ ...on, resource: 'salesquotation', operation: 'create', body });
		expect(c.kind === 'proxy' && c.body).toEqual({
			dockey: 0, docno: '', code: 'CUS-01', docdate: '2026-09-30',
			sdsdocdetail: [{ dtlkey: 0, itemcode: 'STK-1', qty: '2', unitprice: '10.5' }],
		});
	});
	test('document without lines is rejected before any request', () => {
		expect(issues({ ...on, resource: 'salesquotation', operation: 'create', body: '{"code":"CUS-01"}' })).toContain('sdsdocdetail');
	});
	test('delete needs only the id', () => {
		const c = call({ ...on, resource: 'currency', operation: 'delete', recordId: 'USD' });
		expect(c).toMatchObject({ kind: 'proxy', pathParam: 'USD', body: null });
	});
});
