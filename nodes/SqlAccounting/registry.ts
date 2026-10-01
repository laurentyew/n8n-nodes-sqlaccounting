import {
	REGISTRY,
	PAGE_SIZE,
	CONTRACT_VERSION,
	OpName,
	PathParamType,
	ResourceKind,
} from './registry.generated';

export { PAGE_SIZE, CONTRACT_VERSION };

export interface OperationDef {
	key: string;
	resource: string;
	op: OpName;
	name: string;
	description: string;
	pathParam: PathParamType;
	kind: ResourceKind;
	group: string | null;
	isPaginated: boolean;
	writesBody: boolean;
}

export interface ResourceDef {
	name: string;
	value: string;
	kind: ResourceKind;
	operations: OperationDef[];
}

const OP_LABEL: Record<OpName, string> = {
	list: 'List',
	get: 'Get',
	create: 'Create',
	update: 'Update',
	delete: 'Delete',
};

export const opKey = (resource: string, op: OpName): string => `${resource}.${op}`;

const describe = (op: OpName, resourceName: string, kind: ResourceKind): string => {
	if (kind === 'report') return `Get ${resourceName} report data`;
	const text: Record<OpName, string> = {
		list: `List ${resourceName} records`,
		get: `Get one ${resourceName}`,
		create: `Create a ${resourceName}`,
		update: `Update a ${resourceName}`,
		delete: `Delete a ${resourceName}`,
	};
	return text[op];
};

export const RESOURCE_DEFS: ResourceDef[] = REGISTRY.map((entry) => ({
	name: entry.verifyEndpoint ? `${entry.name} (unverified)` : entry.name,
	value: entry.resource,
	kind: entry.kind,
	operations: entry.ops.map((op) => ({
		key: opKey(entry.resource, op),
		resource: entry.resource,
		op,
		name: OP_LABEL[op],
		description: describe(op, entry.name, entry.kind),
		pathParam: op === 'get' || op === 'update' || op === 'delete' ? entry.pathParam : null,
		kind: entry.kind,
		group: entry.group,
		isPaginated: op === 'list' || entry.kind === 'report',
		writesBody: op === 'create' || op === 'update',
	})),
}));

export const OPERATION_MAP: Record<string, OperationDef> = Object.fromEntries(
	RESOURCE_DEFS.flatMap((r) => r.operations.map((o) => [o.key, o] as const)),
);

export function getOperation(key: string): OperationDef {
	const op = OPERATION_MAP[key];
	if (!op) throw new Error(`Unknown operation: ${key}`);
	return op;
}

const keysWhere = (pred: (o: OperationDef) => boolean): string[] =>
	Object.values(OPERATION_MAP)
		.filter(pred)
		.map((o) => o.key);

export const OPS_WITH_PATH_PARAM = keysWhere((o) => o.pathParam !== null);
export const OPS_PAGINATED = keysWhere((o) => o.isPaginated);
export const OPS_LIST = keysWhere((o) => o.isPaginated && o.kind !== 'report');
export const OPS_CREATE = keysWhere((o) => o.op === 'create');
export const OPS_UPDATE = keysWhere((o) => o.op === 'update');
