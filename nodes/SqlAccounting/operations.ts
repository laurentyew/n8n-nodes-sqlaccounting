/**
 * operations.ts
 * Static operation definitions for all 81 SQL Accounting endpoints.
 * Maps exactly to the operations table seeded in Supabase.
 *
 * body_mode:
 *   'none'     → GET / DELETE  (no body, no guided fields)
 *   'guided'   → master data writes (flat guided fields shown in UI)
 *   'raw_json' → transactional writes (raw JSON body editor)
 */

export interface OperationDef {
	key: string;
	name: string;
	value: string;
	description: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	path: string;
	pathParam: 'CODE' | 'DOCKEY' | 'AUTOKEY' | null;
	bodyMode: 'none' | 'guided' | 'raw_json';
	docType: 'master' | 'transactional' | 'report';
}

export interface ResourceDef {
	name: string;
	value: string;
	operations: OperationDef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function masterOps(
	resource: string,
	path: string,
	pathParam: 'CODE' | 'AUTOKEY' = 'CODE',
): OperationDef[] {
	return [
		{ key: `${resource}.list`,   name: 'List',   value: `${resource}.list`,   description: `List ${resource} records`,               method: 'GET',    path, pathParam: null, bodyMode: 'none',   docType: 'master' },
		{ key: `${resource}.get`,    name: 'Get',    value: `${resource}.get`,    description: `Get a single ${resource} by ${pathParam}`, method: 'GET',    path, pathParam,      bodyMode: 'none',   docType: 'master' },
		{ key: `${resource}.create`, name: 'Create', value: `${resource}.create`, description: `Create a new ${resource}`,               method: 'POST',   path, pathParam: null, bodyMode: 'guided', docType: 'master' },
		{ key: `${resource}.update`, name: 'Update', value: `${resource}.update`, description: `Update an existing ${resource}`,         method: 'PUT',    path, pathParam,      bodyMode: 'guided', docType: 'master' },
		{ key: `${resource}.delete`, name: 'Delete', value: `${resource}.delete`, description: `Delete a ${resource} record`,            method: 'DELETE', path, pathParam,      bodyMode: 'none',   docType: 'master' },
	];
}

function masterOpsNoGet(
	resource: string,
	path: string,
	pathParam: 'CODE' | 'AUTOKEY' = 'CODE',
): OperationDef[] {
	return [
		{ key: `${resource}.list`,   name: 'List',   value: `${resource}.list`,   description: `List ${resource} records`,   method: 'GET',    path, pathParam: null, bodyMode: 'none',   docType: 'master' },
		{ key: `${resource}.create`, name: 'Create', value: `${resource}.create`, description: `Create a new ${resource}`,   method: 'POST',   path, pathParam: null, bodyMode: 'guided', docType: 'master' },
		{ key: `${resource}.update`, name: 'Update', value: `${resource}.update`, description: `Update a ${resource}`,       method: 'PUT',    path, pathParam,      bodyMode: 'guided', docType: 'master' },
		{ key: `${resource}.delete`, name: 'Delete', value: `${resource}.delete`, description: `Delete a ${resource} record`, method: 'DELETE', path, pathParam,     bodyMode: 'none',   docType: 'master' },
	];
}

function txOps(
	resource: string,
	path: string,
	pathParam: 'DOCKEY' | 'CODE' = 'DOCKEY',
): OperationDef[] {
	return [
		{ key: `${resource}.list`,   name: 'List',   value: `${resource}.list`,   description: `List ${resource} documents`,      method: 'GET',    path, pathParam: null, bodyMode: 'none',     docType: 'transactional' },
		{ key: `${resource}.get`,    name: 'Get',    value: `${resource}.get`,    description: `Get a single ${resource}`,        method: 'GET',    path, pathParam,      bodyMode: 'none',     docType: 'transactional' },
		{ key: `${resource}.create`, name: 'Create', value: `${resource}.create`, description: `Create a ${resource} document`,   method: 'POST',   path, pathParam: null, bodyMode: 'raw_json', docType: 'transactional' },
		{ key: `${resource}.update`, name: 'Update', value: `${resource}.update`, description: `Update a ${resource} document`,   method: 'PUT',    path, pathParam,      bodyMode: 'raw_json', docType: 'transactional' },
		{ key: `${resource}.delete`, name: 'Delete', value: `${resource}.delete`, description: `Delete a ${resource} document`,  method: 'DELETE', path, pathParam,      bodyMode: 'none',     docType: 'transactional' },
	];
}

function hybridOps(resource: string, path: string): OperationDef[] {
	return [
		{ key: `${resource}.list`,   name: 'List',   value: `${resource}.list`,   description: `List ${resource} records`,    method: 'GET',    path, pathParam: null,   bodyMode: 'none',   docType: 'transactional' },
		{ key: `${resource}.get`,    name: 'Get',    value: `${resource}.get`,    description: `Get a single ${resource}`,   method: 'GET',    path, pathParam: 'CODE', bodyMode: 'none',   docType: 'transactional' },
		{ key: `${resource}.create`, name: 'Create', value: `${resource}.create`, description: `Create a ${resource}`,      method: 'POST',   path, pathParam: null,   bodyMode: 'guided', docType: 'transactional' },
		{ key: `${resource}.update`, name: 'Update', value: `${resource}.update`, description: `Update a ${resource}`,      method: 'PUT',    path, pathParam: 'CODE', bodyMode: 'guided', docType: 'transactional' },
		{ key: `${resource}.delete`, name: 'Delete', value: `${resource}.delete`, description: `Delete a ${resource}`,      method: 'DELETE', path, pathParam: 'CODE', bodyMode: 'none',   docType: 'transactional' },
	];
}

function reportOp(resource: string, path: string): OperationDef[] {
	return [
		{ key: `${resource}.get`, name: 'Get', value: `${resource}.get`, description: `Get ${resource} report data`, method: 'GET', path, pathParam: null, bodyMode: 'none', docType: 'report' },
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL 81 ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const RESOURCES: ResourceDef[] = [
	// ── MASTER DATA (20) ──────────────────────────────────────────────────────
	{ name: 'Account',          value: 'account',         operations: masterOps('account', '/account') },
	{ name: 'Agent',            value: 'agent',           operations: masterOps('agent', '/agent') },
	{ name: 'Area',             value: 'area',            operations: masterOps('area', '/area') },
	{ name: 'Asset Disposal',   value: 'assetdisposal',   operations: masterOps('assetdisposal', '/assetdisposal') },
	{ name: 'Asset Group',      value: 'assetgroup',      operations: masterOps('assetgroup', '/assetgroup') },
	{ name: 'Asset Item',       value: 'assetitem',       operations: masterOps('assetitem', '/assetitem') },
	{ name: 'Stock Batch',      value: 'batch',           operations: masterOps('batch', '/batch', 'AUTOKEY') },
	{ name: 'Company Category', value: 'companycategory', operations: masterOpsNoGet('companycategory', '/companycategory') },
	{ name: 'Location',         value: 'location',        operations: masterOps('location', '/location') },
	{ name: 'Member Point',     value: 'memberpoint',     operations: masterOps('memberpoint', '/memberpoint') },
	{ name: 'Payment Method',   value: 'pmmethod',        operations: masterOps('pmmethod', '/pmmethod') },
	{ name: 'Price Tag',        value: 'pricetag',        operations: masterOps('pricetag', '/pricetag') },
	{ name: 'Project',          value: 'project',         operations: masterOps('project', '/project') },
	{ name: 'Shipper',          value: 'shipper',         operations: masterOps('shipper', '/shipper') },
	{ name: 'Stock Category',   value: 'stockcategory',   operations: masterOpsNoGet('stockcategory', '/stockcategory') },
	{ name: 'Stock Group',      value: 'stockgroup',      operations: masterOpsNoGet('stockgroup', '/stockgroup') },
	{ name: 'Tariff',           value: 'tariff',          operations: masterOpsNoGet('tariff', '/tariff', 'AUTOKEY') },
	{ name: 'Tax',              value: 'tax',             operations: masterOpsNoGet('tax', '/tax', 'AUTOKEY') },
	{ name: 'Terms',            value: 'terms',           operations: masterOpsNoGet('terms', '/terms') },
	{ name: 'Withholding Tax',  value: 'whtax',           operations: masterOpsNoGet('whtax', '/whtax', 'AUTOKEY') },

	// ── SALES (9) ─────────────────────────────────────────────────────────────
	{ name: 'Sales Invoice',        value: 'salesinvoice',       operations: txOps('salesinvoice', '/salesinvoice') },
	{ name: 'Sales Order',          value: 'salesorder',         operations: txOps('salesorder', '/salesorder') },
	{ name: 'Sales Quotation',      value: 'salesquotation',     operations: txOps('salesquotation', '/salesquotation') },
	{ name: 'Sales Credit Note',    value: 'salescreditnote',    operations: txOps('salescreditnote', '/salescreditnote') },
	{ name: 'Sales Debit Note',     value: 'salesdebitnote',     operations: txOps('salesdebitnote', '/salesdebitnote') },
	{ name: 'Sales Cancelled Note', value: 'salescancellednote', operations: txOps('salescancellednote', '/salescancellednote') },
	{ name: 'Cash Sales',           value: 'cashsales',          operations: txOps('cashsales', '/cashsales') },
	{ name: 'Delivery Order',       value: 'deliveryorder',      operations: txOps('deliveryorder', '/deliveryorder') },
	{ name: 'Extra Delivery Order', value: 'extradeliveryorder', operations: txOps('extradeliveryorder', '/extradeliveryorder') },

	// ── PURCHASE (9) ──────────────────────────────────────────────────────────
	{ name: 'Purchase Invoice',         value: 'purchaseinvoice',       operations: txOps('purchaseinvoice', '/purchaseinvoice') },
	{ name: 'Purchase Order',           value: 'purchaseorder',         operations: txOps('purchaseorder', '/purchaseorder') },
	{ name: 'Purchase Request',         value: 'purchaserequest',       operations: txOps('purchaserequest', '/purchaserequest') },
	{ name: 'Purchase Return',          value: 'purchasereturned',      operations: txOps('purchasereturned', '/purchasereturned') },
	{ name: 'Purchase Debit Note',      value: 'purchasedebitnote',     operations: txOps('purchasedebitnote', '/purchasedebitnote') },
	{ name: 'Purchase Cancelled Note',  value: 'purchasecancellednote', operations: txOps('purchasecancellednote', '/purchasecancellednote') },
	{ name: 'Cash Purchase',            value: 'cashpurchase',          operations: txOps('cashpurchase', '/cashpurchase') },
	{ name: 'Goods Received',           value: 'goodsreceived',         operations: txOps('goodsreceived', '/goodsreceived') },
	{ name: 'Extra Goods Received',     value: 'extragoodsreceived',    operations: txOps('extragoodsreceived', '/extragoodsreceived') },

	// ── AR (8) ────────────────────────────────────────────────────────────────
	{ name: 'Customer',             value: 'customer',          operations: hybridOps('customer', '/customer') },
	{ name: 'Customer Invoice',     value: 'customerinvoice',   operations: txOps('customerinvoice', '/customerinvoice') },
	{ name: 'Customer Credit Note', value: 'customercreditnote',operations: txOps('customercreditnote', '/customercreditnote') },
	{ name: 'Customer Debit Note',  value: 'customerdebitnote', operations: txOps('customerdebitnote', '/customerdebitnote') },
	{ name: 'Customer Payment',     value: 'customerpayment',   operations: txOps('customerpayment', '/customerpayment') },
	{ name: 'Customer Deposit',     value: 'customerdeposit',   operations: txOps('customerdeposit', '/customerdeposit') },
	{ name: 'Customer Refund',      value: 'customerrefund',    operations: txOps('customerrefund', '/customerrefund') },
	{ name: 'Customer Contra',      value: 'customercontra',    operations: txOps('customercontra', '/customercontra') },

	// ── AP (8) ────────────────────────────────────────────────────────────────
	{ name: 'Supplier',             value: 'supplier',          operations: hybridOps('supplier', '/supplier') },
	{ name: 'Supplier Invoice',     value: 'supplierinvoice',   operations: txOps('supplierinvoice', '/supplierinvoice') },
	{ name: 'Supplier Credit Note', value: 'suppliercreditnote',operations: txOps('suppliercreditnote', '/suppliercreditnote') },
	{ name: 'Supplier Debit Note',  value: 'supplierdebitnote', operations: txOps('supplierdebitnote', '/supplierdebitnote') },
	{ name: 'Supplier Payment',     value: 'supplierpayment',   operations: txOps('supplierpayment', '/supplierpayment') },
	{ name: 'Supplier Deposit',     value: 'supplierdeposit',   operations: txOps('supplierdeposit', '/supplierdeposit') },
	{ name: 'Supplier Refund',      value: 'supplierrefund',    operations: txOps('supplierrefund', '/supplierrefund') },
	{ name: 'Supplier Contra',      value: 'suppliercontra',    operations: txOps('suppliercontra', '/suppliercontra') },

	// ── GL / STOCK / MFG (14) ─────────────────────────────────────────────────
	{ name: 'Journal Entry',    value: 'journalentry',    operations: txOps('journalentry', '/journalentry') },
	{ name: 'Payment Voucher',  value: 'paymentvoucher',  operations: txOps('paymentvoucher', '/paymentvoucher') },
	{ name: 'Receipt Voucher',  value: 'receiptvoucher',  operations: txOps('receiptvoucher', '/receiptvoucher') },
	{ name: 'Bank Adjustment',  value: 'bankadjustment',  operations: txOps('bankadjustment', '/bankadjustment') },
	{ name: 'Stock Item',       value: 'stockitem',       operations: txOps('stockitem', '/stockitem') },
	{ name: 'Stock Adjustment', value: 'stockadjustment', operations: txOps('stockadjustment', '/stockadjustment') },
	{ name: 'Stock Issue',      value: 'stockissue',      operations: txOps('stockissue', '/stockissue') },
	{ name: 'Stock Received',   value: 'stockreceived',   operations: txOps('stockreceived', '/stockreceived') },
	{ name: 'Stock Transfer',   value: 'stocktransfer',   operations: txOps('stocktransfer', '/stocktransfer') },
	{ name: 'Assembly',         value: 'assembly',        operations: txOps('assembly', '/assembly') },
	{ name: 'Disassembly',      value: 'disassembly',     operations: txOps('disassembly', '/disassembly') },
	{ name: 'Job Order',        value: 'joborder',        operations: txOps('joborder', '/joborder') },
	{ name: 'Item Template',    value: 'itemtemplate',    operations: txOps('itemtemplate', '/itemtemplate') },
	{ name: 'Currency',         value: 'currency',        operations: hybridOps('currency', '/currency') },

	// ── REPORTS (13) ─────────────────────────────────────────────────────────
	{ name: 'Company Profile',             value: 'profile',                     operations: reportOp('profile', '/profile') },
	{ name: 'App Version',                 value: 'version',                     operations: reportOp('version', '/version') },
	{ name: 'Stock Aging',                 value: 'stockaging',                  operations: reportOp('stockaging', '/stockaging') },
	{ name: 'Stock Analysis',              value: 'stockanalysis',               operations: reportOp('stockanalysis', '/stockanalysis') },
	{ name: 'Stock Balance Inquiry',       value: 'stockbalanceinquiry',         operations: reportOp('stockbalanceinquiry', '/stockbalanceinquiry') },
	{ name: 'Stock Batch Expiry',          value: 'stockbatchexpiry',            operations: reportOp('stockbatchexpiry', '/stockbatchexpiry') },
	{ name: 'Stock Card',                  value: 'stockcard',                   operations: reportOp('stockcard', '/stockcard') },
	{ name: 'Stock Card Qty',              value: 'stockcardqty',                operations: reportOp('stockcardqty', '/stockcardqty') },
	{ name: 'Stock Month End Balance',     value: 'stockmonthendbalance',        operations: reportOp('stockmonthendbalance', '/stockmonthendbalance') },
	{ name: 'Stock Physical Worksheet',    value: 'stockphysicalworksheet',      operations: reportOp('stockphysicalworksheet', '/stockphysicalworksheet') },
	{ name: 'Stock Reorder Advice',        value: 'stockreorderadvice',          operations: reportOp('stockreorderadvice', '/stockreorderadvice') },
	{ name: 'Stock Serial No Conflict',    value: 'stockserialnumberconflict',   operations: reportOp('stockserialnumberconflict', '/stockserialnumberconflict') },
	{ name: 'Stock Serial No Outstanding', value: 'stockserialnumberoutstanding',operations: reportOp('stockserialnumberoutstanding', '/stockserialnumberoutstanding') },
];

// Flat lookup map: operation_key → OperationDef
export const OPERATION_MAP: Record<string, OperationDef> = {};
for (const resource of RESOURCES) {
	for (const op of resource.operations) {
		OPERATION_MAP[op.key] = op;
	}
}

// Keys for operations that need a path param (used for displayOptions)
export const OPS_WITH_PATH_PARAM = Object.values(OPERATION_MAP)
	.filter((op) => op.pathParam !== null)
	.map((op) => op.key);

// Keys for list operations (GET, no path param, not report)
export const OPS_LIST = Object.values(OPERATION_MAP)
	.filter((op) => op.pathParam === null && op.method === 'GET' && op.docType !== 'report')
	.map((op) => op.key);

// Keys for all GET operations with no path param (list + reports)
export const OPS_GET_NO_PARAM = Object.values(OPERATION_MAP)
	.filter((op) => op.pathParam === null && op.method === 'GET')
	.map((op) => op.key);

// Keys for raw_json body operations
export const OPS_RAW_JSON = Object.values(OPERATION_MAP)
	.filter((op) => op.bodyMode === 'raw_json')
	.map((op) => op.key);

// Keys for guided body operations
export const OPS_GUIDED = Object.values(OPERATION_MAP)
	.filter((op) => op.bodyMode === 'guided')
	.map((op) => op.key);
