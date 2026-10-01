import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { DEFAULT_REGION, DEFAULT_SERVICE, PROXY_BASE_URL } from '../nodes/SqlAccounting/config';

export class SqlAccountingApi implements ICredentialType {
	name = 'sqlAccountingApi';
	displayName = 'SQL Accounting API';
	documentationUrl = 'https://github.com/laurentyew/n8n-nodes-sqlaccounting';

	// Injects the platform token as a Bearer header on every request made with this credential.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.platformApiKey}}',
			},
		},
	};

	// Powers the "Test credential" button: calls profile.get to verify both the token and the SQL keys.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.proxyBaseUrl}}',
			url: '/functions/v1/sqlaccount',
			method: 'POST',
			body: {
				contract_version: 1,
				sql: {
					access_key: '={{$credentials.sqlAccessKey}}',
					secret_key: '={{$credentials.sqlSecretKey}}',
					region: '={{$credentials.region}}',
					service: '={{$credentials.service}}',
				},
				operation: 'profile.get',
				path_param: null,
				query: {},
				body: null,
			},
			json: true,
		},
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Platform Token',
			name: 'platformApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your subscription token from the SQL Accounting n8n Node portal. Starts with sqlnode_.',
			placeholder: 'sqlnode_...',
		},
		{
			displayName: 'SQL Access Key',
			name: 'sqlAccessKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your SQL Accounting API access key from the SQL Account API settings page',
			placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.sql.my/APIUSER',
		},
		{
			displayName: 'SQL Secret Key',
			name: 'sqlSecretKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your SQL Accounting API secret key. It is sent with each request over HTTPS, used in memory to sign that single request, and never stored or logged.',
		},
		{
			displayName: 'Service',
			name: 'service',
			type: 'string',
			default: DEFAULT_SERVICE,
			required: true,
			description: 'SigV4 service name. Only change if instructed by SQL Accounting support.',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: DEFAULT_REGION,
			required: true,
			description: 'SigV4 region. Only change if instructed by SQL Accounting support.',
		},
		{
			displayName: 'Proxy URL',
			name: 'proxyBaseUrl',
			type: 'string',
			default: PROXY_BASE_URL,
			required: true,
			description: 'Advanced. Only change to self-host the proxy or for local testing.',
		},
	];
}
