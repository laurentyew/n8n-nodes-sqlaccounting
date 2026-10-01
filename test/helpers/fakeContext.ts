import type { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';

export interface FakeParams { [name: string]: unknown }

const node = { name: 'SQL Accounting', type: 'sqlAccounting', typeVersion: 1, position: [0, 0], parameters: {}, id: 'n1' };

function helpers(token: string) {
	return {
		httpRequestWithAuthentication: {
			call: async (_ctx: unknown, _cred: string, options: IHttpRequestOptions) => {
				const res = await fetch(String(options.url), {
					method: options.method,
					headers: { ...(options.headers as Record<string, string>), Authorization: `Bearer ${token}` },
					body: JSON.stringify(options.body),
				});
				const text = await res.text();
				try { return JSON.parse(text); } catch { return text; }
			},
		},
	};
}

const credentials = (proxyUrl: string) => ({
	platformApiKey: 'sqlnode_test', sqlAccessKey: 'ak', sqlSecretKey: 'sk',
	service: 'sqlaccount', region: 'ap-southeast-5', proxyBaseUrl: proxyUrl,
});

export function fakeExecuteContext(args: { params: FakeParams[]; proxyUrl: string; token?: string; continueOnFail?: boolean }): IExecuteFunctions {
	return {
		getInputData: () => args.params.map(() => ({ json: {} })),
		getNodeParameter: (name: string, i: number, fallback?: unknown) => (name in args.params[i] ? args.params[i][name] : fallback),
		getCredentials: async () => credentials(args.proxyUrl),
		getNode: () => node,
		continueOnFail: () => Boolean(args.continueOnFail),
		helpers: helpers(args.token ?? 'sqlnode_test'),
	} as unknown as IExecuteFunctions;
}

export function fakeLoadOptionsContext(args: { params: FakeParams; proxyUrl: string; token?: string }): ILoadOptionsFunctions {
	return {
		getNodeParameter: (name: string, fallback?: unknown) => (name in args.params ? args.params[name] : fallback),
		getCredentials: async () => credentials(args.proxyUrl),
		getNode: () => node,
		helpers: helpers(args.token ?? 'sqlnode_test'),
	} as unknown as ILoadOptionsFunctions;
}
