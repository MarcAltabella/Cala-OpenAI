import type { CalaFinanceSnapshot, CalaHealthcareSnapshot } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const healthcare: CalaHealthcareSnapshot[] = []; const finance: CalaFinanceSnapshot[] = [];
export const insertCalaHealthcareSnapshot = (companyId: string, snapshot: unknown): CalaHealthcareSnapshot => { const row = { id: randomUUID(), companyId, snapshot, capturedAt: new Date().toISOString() }; healthcare.push(row); return row; };
export const insertCalaFinanceSnapshot = (companyId: string, snapshot: unknown): CalaFinanceSnapshot => { const row = { id: randomUUID(), companyId, snapshot, capturedAt: new Date().toISOString() }; finance.push(row); return row; };
export const listHealthcareSnapshots = (companyId: string) => healthcare.filter(row => row.companyId === companyId);
export const listFinanceSnapshots = (companyId: string) => finance.filter(row => row.companyId === companyId);
