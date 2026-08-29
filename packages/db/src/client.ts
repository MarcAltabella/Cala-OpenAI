import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://cala:cala@localhost:5432/cala' });
export const db = drizzle(pool);
export async function migrate(): Promise<void> { await runMigrations(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname }); }
if (process.argv[2] === 'migrate') migrate().then(() => pool.end());
