import type { Company } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { db } from '../client.js';
import { companies as companiesTable } from '../schema.js';

const companies: Company[] = [];
export function listCompanies(): Company[] { return [...companies].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)); }
export function createCompany(input: { name: string; ticker: string | null }): Company {
  const company = { id: randomUUID(), name: input.name, ticker: input.ticker, displayOrder: companies.length, createdAt: new Date().toISOString() };
  companies.push(company); return company;
}
export function resetCompanies(): void { companies.length = 0; }

export function databaseEnabled(): boolean { return Boolean(process.env.DATABASE_URL); }
function fromRow(row: typeof companiesTable.$inferSelect): Company { return { id: row.id, name: row.name, ticker: row.ticker, displayOrder: row.displayOrder, createdAt: row.createdAt.toISOString() }; }
export async function listCompaniesPersisted(): Promise<Company[]> { return (await db.select().from(companiesTable).orderBy(asc(companiesTable.displayOrder), asc(companiesTable.name))).map(fromRow); }
export async function getCompanyPersisted(id: string): Promise<Company | undefined> { const [row] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1); return row ? fromRow(row) : undefined; }
export async function createCompanyPersisted(input: { name: string; ticker: string | null }): Promise<Company> { const [row] = await db.insert(companiesTable).values({ name: input.name, ticker: input.ticker, displayOrder: (await listCompaniesPersisted()).length }).returning(); return fromRow(row); }
