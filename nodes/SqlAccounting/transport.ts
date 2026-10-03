import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { PROXY_PATH } from './config';
import { isProxyResponse, ProxyRequest, ProxyResponse, ProxySuccess } from './contractTypes';
import { ProxyCallError } from './errors';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions | ISupplyDataFunctions;

export async function callProxy(
	ctx: Ctx,
	baseUrl: string,
	req: ProxyRequest,
): Promise<ProxySuccess> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl.replace(/\/+$/, '')}${PROXY_PATH}`,
		headers: { 'Content-Type': 'application/json' },
		body: req,
		json: true,
		// Read the JSON error envelope on non-2xx instead of letting n8n throw a generic error.
		ignoreHttpStatusErrors: true,
	};

	const response = (await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		'sqlAccountingApi',
		options,
	)) as unknown;

	if (!isProxyResponse(response)) {
		throw new NodeOperationError(ctx.getNode(), 'Unexpected response from the proxy.', {
			description:
				'The proxy did not return the expected JSON envelope. Check the Proxy URL in the SQL Accounting API credential.',
		});
	}
	const typed: ProxyResponse = response;
	if (!typed.ok) throw new ProxyCallError(ctx.getNode(), typed.error, typed.meta?.request_id);
	return typed;
}
