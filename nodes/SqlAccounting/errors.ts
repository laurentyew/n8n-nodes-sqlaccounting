import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ProxyErrorDetail } from './contractTypes';

const MESSAGES: Record<string, string> = {
	invalid_token:
		'Platform token is invalid or revoked. Check the Platform Token in the SQL Accounting API credential.',
	subscription_inactive:
		'Your subscription is not active. Renew it in the SQL Accounting n8n Node portal, then retry.',
	rate_limited: 'Rate limit reached. Wait a moment and retry.',
	validation_failed: 'The request was rejected as invalid.',
	unknown_operation: 'This operation is not supported by the proxy.',
	unsupported_version: 'Node and proxy versions are incompatible. Update the node.',
	sql_auth_failed:
		'SQL Account rejected your keys. Check the SQL Access Key and SQL Secret Key in the credential.',
	upstream_error: 'SQL Account returned an error.',
	internal_error: 'Proxy internal error. Quote the request id when contacting support.',
};

export function describeProxyError(
	e: ProxyErrorDetail,
	requestId?: string,
): { message: string; description: string } {
	const message = MESSAGES[e.code] ?? `Unexpected error code "${e.code}".`;
	const parts = [
		e.message && e.message !== message ? e.message : null,
		e.field ? `Field: ${e.field}.` : null,
		e.hint ? `Hint: ${e.hint}` : null,
		e.upstream_status ? `Upstream status: ${e.upstream_status}.` : null,
		requestId ? `Request id: ${requestId}.` : null,
	].filter((p): p is string => p !== null);
	return { message, description: parts.join(' ') };
}

export class ProxyCallError extends NodeOperationError {
	readonly proxyCode: string;
	readonly field?: string;

	constructor(node: INode, detail: ProxyErrorDetail, requestId?: string) {
		const d = describeProxyError(detail, requestId);
		super(node, d.message, { description: d.description });
		this.proxyCode = detail.code;
		this.field = detail.field ?? undefined;
	}
}

export class ValidationError extends Error {
	readonly issues: string[];

	constructor(issues: string[]) {
		super(issues.join(' '));
		this.name = 'ValidationError';
		this.issues = issues;
	}
}
