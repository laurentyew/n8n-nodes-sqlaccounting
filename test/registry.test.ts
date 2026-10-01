import {
	OPERATION_MAP,
	RESOURCE_DEFS,
	getOperation,
	OPS_WITH_PATH_PARAM,
	OPS_PAGINATED,
	OPS_LIST,
	opKey,
} from '../nodes/SqlAccounting/registry';

test('pathParam types follow the API doc', () => {
	expect(getOperation('assetgroup.get').pathParam).toBe('AUTOKEY');
	expect(getOperation('assetitem.get').pathParam).toBe('AUTOKEY');
	expect(getOperation('assetdisposal.delete').pathParam).toBe('AUTOKEY');
	expect(getOperation('shipper.update').pathParam).toBe('AUTOKEY');
	expect(getOperation('memberpoint.get').pathParam).toBe('DOCKEY');
	expect(getOperation('itemtemplate.get').pathParam).toBe('CODE');
	expect(getOperation('stockitem.delete').pathParam).toBe('DOCKEY');
});

test('pmmethod has no create or update', () => {
	expect(OPERATION_MAP['pmmethod.create']).toBeUndefined();
	expect(OPERATION_MAP['pmmethod.update']).toBeUndefined();
	expect(OPERATION_MAP['pmmethod.delete']).toBeDefined();
});

test('list has no path param, get has one', () => {
	expect(getOperation('account.list').pathParam).toBeNull();
	expect(getOperation('account.get').pathParam).toBe('CODE');
});

test('report get is paginated and not in OPS_LIST', () => {
	expect(OPS_PAGINATED).toContain('stockcard.get');
	expect(OPS_LIST).not.toContain('stockcard.get');
	expect(OPS_LIST).toContain('account.list');
});

test('unknown operation throws', () => {
	expect(() => getOperation('nope.list')).toThrow('Unknown operation: nope.list');
});

test('OPS_WITH_PATH_PARAM excludes list and create', () => {
	expect(OPS_WITH_PATH_PARAM).not.toContain('account.list');
	expect(OPS_WITH_PATH_PARAM).not.toContain('account.create');
	expect(OPS_WITH_PATH_PARAM).toContain('account.update');
});

test('unverified endpoint is flagged in the display name', () => {
	const r = RESOURCE_DEFS.find((x) => x.value === 'customerinvoice');
	expect(r?.name).toContain('(unverified)');
});

test('opKey builds keys', () => {
	expect(opKey('tax', 'get')).toBe('tax.get');
});
