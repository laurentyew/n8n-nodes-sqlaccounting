/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	root: true,
	env: { node: true },
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	plugins: ['eslint-plugin-n8n-nodes-base'],
	extends: ['plugin:eslint-plugin-n8n-nodes-base/nodes'],
	ignorePatterns: ['dist/**', 'node_modules/**', 'gulpfile.js'],
	rules: {
		// Required for cloud verification
		'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'error',
		'n8n-nodes-base/node-param-description-missing-final-period': 'off',
		// Enforces no manual auth headers — use helpers.httpRequestWithAuthentication
		'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'error',
	},
};
