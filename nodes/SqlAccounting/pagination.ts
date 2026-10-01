import type { Pagination } from './contractTypes';

export interface PageResult {
	data: unknown[];
	pagination?: Pagination;
}

export async function fetchAllPages(
	fetchPage: (offset: number) => Promise<PageResult>,
	opts: { startOffset: number; maxPages: number },
): Promise<unknown[]> {
	const all: unknown[] = [];
	let offset = opts.startOffset;

	for (let page = 1; page <= opts.maxPages; page++) {
		const outcome = await fetchPage(offset).then(
			(value) => ({ failed: false as const, value }),
			(error: unknown) => ({ failed: true as const, error }),
		);
		if (outcome.failed) {
			// Keep the original error object (its code/field are used by continueOnFail); only prefix the message.
			if (outcome.error instanceof Error) {
				outcome.error.message = `Page ${page} (offset ${offset}): ${outcome.error.message}`;
			}
			throw outcome.error;
		}
		const result: PageResult = outcome.value;
		all.push(...result.data);

		const p = result.pagination;
		if (!p || !p.has_more) return all;

		const next = p.offset + p.limit;
		if (next <= offset) throw new Error('Pagination did not advance; aborting to avoid an endless loop.');
		offset = next;
	}
	throw new Error(
		`Stopped after ${opts.maxPages} pages with more data available. Increase Max Pages or add filters.`,
	);
}
