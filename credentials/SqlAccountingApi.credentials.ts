import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// ── IMPORTANT: Update this URL if your Supabase project changes ──────────────
const EDGE_FUNCTION_BASE = 'https://cqcxkvptxgslpneeobhv.supabase.co/functions/v1';

export class SqlAccountingApi implements ICredentialType {
	name = 'sqlAccountingApi';
	displayName = 'SQL Accounting API';
	documentationUrl =
		'https://github.com/laurentyew/n8n-nodes-sqlaccounting';

	// ── Tells n8n how to inject the platform API key as Bearer token ──────────
	// This is what allows httpRequestWithAuthentication() to work correctly
	// and satisfies the no-http-request-with-manual-auth linter rule.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.platformApiKey}}',
			},
		},
	};

	// ── Powers the "Test credential" button in the n8n UI ────────────────────
	// Calls profile.get (1 credit) to verify both the platform key AND
	// the SQL Accounting credentials are valid.
	test: ICredentialTestRequest = {
		request: {
			baseURL: EDGE_FUNCTION_BASE,
			url: '/sqlaccount',
			method: 'POST',
			body: {
				access_key: '={{$credentials.sqlAccessKey}}',
				secret_key: '={{$credentials.sqlSecretKey}}',
				service: '={{$credentials.service}}',
				region: '={{$credentials.region}}',
				operation: 'profile.get',
				method: 'GET',
				path: '/profile',
				query: '',
				body: '',
			},
			json: true,
		},
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Platform API Key',
			name: 'platformApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your licence key from the SQL Accounting n8n Node portal. Starts with sqlnode_.',
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
			placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.sql.my/ACCOUNTAPI',
		},
		{
			displayName: 'SQL Secret Key',
			name: 'sqlSecretKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your SQL Accounting API secret key. Encrypted by n8n and never stored on our servers.',
		},
		{
			displayName: 'Service',
			name: 'service',
			type: 'string',
			default: 'sqlaccount',
			required: true,
			description:
				'SigV4 service name. Default is sqlaccount. Only change if instructed by SQL Accounting support.',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: 'ap-southeast-5',
			required: true,
			description:
				'SigV4 region. Default is ap-southeast-5. Only change if instructed by SQL Accounting support.',
		},
	];
}
