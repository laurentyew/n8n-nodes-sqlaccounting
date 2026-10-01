export interface SqlCredentialsPayload {
	access_key: string;
	secret_key: string;
	region: string;
	service: string;
}

export interface ProxyRequest {
	contract_version: number;
	sql: SqlCredentialsPayload;
	operation: string;
	path_param: string | number | null;
	query: Record<string, string | number | boolean>;
	body: Record<string, unknown> | null;
}

export interface Pagination {
	offset: number;
	limit: number;
	count: number;
	has_more: boolean;
}

export interface ProxySuccess {
	ok: true;
	data: unknown;
	pagination?: Pagination;
	meta: { request_id: string; upstream_status: number; contract_version: number };
}

export interface ProxyErrorDetail {
	code: string;
	message: string;
	field?: string | null;
	hint?: string | null;
	upstream_status?: number | null;
}

export interface ProxyErrorBody {
	ok: false;
	error: ProxyErrorDetail;
	meta: { request_id: string; contract_version?: number };
}

export type ProxyResponse = ProxySuccess | ProxyErrorBody;

export function isProxyResponse(v: unknown): v is ProxyResponse {
	if (typeof v !== 'object' || v === null) return false;
	const o = v as { ok?: unknown; error?: unknown };
	if (o.ok === true) return true;
	return o.ok === false && typeof o.error === 'object' && o.error !== null;
}
