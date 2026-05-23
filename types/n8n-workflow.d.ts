/**
 * types/n8n-workflow.d.ts
 *
 * Minimal local type declarations for n8n-workflow.
 * This lets `tsc` compile without installing the full n8n-workflow package
 * (which pulls in the native isolated-vm module that fails to build in CI).
 *
 * At RUNTIME, n8n provides the real n8n-workflow module — these are types only.
 * The actual implementations come from the n8n host environment.
 */
declare module 'n8n-workflow' {
	export interface IDataObject {
		[key: string]: any;
	}

	export interface INodeExecutionData {
		json: IDataObject;
		binary?: { [key: string]: any };
		pairedItem?: { item: number } | number | Array<{ item: number }>;
		error?: any;
	}

	export interface INodePropertyOptions {
		name: string;
		value: string | number | boolean;
		description?: string;
		action?: string;
	}

	export interface INodePropertyCollection {
		displayName: string;
		name: string;
		values: INodeProperties[];
	}

	export interface IDisplayOptions {
		show?: { [key: string]: Array<string | number | boolean> };
		hide?: { [key: string]: Array<string | number | boolean> };
	}

	export interface INodeProperties {
		displayName: string;
		name: string;
		type: string;
		default: any;
		description?: string;
		hint?: string;
		placeholder?: string;
		required?: boolean;
		noDataExpression?: boolean;
		displayOptions?: IDisplayOptions;
		options?: Array<INodePropertyOptions | INodePropertyCollection | INodeProperties>;
		typeOptions?: { [key: string]: any };
	}

	export interface INodeTypeDescription {
		displayName: string;
		name: string;
		icon?: string;
		group: string[];
		version: number;
		subtitle?: string;
		description: string;
		defaults: { name: string; [key: string]: any };
		inputs: string[];
		outputs: string[];
		credentials?: Array<{ name: string; required?: boolean }>;
		properties: INodeProperties[];
	}

	export interface IExecuteFunctions {
		getInputData(): INodeExecutionData[];
		getNodeParameter(name: string, itemIndex: number, fallback?: any): any;
		getCredentials(name: string): Promise<IDataObject>;
		getNode(): any;
		continueOnFail(): boolean;
		helpers: {
			httpRequest(options: IHttpRequestOptions): Promise<any>;
			httpRequestWithAuthentication: {
				call(
					ctx: IExecuteFunctions,
					credentialsType: string,
					options: IHttpRequestOptions,
				): Promise<any>;
			};
		};
	}

	export interface INodeType {
		description: INodeTypeDescription;
		execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
	}

	export interface IHttpRequestOptions {
		method: string;
		url: string;
		headers?: { [key: string]: string };
		body?: any;
		qs?: { [key: string]: any };
		json?: boolean;
		returnFullResponse?: boolean;
	}

	export interface IAuthenticateGeneric {
		type: 'generic';
		properties: {
			headers?: { [key: string]: string };
			qs?: { [key: string]: string };
			body?: { [key: string]: any };
			auth?: { [key: string]: string };
		};
	}

	export interface ICredentialTestRequest {
		request: {
			baseURL?: string;
			url: string;
			method?: string;
			body?: any;
			headers?: { [key: string]: string };
			json?: boolean;
		};
	}

	export interface ICredentialType {
		name: string;
		displayName: string;
		documentationUrl?: string;
		properties: INodeProperties[];
		authenticate?: IAuthenticateGeneric;
		test?: ICredentialTestRequest;
	}

	export class NodeOperationError extends Error {
		constructor(node: any, message: string, options?: { itemIndex?: number });
	}

	export class NodeApiError extends Error {
		constructor(node: any, error: any, options?: any);
	}

	export class ApplicationError extends Error {
		constructor(message: string, options?: any);
	}
}
