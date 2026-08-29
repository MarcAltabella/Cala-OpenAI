import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
const connectionString = process.env.DATABASE_URL ?? 'postgresql://cala:cala@localhost:5432/cala';
const isLocalDatabase = /^(postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1|\[::1\]))/i.test(connectionString);
export const pool = new Pool({ connectionString, ssl: isLocalDatabase ? false : { rejectUnauthorized: true } });
export const db = drizzle(pool);
export async function migrate(): Promise<void> { await runMigrations(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname }); }
if (process.argv[2] === 'migrate') migrate().then(() => pool.end());
