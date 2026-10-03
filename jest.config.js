module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes', '<rootDir>/credentials', '<rootDir>/test'],
	testMatch: ['**/*.test.ts'],
	moduleNameMapper: { '^n8n-workflow$': '<rootDir>/test/helpers/n8n-workflow.ts' },
	transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }] },
	collectCoverageFrom: [
		'nodes/SqlAccounting/**/*.ts',
		'!nodes/SqlAccounting/registry.generated.ts',
		'!nodes/SqlAccounting/SqlAccounting.node.ts',
		'!nodes/SqlAccounting/ui/**',
	],
	coverageThreshold: { global: { statements: 80, branches: 70, functions: 80, lines: 80 } },
};
