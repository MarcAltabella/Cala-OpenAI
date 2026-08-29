import { Pool } from 'pg';
import { schemaStatements } from './schema.js';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://cala:cala@localhost:5432/cala' });
export async function migrate(): Promise<void> { for (const statement of schemaStatements) await pool.query(statement); }
if (process.argv[2] === 'migrate') migrate().then(() => pool.end());
