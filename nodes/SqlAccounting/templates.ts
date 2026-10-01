import { getOperation } from './registry';

type Doc = Record<string, unknown>;

const itemLine = { dtlkey: 0, itemcode: '', qty: '1.00', unitprice: '0.00', uom: 'UNIT' };

const header = (today: string, extra: Doc = {}): Doc => ({
	dockey: 0, docno: '', docdate: today, code: '', terms: '30 Days', currencycode: '----', ...extra,
});

const PAYMENTS = ['customerpayment', 'customerrefund', 'supplierpayment', 'supplierrefund'];
const DEPOSITS = ['customerdeposit', 'supplierdeposit'];
const INVOICE_LIKE = ['salesinvoice', 'customercreditnote', 'customerdebitnote'];

export function templateFor(resource: string, today: string): string {
	const group = getOperation(`${resource}.create`).group;
	let doc: Doc;

	if (resource === 'journalentry') {
		doc = {
			dockey: 0, docno: '', docdate: today, postdate: today, journal: 'GENERAL', description: '', currencycode: '----',
			sdsdocdetail: [
				{ dtlkey: 0, code: '', description: 'Debit', dr: '0.00', cr: '0.00' },
				{ dtlkey: 0, code: '', description: 'Credit', dr: '0.00', cr: '0.00' },
			],
		};
	} else if (PAYMENTS.includes(resource)) {
		doc = {
			docno: '', docdate: today, code: '', paymentmethod: '', docamt: '0.00',
			sdsdocdetail: [{ dtlkey: 0, fromdoctype: '', fromdocno: '', amount: '0.00' }],
		};
	} else if (DEPOSITS.includes(resource)) {
		doc = { docno: '', docdate: today, code: '', depositaccount: '', docamt: '0.00' };
	} else if (group === 'stock') {
		doc = {
			dockey: 0, docno: '', docdate: today, postdate: today, description: '', cancelled: false,
			sdsdocdetail: [{ dtlkey: 0, itemcode: '', location: '', qty: '1', uom: 'UNIT', unitprice: '0.00' }],
		};
	} else if (INVOICE_LIKE.includes(resource)) {
		doc = {
			...header(today, { postdate: today, docamt: '0.00', cancelled: false }),
			sdsdocdetail: [{ ...itemLine, tax: '', amount: '0.00' }],
		};
	} else {
		doc = { ...header(today), sdsdocdetail: [{ ...itemLine }] };
	}
	return JSON.stringify(doc, null, 2);
}
