import { normalizeData, toArray } from '../nodes/SqlAccounting/normalize';
import { getOperation } from '../nodes/SqlAccounting/registry';

test('toArray', () => {
	expect(toArray([1, 2])).toEqual([1, 2]);
	expect(toArray({ a: 1 })).toEqual([{ a: 1 }]);
	expect(toArray(null)).toEqual([]);
	expect(toArray('OK')).toEqual([]);
});

test('delete yields a success item (never a bare string)', () => {
	expect(normalizeData(getOperation('currency.delete'), { success: true }, 'USD')).toEqual([
		{ success: true, resource: 'currency', deleted: 'USD' },
	]);
});

test('get returns one item; list returns many', () => {
	expect(normalizeData(getOperation('currency.get'), { code: 'USD' }, 'USD')).toEqual([{ code: 'USD' }]);
	expect(normalizeData(getOperation('currency.list'), [{ code: 'A' }, { code: 'B' }], null)).toHaveLength(2);
});
