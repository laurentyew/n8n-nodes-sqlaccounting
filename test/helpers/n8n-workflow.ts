// Runtime stand-in for n8n-workflow in unit tests (n8n provides the real module at runtime).
export class NodeOperationError extends Error {
	description?: string;
	node: unknown;
	constructor(node: unknown, message: string, options?: { itemIndex?: number; description?: string }) {
		super(message);
		this.name = 'NodeOperationError';
		this.node = node;
		this.description = options?.description;
	}
}
export class NodeApiError extends Error {}
export class ApplicationError extends Error {}
