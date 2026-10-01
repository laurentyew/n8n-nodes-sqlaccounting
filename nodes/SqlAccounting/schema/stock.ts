import type { ResourceSchema } from './types';
import { bool, codeField, descriptionField, lookup, str, typed } from './simple';

export const STOCK_SCHEMAS: ResourceSchema[] = [
	{
		resource: 'stockgroup',
		fields: [
			codeField('SG-01'), descriptionField('Inventory Group A'),
			lookup('sales', 'Sales Account', 'Sales account code.', 'account'),
			lookup('salesreturned', 'Sales Return Account', 'Sales return account code.', 'account'),
			lookup('cashsales', 'Cash Sales Account', 'Cash sales account code.', 'account'),
			lookup('purchase', 'Purchase Account', 'Purchase account code.', 'account'),
			lookup('cashpurchase', 'Cash Purchase Account', 'Cash purchase account code.', 'account'),
			lookup('purchasereturned', 'Purchase Return Account', 'Purchase return account code.', 'account'),
			lookup('balancestock', 'Balance Stock Account', 'Balance stock account code.', 'account'),
			typed('costingmethod', 'Costing Method', 'Integer costing method code. Default 1.', 'integer', { default: 1 }),
			bool('isactive', 'Active', 'Whether active.', true),
		],
	},
	{
		resource: 'stockitem',
		fields: [
			codeField('STK-T'), descriptionField('Test Stock'),
			lookup('stockgroup', 'Stock Group', 'Defaults to "DEFAULT".', 'stockgroup'),
			bool('stockcontrol', 'Stock Control', 'Track quantity.', true),
			typed('costingmethod', 'Costing Method', 'Integer. Default 1.', 'integer', { default: 1 }),
			lookup('sltax', 'Sales Tax', 'Tax code.', 'tax'),
			lookup('phtax', 'Purchase Tax', 'Tax code.', 'tax'),
			lookup('tariff', 'Tariff', 'Tariff code.', 'tariff'),
			str('barcode', 'Barcode', 'Barcode.'),
			typed('refcost', 'Reference Cost', 'Sent as text.', 'decimal'),
			typed('refprice', 'Reference Price', 'Sent as text.', 'decimal'),
		],
	},
	{
		resource: 'batch',
		fields: [
			codeField('BCH-T'), descriptionField('Test Batch'),
			typed('expdate', 'Expiry Date', 'YYYY-MM-DD.', 'date'),
			typed('mfgdate', 'Manufacturing Date', 'YYYY-MM-DD.', 'date'),
			bool('isactive', 'Active', 'Whether active.', true),
		],
	},
];
