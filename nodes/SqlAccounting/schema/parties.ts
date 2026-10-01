import type { FieldDef, ResourceSchema } from './types';
import { bool, codeField, descriptionField, lookup, str, typed } from './simple';

const partyFields = (controlDefault: string, example: string, name: string): FieldDef[] => [
	codeField(example),
	str('companyname', 'Company Name', `${name} business name. The API field is companyname (not company).`, { required: true, example: 'Test Sdn Bhd', filterable: true }),
	lookup('controlaccount', 'Control Account', `Default ${controlDefault}.`, 'account'),
	lookup('companycategory', 'Company Category', 'Category code.', 'companycategory'),
	lookup('area', 'Area', 'Area code.', 'area'),
	lookup('agent', 'Agent', 'Agent code.', 'agent'),
	lookup('creditterm', 'Credit Term', 'Payment terms code. Default "30 Days".', 'terms'),
	lookup('currencycode', 'Currency', 'Currency code. Default "----" (base).', 'currency'),
	lookup('pricetag', 'Price Tag', 'Price level code.', 'pricetag'),
	lookup('tax', 'Tax', 'Default tax code.', 'tax'),
	typed('creditlimit', 'Credit Limit', 'Sent as text. Default 30000.', 'decimal', { example: '30000' }),
	typed('creationdate', 'Creation Date', 'YYYY-MM-DD. Default today.', 'date'),
];

export const PARTY_SCHEMAS: ResourceSchema[] = [
	{ resource: 'customer', fields: partyFields('300-000 (Trade Debtors)', 'CUS-01', 'Customer') },
	{ resource: 'supplier', fields: partyFields('400-000 (Trade Creditors)', 'SUP-01', 'Supplier') },
	{
		resource: 'location',
		fields: [
			codeField('WH-MAIN'), descriptionField('Main Warehouse'),
			str('description2', 'Description 2', 'Secondary description.'),
			str('address1', 'Address 1', 'Street address line.'), str('address2', 'Address 2', 'Street address line.'),
			str('address3', 'Address 3', 'Street address line.'), str('address4', 'Address 4', 'Street address line.'),
			str('postcode', 'Postcode', 'Postcode.'), str('city', 'City', 'City.', { example: 'Kuala Lumpur' }),
			str('state', 'State', 'State or province.'), str('country', 'Country', 'Country code or name.'),
			str('attention', 'Attention', 'Contact person.'),
			str('phone1', 'Phone 1', 'Primary phone.', { example: '03-12345678' }), str('phone2', 'Phone 2', 'Secondary phone.'),
			str('fax1', 'Fax 1', 'Fax number.'), str('fax2', 'Fax 2', 'Fax number.'), str('email', 'Email', 'Email address.'),
			lookup('project', 'Project', 'Project code.', 'project'),
			bool('isactive', 'Active', 'Whether active.', true),
			str('note', 'Note', 'Additional notes.'),
		],
	},
	{
		resource: 'project',
		fields: [
			codeField('PROJ-01'), descriptionField('General Project'),
			str('description2', 'Description 2', 'Secondary description.'),
			typed('projectvalue', 'Project Value', 'Budget/value.', 'number', { example: '100000' }),
			typed('projectcost', 'Project Cost', 'Cost amount.', 'number'),
			bool('isactive', 'Active', 'Whether active.', true),
		],
	},
	{
		resource: 'shipper',
		fields: [
			codeField('SHIP-01'), descriptionField('Courier Express'),
			str('address1', 'Address 1', 'Address line.'), str('address2', 'Address 2', 'Address line.'),
			str('address3', 'Address 3', 'Address line.'), str('address4', 'Address 4', 'Address line.'),
			str('postcode', 'Postcode', 'Postcode.'), str('city', 'City', 'City.'),
			str('state', 'State', 'State.'), str('country', 'Country', 'Country.'),
			str('phone1', 'Phone 1', 'Phone number.'), str('phone2', 'Phone 2', 'Phone number.'),
			str('account', 'Courier Account No.', 'Courier account number.'),
			str('remark1', 'Remark 1', 'Remark.'), str('remark2', 'Remark 2', 'Remark.'),
			bool('isdefault', 'Default', 'Use as default.'), bool('isactive', 'Active', 'Whether active.', true),
		],
	},
];
