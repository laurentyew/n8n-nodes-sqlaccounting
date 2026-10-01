import type { INodeProperties } from 'n8n-workflow';
import { MAX_PAGES_DEFAULT } from '../config';
import {
	OPERATION_MAP,
	OPS_PAGINATED,
	PAGE_SIZE,
	RESOURCE_DEFS,
	ResourceDef,
	opKey,
} from '../registry';
import { getSchema } from '../schema';
import type { ResourceSchema } from '../schema/types';
import { templateFor } from '../templates';
import { baseProperty } from './fieldProps';
import {
	PATH_PARAM_NAME,
	additionalParam,
	extraJsonParam,
	fieldParam,
	filtersParam,
	linesParam,
	rawBodyParam,
	updateParam,
	useRawParam,
} from './names';

// Evaluated when n8n loads the node description (restart reloads it), which is good enough for a template date.
const TODAY = new Date().toISOString().slice(0, 10);

const FILTER_HINT =
	'Supports wildcards (*term*) and ranges (2025-01-01~2025-01-31) on SQL Account 5.2025.1061.890 and later.';

const KIND_ORDER: Record<string, number> = { master: 0, transactional: 1, report: 2 };
const KIND_LABEL: Record<string, string> = { master: 'Master data', transactional: 'Document', report: 'Report' };

const showOp = (operation: string[], extra: Record<string, Array<string | number | boolean>> = {}) => ({
	show: { operation, ...extra },
});

function resourceProperty(): INodeProperties {
	const sorted = [...RESOURCE_DEFS].sort(
		(a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name),
	);
	return {
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: sorted.map((r) => ({ name: r.name, value: r.value, description: KIND_LABEL[r.kind] })),
		default: 'profile',
		required: true,
	};
}

function operationProperties(): INodeProperties[] {
	return RESOURCE_DEFS.map((resource: ResourceDef) => ({
		displayName: 'Operation',
		name: 'operation',
		type: 'options' as const,
		noDataExpression: true,
		displayOptions: { show: { resource: [resource.value] } },
		options: resource.operations.map((op) => ({
			name: op.name,
			value: op.key,
			description: op.description,
			action: op.description,
		})),
		default: resource.operations[0]?.key ?? '',
	}));
}

function pathParamProperties(): INodeProperties[] {
	const defs = [
		{ kind: 'CODE', label: 'Code', help: 'The record code, for example USD or CUS-01.' },
		{
			kind: 'DOCKEY',
			label: 'DocKey',
			help: "SQL Account's internal numeric ID (not the document number). Find it with the List operation and a filter such as code=X.",
		},
		{
			kind: 'AUTOKEY',
			label: 'AutoKey',
			help: "SQL Account's internal numeric ID (not the code). Find it with the List operation and a filter such as code=X.",
		},
	] as const;
	return defs.map((d) => ({
		displayName: d.label,
		name: PATH_PARAM_NAME[d.kind],
		type: 'string',
		default: '',
		required: true,
		description: d.help,
		displayOptions: showOp(
			Object.values(OPERATION_MAP)
				.filter((o) => o.pathParam === d.kind)
				.map((o) => o.key),
		),
	}));
}

function paginationProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Offset',
			name: 'offset',
			type: 'number',
			default: 0,
			description: `Start position. The API returns up to ${PAGE_SIZE} records per request.`,
			displayOptions: showOp(OPS_PAGINATED),
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: showOp(OPS_PAGINATED),
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50, // equals PAGE_SIZE: the API returns at most 50 records per request
			typeOptions: { minValue: 1, maxValue: PAGE_SIZE },
			description: 'Max number of results to return',
			displayOptions: showOp(OPS_PAGINATED, { returnAll: [false] }),
		},
		{
			displayName: 'Max Pages',
			name: 'maxPages',
			type: 'number',
			default: MAX_PAGES_DEFAULT,
			typeOptions: { minValue: 1 },
			description: `Safety cap on the number of ${PAGE_SIZE}-record pages fetched when Return All is on`,
			displayOptions: showOp(OPS_PAGINATED, { returnAll: [true] }),
		},
	];
}

function filterCollection(name: string, displayName: string, operation: string[], fieldProp: INodeProperties): INodeProperties {
	return {
		displayName,
		name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Filter',
		description: FILTER_HINT,
		displayOptions: showOp(operation),
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [fieldProp, { displayName: 'Value', name: 'value', type: 'string', default: '', description: FILTER_HINT }],
			},
		],
	};
}

function filterProperties(): INodeProperties[] {
	const typed: INodeProperties[] = [];
	for (const resource of RESOURCE_DEFS) {
		const schema = getSchema(resource.value);
		const list = resource.operations.find((o) => o.op === 'list');
		if (!schema || !list) continue;
		const options = schema.fields.filter((f) => f.filterable !== false).map((f) => ({ name: f.label, value: f.name }));
		typed.push(
			filterCollection(filtersParam(resource.value), 'Filters', [list.key], {
				displayName: 'Field',
				name: 'field',
				type: 'options' as const,
				options,
				default: options[0]?.value ?? '',
				description: 'Field to filter on',
			}),
		);
	}
	const custom = filterCollection('customFilters', 'Custom Filters', OPS_PAGINATED, {
		displayName: 'Field',
		name: 'field',
		type: 'string',
		default: '',
		placeholder: 'e.g. code, description, isactive',
		description: 'API field name to filter on',
	});
	return [...typed, custom];
}

function extraJsonProperty(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Extra Fields (JSON)',
		name: extraJsonParam(resource),
		type: 'json',
		default: '{}',
		description: 'Advanced: fields not listed above or sub-arrays (for example sdsbranch). Values set above take precedence.',
		displayOptions: showOp(operations),
	};
}

function masterProperties(resource: string, schema: ResourceSchema): INodeProperties[] {
	const create = opKey(resource, 'create');
	const update = opKey(resource, 'update');
	const out: INodeProperties[] = [];
	if (!OPERATION_MAP[create]) return out;

	for (const f of schema.fields.filter((x) => x.required)) {
		out.push({ ...baseProperty(f), name: fieldParam(resource, f.name), required: true, displayOptions: showOp([create]) });
	}
	out.push({
		displayName: 'Additional Fields',
		name: additionalParam(resource),
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showOp([create]),
		options: schema.fields.filter((f) => !f.required).map(baseProperty),
	});
	if (OPERATION_MAP[update]) {
		out.push({
			displayName: 'Fields to Update',
			name: updateParam(resource),
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showOp([update]),
			options: schema.fields.filter((f) => !f.createOnly).map(baseProperty),
		});
	}
	out.push(extraJsonProperty(resource, OPERATION_MAP[update] ? [create, update] : [create]));
	return out;
}

function rawBodyProperty(resource: string, mode: 'create' | 'update', extra: Record<string, Array<string | number | boolean>> = {}): INodeProperties {
	if (mode === 'create') {
		return {
			displayName: 'Request Body (JSON)',
			name: rawBodyParam(resource, 'create'),
			type: 'json',
			default: templateFor(resource, TODAY),
			description: 'Full JSON body. Fill in the empty values; include at least one line in sdsdocdetail.',
			displayOptions: showOp([opKey(resource, 'create')], extra),
		};
	}
	return {
		displayName: 'Request Body (JSON)',
		name: rawBodyParam(resource, 'update'),
		type: 'json',
		default: '{}',
		description: 'Only the fields you want to change',
		displayOptions: showOp([opKey(resource, 'update')], extra),
	};
}

function documentProperties(resource: string): INodeProperties[] {
	const schema = getSchema(resource);
	const create = opKey(resource, 'create');
	const update = opKey(resource, 'update');
	const out: INodeProperties[] = [];

	if (!schema) {
		out.push(rawBodyProperty(resource, 'create'));
	} else {
		const typedMode = { [useRawParam(resource)]: [false] };
		out.push({
			displayName: 'Use Raw JSON Instead',
			name: useRawParam(resource),
			type: 'boolean',
			default: false,
			description: 'Whether to type the whole document as JSON instead of using the fields below',
			displayOptions: showOp([create]),
		});
		for (const f of schema.fields.filter((x) => x.required)) {
			out.push({ ...baseProperty(f), name: fieldParam(resource, f.name), required: true, displayOptions: showOp([create], typedMode) });
		}
		out.push({
			displayName: 'Additional Fields',
			name: additionalParam(resource),
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showOp([create], typedMode),
			options: schema.fields.filter((f) => !f.required).map(baseProperty),
		});
		if (schema.lineFields) {
			out.push({
				displayName: 'Line Items',
				name: linesParam(resource),
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Line',
				displayOptions: showOp([create], typedMode),
				options: [
					{
						name: 'line',
						displayName: 'Line',
						values: schema.lineFields.map((f) => (f.required ? { ...baseProperty(f), required: true } : baseProperty(f))),
					},
				],
			});
		}
		out.push(extraJsonProperty(resource, [create]));
		out.push(rawBodyProperty(resource, 'create', { [useRawParam(resource)]: [true] }));
	}
	if (OPERATION_MAP[update]) out.push(rawBodyProperty(resource, 'update'));
	return out;
}

export function buildProperties(): INodeProperties[] {
	const generated: INodeProperties[] = [];
	for (const resource of RESOURCE_DEFS) {
		if (resource.kind === 'master') {
			const schema = getSchema(resource.value);
			if (schema) generated.push(...masterProperties(resource.value, schema));
		} else if (resource.kind === 'transactional') {
			generated.push(...documentProperties(resource.value));
		}
	}
	return [
		resourceProperty(),
		...operationProperties(),
		...pathParamProperties(),
		...paginationProperties(),
		...filterProperties(),
		...generated,
	];
}
