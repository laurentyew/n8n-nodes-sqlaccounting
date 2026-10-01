import * as fs from 'fs';
/* eslint-disable @typescript-eslint/no-var-requires */
const { generate, out } = require('../scripts/gen-registry');
const { computeChecksums, checksumFile } = require('../scripts/contract-hash');
import { REGISTRY } from '../nodes/SqlAccounting/registry.generated';

test('registry.generated.ts matches contract/operations.json', () => {
	expect(fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n')).toBe(generate());
});

test('contract files match contract/CHECKSUMS.txt', () => {
	expect(fs.readFileSync(checksumFile, 'utf8').replace(/\r\n/g, '\n')).toBe(computeChecksums());
});

test('every resource has valid ops and a path param rule', () => {
	for (const r of REGISTRY) {
		expect(r.ops.length).toBeGreaterThan(0);
		if (r.kind === 'report') expect(r.pathParam).toBeNull();
	}
});
