// Runtime stand-in for n8n-workflow in unit tests (n8n provides the real module at runtime).
export const NodeConnectionTypes = { Main: 'main', AiTool: 'ai_tool' } as const;

export class NodeOperationError extends Error {
	description?: string;
	node: unknown;
	constructor(node: unknown, message: string | Error, options?: { itemIndex?: number; description?: string }) {
		super(typeof message === 'string' ? message : message.message);
		// Like n8n-workflow, hand back an existing NodeOperationError unchanged.
		if (message instanceof NodeOperationError) return message as this;
		this.name = 'NodeOperationError';
		this.node = node;
		this.description = options?.description;
	}
}
export class NodeApiError extends Error {}
export class ApplicationError extends Error {}
