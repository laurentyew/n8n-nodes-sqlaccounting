import type { ResourceSchema } from './types';
import { codeField, descriptionField, lookup, str, typed } from './simple';

export const ASSET_SCHEMAS: ResourceSchema[] = [
	{
		resource: 'assetgroup',
		fields: [
			codeField('ASG-01'), descriptionField('Office Equipment'),
			lookup('assetacc', 'Asset Account', 'Fixed asset account (acctype FA).', 'account', 'code', { required: true, example: '200-200' }),
			lookup('accumdepracc', 'Accumulated Depreciation Account', 'Accumulated depreciation account code.', 'account', 'code', { required: true, example: '200-205' }),
			lookup('depracc', 'Depreciation Expense Account', 'Depreciation expense account code.', 'account', 'code', { required: true, example: '908-000' }),
		],
	},
	{
		resource: 'assetitem',
		fields: [
			codeField('ASI-01'), descriptionField('Laptop'),
			lookup('assetgroup', 'Asset Group', "Asset group's AutoKey (integer).", 'assetgroup', 'autokey', { type: 'integer', required: true }),
			lookup('assetacc', 'Asset Account', 'Asset account code.', 'account', 'code', { required: true }),
			typed('cost', 'Cost', 'Acquisition cost, sent as text.', 'decimal', { example: '5000.00' }),
		],
	},
	{
		resource: 'assetdisposal',
		fields: [
			lookup('asset', 'Asset', "Asset item's AutoKey (integer).", 'assetitem', 'autokey', { type: 'integer', required: true }),
			typed('postdate', 'Post Date', 'YYYY-MM-DD.', 'date', { required: true }),
			str('description', 'Description', 'Disposal description.', { example: 'Disposal of laptop' }),
			typed('amount', 'Amount', 'Disposal amount, sent as text.', 'decimal', { example: '5000.00' }),
		],
	},
];
