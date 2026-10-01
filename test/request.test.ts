import { buildQuery, parsePathParam, pathParamLabel } from '../nodes/SqlAccounting/request';

describe('buildQuery', () => {
	test('always includes offset', () => {
		expect(buildQuery(0, [])).toEqual({ offset: 0 });
	});
	test('adds filters, skips blanks and reserved offset', () => {
		expect(
			buildQuery(50, [
				{ field: ' code ', value: '300*' },
				{ field: 'description', value: '' },
				{ field: '', value: 'x' },
				{ field: 'offset', value: '999' },
			]),
		).toEqual({ offset: 50, code: '300*' });
	});
	test('value containing "offset=5" is untouched', () => {
		expect(buildQuery(0, [{ field: 'description', value: 'offset=5' }])).toEqual({ offset: 0, description: 'offset=5' });
	});
	test('rejects negative or fractional offset', () => {
		expect(() => buildQuery(-1, [])).toThrow('Offset');
		expect(() => buildQuery(1.5, [])).toThrow('Offset');
	});
});

describe('parsePathParam', () => {
	test('CODE keeps trimmed string', () => {
		expect(parsePathParam('CODE', ' USD ', 'Code')).toBe('USD');
	});
	test('DOCKEY and AUTOKEY parse positive integers', () => {
		expect(parsePathParam('DOCKEY', '12', 'DocKey')).toBe(12);
		expect(parsePathParam('AUTOKEY', 7, 'AutoKey')).toBe(7);
	});
	test('integer kinds reject codes with a helpful message', () => {
		expect(() => parsePathParam('AUTOKEY', 'ST-6%', 'AutoKey')).toThrow('AutoKey must be a positive whole number');
		expect(() => parsePathParam('DOCKEY', '0', 'DocKey')).toThrow();
	});
	test('empty is rejected', () => {
		expect(() => parsePathParam('CODE', '  ', 'Code')).toThrow('Code is required');
	});
});

test('labels', () => {
	expect(pathParamLabel('CODE')).toBe('Code');
	expect(pathParamLabel('DOCKEY')).toBe('DocKey');
	expect(pathParamLabel('AUTOKEY')).toBe('AutoKey');
	expect(pathParamLabel(null)).toBe('Record ID');
});
