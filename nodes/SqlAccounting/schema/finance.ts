import type { ResourceSchema } from './types';
import { bool, codeField, descriptionField, lookup, str, typed } from './simple';

export const FINANCE_SCHEMAS: ResourceSchema[] = [
	{
		resource: 'currency',
		fields: [
			codeField('USD'),
			descriptionField('US Dollar'),
			str('symbol', 'Symbol', 'Shown in reports. Copies Code if left blank.', { example: '$' }),
			str('isocode', 'ISO Code', 'ISO 4217 three-letter code.', { example: 'USD' }),
			typed('buyingrate', 'Buying Rate', 'Rate to buy this currency. Base currency (MYR) is 1.', 'decimal', { default: '1', example: '4.35' }),
			typed('sellingrate', 'Selling Rate', 'Rate to sell this currency.', 'decimal', { default: '1', example: '4.45' }),
			lookup('fcgainaccount', 'FX Gain Account', 'Account for foreign exchange gains.', 'account'),
			lookup('fclossaccount', 'FX Loss Account', 'Account for foreign exchange losses.', 'account'),
			typed('color', 'Colour', 'UI colour as a decimal number (not hex). Default 30464.', 'integer', { default: 30464 }),
		],
	},
	{
		resource: 'tax',
		fields: [
			codeField('ST-6%'),
			descriptionField('SST 6%'),
			typed('taxtype', 'Tax Type', 'Tax type code. 0 = No Tax / Exempt. Other codes are not documented in the API reference.', 'integer', { required: true, default: 0, example: '0' }),
			typed('taxrate', 'Tax Rate (%)', 'Percentage: 6 means 6%, not 0.06.', 'number', { example: '6' }),
			lookup('taxaccount', 'Tax Account', 'Tax account code.', 'account'),
			lookup('taxreturnaccount', 'Tax Return Account', 'Tax return account code.', 'account'),
			lookup('inputtax', 'Input Tax Account', 'Input tax account code.', 'account'),
			lookup('outputtax', 'Output Tax Account', 'Output tax account code.', 'account'),
			bool('taxinclusive', 'Tax Inclusive', 'Tax inclusive pricing.'),
			bool('isdefault', 'Default', 'Use as default tax.'),
			bool('isactive', 'Active', 'Whether the tax is active.', true),
		],
	},
	{
		resource: 'terms',
		fields: [
			codeField('45D'),
			descriptionField('45 Days'),
			{ name: 'termtype', label: 'Term Type', type: 'enum', description: 'A = After: due date = invoice date + days.', default: 'A', options: [{ name: 'After (Invoice Date + Days)', value: 'A' }] },
			typed('termday', 'Days', 'Number of days.', 'integer', { example: '45' }),
			typed('termmonth', 'Months', 'Number of months.', 'integer'),
			bool('isactive', 'Active', 'Whether the terms are active.', true),
		],
	},
	{
		resource: 'account',
		createDefaults: { dockey: 0, description2: '', specialacctype: '  ', tax: '', cashflowtype: 0, sic: '' },
		fields: [
			lookup('parent', 'Parent Account', "Parent account's internal dockey (integer). Common: 3 EQUITY, 18 CURRENT ASSETS, 28 CURRENT LIABILITIES, 60 EXPENSES.", 'account', 'dockey', { type: 'integer', required: true, example: '3' }),
			codeField('SUB-EQ'),
			descriptionField('Sub of Equity'),
			{
				name: 'acctype', label: 'Account Type', type: 'enum', required: true, description: 'Account classification code.',
				options: ['CP', 'CA', 'CL', 'FA', 'EP', 'CO', 'SA', 'OI', 'SL', 'RE', 'OA'].map((v) => ({ name: v, value: v })),
			},
			{
				name: 'specialacctype', label: 'Special Account Type', type: 'enum', description: 'Blank (two spaces) for none.', default: '  ',
				options: [{ name: 'None', value: '  ' }, ...['DC', 'CC', 'BA', 'CH', 'BS', 'AD'].map((v) => ({ name: v, value: v }))],
			},
			str('description2', 'Description 2', 'Secondary description.'),
			str('tax', 'Default Tax', 'Default tax code.'),
			typed('cashflowtype', 'Cash Flow Type', 'Cash flow classification.', 'integer'),
			str('sic', 'SIC', 'SIC code.'),
		],
	},
	{
		resource: 'whtax',
		fields: [
			codeField('WHT-10'),
			descriptionField('WHT 10%'),
			lookup('taxaccountdr', 'Debit Account', 'Withholding tax debit account.', 'account', 'code', { required: true }),
			lookup('taxaccountcr', 'Credit Account', 'Withholding tax credit account.', 'account', 'code', { required: true }),
			typed('taxrate', 'Tax Rate (%)', 'Percentage.', 'number', { example: '10' }),
			bool('isdefault', 'Default', 'Use as default.'),
			bool('isactive', 'Active', 'Whether active.', true),
		],
	},
];
