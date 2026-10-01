import { ValidationError } from './errors';
import { getOperation } from './registry';

export const PARTY_CODE_GROUPS = ['sales', 'purchase', 'ar', 'ap'];
export const LINES_OPTIONAL = ['customerdeposit', 'supplierdeposit'];
export const PAYMENT_METHOD_RESOURCES = ['customerpayment', 'customerrefund', 'supplierpayment', 'supplierrefund'];
export const DEPOSIT_RESOURCES = ['customerdeposit', 'supplierdeposit'];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isBlank = (v: unknown): boolean => v === undefined || v === null || String(v).trim() === '';
const cents = (v: unknown): number => Math.round(Number(v) * 100);

function checkJournal(lines: Record<string, unknown>[], issues: string[]): void {
	let debit = 0;
	let credit = 0;
	lines.forEach((line, i) => {
		const n = i + 1;
		if (isBlank(line.code)) issues.push(`Line ${n}: account code is required.`);
		for (const side of ['dr', 'cr'] as const) {
			if (Number.isNaN(Number(line[side] ?? 0))) issues.push(`Line ${n}: ${side} must be a number.`);
		}
		debit += cents(line.dr ?? 0);
		credit += cents(line.cr ?? 0);
	});
	if (debit !== credit) {
		issues.push(
			`Journal is unbalanced: total debits ${(debit / 100).toFixed(2)} must equal total credits ${(credit / 100).toFixed(2)}.`,
		);
	}
}

function checkCreate(resource: string, body: Record<string, unknown>, issues: string[]): void {
	const lines = body.sdsdocdetail;
	const group = getOperation(`${resource}.create`).group;
	if (group && PARTY_CODE_GROUPS.includes(group) && isBlank(body.code)) {
		issues.push('code (customer/supplier code) is required.');
	}
	if (!LINES_OPTIONAL.includes(resource) && (!Array.isArray(lines) || lines.length === 0)) {
		issues.push('At least one line in sdsdocdetail is required.');
	}
	if (PAYMENT_METHOD_RESOURCES.includes(resource) && isBlank(body.paymentmethod)) {
		issues.push('paymentmethod (bank/cash account code) is required.');
	}
	if (DEPOSIT_RESOURCES.includes(resource) && isBlank(body.depositaccount)) {
		issues.push('depositaccount (bank account code) is required.');
	}
	if (resource === 'journalentry' && Array.isArray(lines) && lines.length > 0) {
		checkJournal(lines as Record<string, unknown>[], issues);
	}
}

export function validateDocument(
	resource: string,
	body: Record<string, unknown>,
	mode: 'create' | 'update',
): string[] {
	if (Object.keys(body).length === 0) {
		return ['Request body is empty; the SQL Account API crashes on an empty body.'];
	}
	const issues: string[] = [];
	for (const key of ['docdate', 'postdate']) {
		if (!isBlank(body[key]) && !DATE.test(String(body[key]))) issues.push(`${key} must be YYYY-MM-DD.`);
	}
	if (body.sdsdocdetail !== undefined && !Array.isArray(body.sdsdocdetail)) {
		issues.push('sdsdocdetail must be an array of line objects.');
	}
	if (mode === 'create') checkCreate(resource, body, issues);
	return issues;
}

export function assertValidDocument(resource: string, body: Record<string, unknown>, mode: 'create' | 'update'): void {
	const issues = validateDocument(resource, body, mode);
	if (issues.length > 0) throw new ValidationError(issues);
}
