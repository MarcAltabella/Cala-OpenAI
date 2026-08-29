import type { FinanceImpact } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const impacts: FinanceImpact[] = [];
export function insertFinanceImpact(input: Omit<FinanceImpact, 'id'>): FinanceImpact { const impact = { id: randomUUID(), ...input }; impacts.push(impact); return impact; }
export function listFinanceImpacts(): FinanceImpact[] { return [...impacts]; }
