import type { Company } from '@cala/contracts';
import { randomUUID } from 'node:crypto';

const companies: Company[] = [];
export function listCompanies(): Company[] { return [...companies].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)); }
export function createCompany(input: { name: string; ticker: string | null }): Company {
  const company = { id: randomUUID(), name: input.name, ticker: input.ticker, displayOrder: companies.length, createdAt: new Date().toISOString() };
  companies.push(company); return company;
}
export function resetCompanies(): void { companies.length = 0; }
