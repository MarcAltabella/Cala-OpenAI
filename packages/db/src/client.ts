import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://cala:cala@localhost:15432/cala',
});
export const db = drizzle(pool);
export function databaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
export async function migrate(): Promise<void> {
  await runMigrations(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
}
if (process.argv[2] === 'migrate') {
  migrate().then(() => pool.end());
}
