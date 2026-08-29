import type { Development } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const developments: Development[] = [];
export function insertDevelopment(input: Omit<Development, 'id' | 'createdAt'>): Development { const development = { id: randomUUID(), createdAt: new Date().toISOString(), ...input }; developments.push(development); return development; }
export function listDevelopments(companyId: string): Development[] { return developments.filter(development => development.companyId === companyId); }
