import { REGISTRY, RegistryEntry } from '../registry.generated';
import type { FieldDef, ResourceSchema } from './types';
import { lookup, str, typed } from './simple';

const PAYMENT = ['customerpayment', 'customerrefund', 'supplierpayment', 'supplierrefund'];
const DEPOSIT = ['customerdeposit', 'supplierdeposit'];
// Detail-line layouts for these are not documented: the UI offers the raw JSON body only.
const RAW_ONLY = ['paymentvoucher', 'receiptvoucher', 'bankadjustment', 'customercontra', 'suppliercontra', 'joborder', 'assembly', 'disassembly'];

const docno = (): FieldDef => str('docno', 'Document No', 'Leave empty to auto-number.');
const docdate = (): FieldDef => typed('docdate', 'Document Date', 'YYYY-MM-DD.', 'date', { required: true });
const postdate = (): FieldDef => typed('postdate', 'Post Date', 'YYYY-MM-DD.', 'date');

const isSupplierSide = (group: string | null): boolean => group === 'ap' || group === 'purchase';

const partyField = (group: string | null): FieldDef =>
	lookup('code', isSupplierSide(group) ? 'Supplier Code' : 'Customer Code', 'Must already exist in SQL Account.', isSupplierSide(group) ? 'supplier' : 'customer', 'code', { required: true });

const itemHeader = (group: string | null): FieldDef[] => [
	docno(), docdate(), postdate(), partyField(group),
	lookup('terms', 'Terms', 'Payment terms code.', 'terms'),
	lookup('currencycode', 'Currency', 'Default "----" (base currency).', 'currency'),
	str('description', 'Description', 'Document description.'),
];

const itemLines = (): FieldDef[] => [
	lookup('itemcode', 'Item Code', 'Existing stock item code.', 'stockitem', 'code', { required: true }),
	str('description', 'Description', 'Line description.'),
	typed('qty', 'Quantity', 'Sent as text.', 'decimal', { required: true, default: '1.00' }),
	str('uom', 'UOM', 'Unit of measure, e.g. UNIT.', { default: 'UNIT' }),
	typed('unitprice', 'Unit Price', 'Sent as text.', 'decimal', { required: true }),
	lookup('tax', 'Tax', 'Tax code.', 'tax'),
	lookup('location', 'Location', 'Location code.', 'location'),
	typed('amount', 'Amount', 'Line amount, sent as text.', 'decimal'),
];

const stockHeader = (): FieldDef[] => [
	docno(), docdate(), postdate(), str('description', 'Description', 'Document description.'),
];

const stockLines = (): FieldDef[] => [
	lookup('itemcode', 'Item Code', 'Existing stock item code.', 'stockitem', 'code', { required: true }),
	lookup('location', 'Location', 'Location code.', 'location'),
	typed('qty', 'Quantity', 'Sent as text.', 'decimal', { required: true, default: '1' }),
	str('uom', 'UOM', 'Unit of measure, e.g. UNIT.', { default: 'UNIT' }),
	typed('unitprice', 'Unit Price', 'Sent as text.', 'decimal'),
];

const journalHeader = (): FieldDef[] => [
	docno(), docdate(), postdate(),
	{
		name: 'journal', label: 'Journal', type: 'enum', description: 'Journal type.', default: 'GENERAL',
		options: ['BANK', 'CASH', 'GENERAL'].map((v) => ({ name: v, value: v })),
	},
	str('description', 'Description', 'Document description.'),
	lookup('currencycode', 'Currency', 'Default "----" (base currency).', 'currency'),
];

const journalLines = (): FieldDef[] => [
	lookup('code', 'Account', 'Account code from the chart of accounts.', 'account', 'code', { required: true }),
	str('description', 'Description', 'Line description.'),
	typed('dr', 'Debit', 'Debit amount, sent as text. Total debits must equal total credits.', 'decimal'),
	typed('cr', 'Credit', 'Credit amount, sent as text.', 'decimal'),
];

const paymentHeader = (group: string | null): FieldDef[] => [
	docno(), partyField(group), docdate(),
	lookup('paymentmethod', 'Payment Method', 'Bank/cash account code from Payment Method.', 'pmmethod', 'code', { required: true }),
	typed('docamt', 'Amount', 'Total amount, sent as text.', 'decimal', { required: true }),
];

const paymentLines = (): FieldDef[] => [
	str('fromdoctype', 'From Document Type', 'Type of document being paid: SI = Sales Invoice, PI = Purchase Invoice.', { required: true, example: 'SI' }),
	str('fromdocno', 'From Document No', 'Number of the document being paid.', { required: true, example: 'SI-00001' }),
	typed('amount', 'Amount', 'Amount applied, sent as text.', 'decimal', { required: true }),
];

const depositHeader = (group: string | null): FieldDef[] => [
	docno(), partyField(group), docdate(),
	lookup('depositaccount', 'Deposit Account', 'Bank account code from Payment Method.', 'pmmethod', 'code', { required: true }),
	typed('docamt', 'Amount', 'Deposit amount, sent as text.', 'decimal'),
];

function build(entry: RegistryEntry): ResourceSchema | null {
	const { resource, group } = entry;
	if (RAW_ONLY.includes(resource)) return null;
	if (resource === 'journalentry') {
		return { resource, createDefaults: { dockey: 0, docno: '' }, fields: journalHeader(), lineFields: journalLines() };
	}
	if (PAYMENT.includes(resource)) {
		return { resource, createDefaults: { docno: '' }, fields: paymentHeader(group), lineFields: paymentLines() };
	}
	if (DEPOSIT.includes(resource)) {
		return { resource, createDefaults: { docno: '' }, fields: depositHeader(group) };
	}
	if (group === 'stock') {
		return { resource, createDefaults: { dockey: 0, docno: '' }, fields: stockHeader(), lineFields: stockLines() };
	}
	return { resource, createDefaults: { dockey: 0, docno: '' }, fields: itemHeader(group), lineFields: itemLines() };
}

export const DOCUMENT_SCHEMAS: ResourceSchema[] = REGISTRY
	.filter((e) => e.kind === 'transactional')
	.map(build)
	.filter((s): s is ResourceSchema => s !== null);
