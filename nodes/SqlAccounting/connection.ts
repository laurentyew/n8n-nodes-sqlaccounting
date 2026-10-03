import { NodeConnectionTypes } from 'n8n-workflow';

// Older n8n releases do not export NodeConnectionTypes; fall back to the literal they used.
export const MAIN_CONNECTION = NodeConnectionTypes?.Main ?? 'main';
