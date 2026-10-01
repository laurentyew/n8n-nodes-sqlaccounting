import { describeProxyError, ValidationError } from '../nodes/SqlAccounting/errors';

test('known code gives actionable message', () => {
	expect(describeProxyError({ code: 'invalid_token', message: 'x' }).message).toContain('Platform token');
	expect(describeProxyError({ code: 'sql_auth_failed', message: 'x' }).message).toContain('SQL Access Key');
	expect(describeProxyError({ code: 'subscription_inactive', message: 'x' }).message).toContain('subscription');
});

test('description includes field, hint, upstream status and request id', () => {
	const d = describeProxyError(
		{ code: 'validation_failed', message: 'bad', field: 'body.taxtype', hint: 'must be integer', upstream_status: 400 },
		'req-1',
	);
	expect(d.description).toContain('Field: body.taxtype');
	expect(d.description).toContain('Hint: must be integer');
	expect(d.description).toContain('Upstream status: 400');
	expect(d.description).toContain('Request id: req-1');
});

test('unknown code falls back safely', () => {
	expect(describeProxyError({ code: 'weird', message: 'm' }).message).toContain('weird');
});

test('ValidationError carries issues', () => {
	const e = new ValidationError(['a', 'b']);
	expect(e.issues).toEqual(['a', 'b']);
	expect(e.message).toContain('a');
	expect(e.message).toContain('b');
});
