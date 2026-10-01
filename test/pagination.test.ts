import { fetchAllPages, PageResult } from '../nodes/SqlAccounting/pagination';

const page = (offset: number, count: number, hasMore: boolean): PageResult => ({
	data: Array.from({ length: count }, (_, i) => ({ n: offset + i })),
	pagination: { offset, limit: 50, count, has_more: hasMore },
});

test('advances offset by pagination.limit (50), not 100', async () => {
	const offsets: number[] = [];
	const rows = await fetchAllPages(
		async (offset) => {
			offsets.push(offset);
			return offset === 0 ? page(0, 50, true) : offset === 50 ? page(50, 50, true) : page(100, 7, false);
		},
		{ startOffset: 0, maxPages: 10 },
	);
	expect(offsets).toEqual([0, 50, 100]);
	expect(rows).toHaveLength(107);
});

test('stops when there is no pagination info (single object endpoints)', async () => {
	const rows = await fetchAllPages(async () => ({ data: [{ a: 1 }] }), { startOffset: 0, maxPages: 5 });
	expect(rows).toEqual([{ a: 1 }]);
});

test('respects startOffset', async () => {
	const offsets: number[] = [];
	await fetchAllPages(async (o) => { offsets.push(o); return page(o, 3, false); }, { startOffset: 100, maxPages: 5 });
	expect(offsets).toEqual([100]);
});

test('throws instead of silently truncating at maxPages', async () => {
	await expect(
		fetchAllPages(async (o) => page(o, 50, true), { startOffset: 0, maxPages: 3 }),
	).rejects.toThrow('Stopped after 3 pages');
});

test('throws if offset does not advance', async () => {
	await expect(
		fetchAllPages(async () => ({ data: [{}], pagination: { offset: 0, limit: 0, count: 1, has_more: true } }), { startOffset: 0, maxPages: 5 }),
	).rejects.toThrow('did not advance');
});

test('failure names the page and preserves the original error', async () => {
	const original = new Error('boom');
	let call = 0;
	await expect(
		fetchAllPages(async (o) => { if (call++ === 1) throw original; return page(o, 50, true); }, { startOffset: 0, maxPages: 5 }),
	).rejects.toBe(original);
	expect(original.message).toBe('Page 2 (offset 50): boom');
});
