import { castValue, buildFieldsBody, parseJsonObject } from '../nodes/SqlAccounting/schema/cast';
import type { FieldDef, ResourceSchema } from '../nodes/SqlAccounting/schema/types';
import { ValidationError } from '../nodes/SqlAccounting/errors';

const f = (over: Partial<FieldDef>): FieldDef => ({ name: 'x', label: 'X', type: 'string', description: '', ...over });

describe('castValue', () => {
	test('integer', () => {
		expect(castValue(f({ type: 'integer' }), '3')).toBe(3);
		expect(castValue(f({ type: 'integer' }), 0)).toBe(0);
		expect(() => castValue(f({ type: 'integer', label: 'Tax Type' }), '1.5')).toThrow('Tax Type must be a whole number');
	});
	test('number', () => {
		expect(castValue(f({ type: 'number' }), '6')).toBe(6);
		expect(() => castValue(f({ type: 'number' }), 'abc')).toThrow('must be a number');
	});
	test('decimal is sent as string', () => {
		expect(castValue(f({ type: 'decimal' }), 4.35)).toBe('4.35');
		expect(castValue(f({ type: 'decimal' }), ' 100.00 ')).toBe('100.00');
		expect(() => castValue(f({ type: 'decimal' }), '1,000')).toThrow('must be a number');
	});
	test('boolean', () => {
		expect(castValue(f({ type: 'boolean' }), true)).toBe(true);
		expect(castValue(f({ type: 'boolean' }), 'false')).toBe(false);
		expect(() => castValue(f({ type: 'boolean' }), 'yes')).toThrow('true or false');
	});
	test('date trims time', () => {
		expect(castValue(f({ type: 'date' }), '2026-09-30T00:00:00.000Z')).toBe('2026-09-30');
		expect(() => castValue(f({ type: 'date' }), '30/09/2026')).toThrow('YYYY-MM-DD');
	});
	test('enum keeps numeric options numeric', () => {
		expect(castValue(f({ type: 'enum' }), 1)).toBe(1);
		expect(castValue(f({ type: 'enum' }), 'CA')).toBe('CA');
	});
});

const schema: ResourceSchema = {
	resource: 'demo',
	createDefaults: { dockey: 0 },
	fields: [
		f({ name: 'code', label: 'Code', required: true, createOnly: true }),
		f({ name: 'taxtype', label: 'Tax Type', type: 'integer', required: true }),
		f({ name: 'isactive', label: 'Active', type: 'boolean' }),
	],
};

describe('buildFieldsBody', () => {
	test('create merges defaults, extra and typed values (typed wins)', () => {
		expect(buildFieldsBody(schema, { code: 'A', taxtype: '0', isactive: true }, 'create', { isactive: false, note: 'n' })).toEqual({
			dockey: 0, code: 'A', taxtype: 0, isactive: true, note: 'n',
		});
	});
	test('create reports every missing required field and cast failure together', () => {
		try {
			buildFieldsBody(schema, { taxtype: 'x' }, 'create');
			throw new Error('should not reach');
		} catch (e) {
			expect(e).toBeInstanceOf(ValidationError);
			expect((e as ValidationError).issues).toEqual(expect.arrayContaining(['Code is required.', 'Tax Type must be a whole number.']));
		}
	});
	test('update drops createOnly fields and blanks', () => {
		expect(buildFieldsBody(schema, { code: 'NEW', taxtype: '1', isactive: '' }, 'update')).toEqual({ taxtype: 1 });
	});
	test('update with nothing to send fails (no empty body)', () => {
		expect(() => buildFieldsBody(schema, {}, 'update')).toThrow('Nothing to send');
	});
});

describe('parseJsonObject', () => {
	test('accepts object, JSON string, empty', () => {
		expect(parseJsonObject({ a: 1 }, 'X')).toEqual({ a: 1 });
		expect(parseJsonObject('{"a":1}', 'X')).toEqual({ a: 1 });
		expect(parseJsonObject('', 'X')).toEqual({});
		expect(parseJsonObject(undefined, 'X')).toEqual({});
	});
	test('rejects invalid JSON and non-objects with the label', () => {
		expect(() => parseJsonObject('{bad', 'Extra Fields')).toThrow('Extra Fields is not valid JSON');
		expect(() => parseJsonObject('[1]', 'Extra Fields')).toThrow('Extra Fields must be a JSON object');
	});
});
