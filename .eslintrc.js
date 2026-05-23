/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	root: true,
	env: { node: true },
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
	},
	plugins: ['eslint-plugin-n8n-nodes-base'],
	extends: ['plugin:eslint-plugin-n8n-nodes-base/nodes'],
	ignorePatterns: ['dist/**', 'node_modules/**', 'gulpfile.js', 'types/**'],
	rules: {
		'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'error',
		'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'error',
	},
};
