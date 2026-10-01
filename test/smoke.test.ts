import { NodeOperationError } from 'n8n-workflow';

test('jest runs and n8n-workflow is mocked', () => {
	expect(new NodeOperationError({}, 'x', { description: 'd' }).description).toBe('d');
});
