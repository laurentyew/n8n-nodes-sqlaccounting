// Older n8n releases do not export NodeConnectionTypes. The node must still load on them.
describe('node loads when n8n-workflow has no NodeConnectionTypes', () => {
	test('falls back to "main" inputs and outputs', () => {
		jest.isolateModules(() => {
			jest.doMock('n8n-workflow', () => ({
				NodeOperationError: class extends Error {},
				NodeApiError: class extends Error {},
			}));
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { SqlAccounting } = require('../nodes/SqlAccounting/SqlAccounting.node');
			const description = new SqlAccounting().description;
			expect(description.inputs).toEqual(['main']);
			expect(description.outputs).toEqual(['main']);
		});
	});

	test('uses NodeConnectionTypes when n8n provides it', () => {
		jest.isolateModules(() => {
			jest.doMock('n8n-workflow', () => ({
				NodeConnectionTypes: { Main: 'main-from-n8n' },
				NodeOperationError: class extends Error {},
			}));
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { SqlAccounting } = require('../nodes/SqlAccounting/SqlAccounting.node');
			expect(new SqlAccounting().description.inputs).toEqual(['main-from-n8n']);
		});
	});

	test('the AI node also falls back to "main"', () => {
		jest.isolateModules(() => {
			jest.doMock('n8n-workflow', () => ({
				NodeOperationError: class extends Error {},
				NodeApiError: class extends Error {},
			}));
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { SqlAccountingAi } = require('../nodes/SqlAccountingAi/SqlAccountingAi.node');
			expect(new SqlAccountingAi().description.inputs).toEqual(['main']);
		});
	});
});
