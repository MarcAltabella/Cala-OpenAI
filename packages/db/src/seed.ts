import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { companies } from './schema.js';

export const WATCHLIST = [
  ['Moderna', 'MRNA'],
  ['BioNTech', 'BNTX'],
  ['Regeneron Pharmaceuticals', 'REGN'],
  ['Vertex Pharmaceuticals', 'VRTX'],
  ['Gilead Sciences', 'GILD'],
  ['Amgen', 'AMGN'],
  ['Alnylam Pharmaceuticals', 'ALNY'],
  ['Illumina', 'ILMN'],
  ['CRISPR Therapeutics', 'CRSP'],
  ['Sana Biotechnology', 'SANA'],
  ['Pfizer', 'PFE'],
  ['Johnson & Johnson', 'JNJ'],
  ['Eli Lilly', 'LLY'],
  ['AbbVie', 'ABBV'],
  ['Merck', 'MRK'],
  ['Bristol Myers Squibb', 'BMY'],
  ['Roche', 'RHHBY'],
  ['Novartis', 'NVS'],
  ['AstraZeneca', 'AZN'],
  ['Guardant Health', 'GH'],
] as const;

function recencyFor(index: number): 'mid' | 'high' {
  return index % 2 === 0 ? 'high' : 'mid';
}

export async function seedCompanies(): Promise<number> {
  for (const [index, [name, ticker]] of WATCHLIST.entries()) {
    const [byTicker] = await db.select().from(companies).where(eq(companies.ticker, ticker)).limit(1);
    if (byTicker) {
      await db.update(companies).set({ recency: recencyFor(index), displayOrder: index }).where(eq(companies.id, byTicker.id));
      continue;
    }
    const [byName] = await db.select().from(companies).where(eq(companies.name, name)).limit(1);
    if (byName) {
      await db.update(companies).set({ recency: recencyFor(index), displayOrder: index, ticker }).where(eq(companies.id, byName.id));
      continue;
    }
    await db.insert(companies).values({ name, ticker, displayOrder: index, recency: recencyFor(index) });
  }
  const rows = await db.select().from(companies);
  for (const row of rows) {
    if (row.recency !== 'mid' && row.recency !== 'high') {
      await db.update(companies).set({ recency: recencyFor(row.displayOrder) }).where(eq(companies.id, row.id));
    }
  }
  return rows.length;
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedCompanies()
    .then(async (count) => {
      console.log(`seeded ${count} companies`);
      const { pool } = await import('./client.js');
      await pool.end();
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
