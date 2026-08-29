import { pool } from './client.js';

const MAX_ROWS = 200;
const WRITE_PATTERN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|execute|do|comment|security|set\s+role|load|import)\b/i;

export type SqlQueryResult = { rows: Record<string, unknown>[]; rowCount: number };

export function assertReadOnlySelect(sql: string): string {
  const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ').trim();
  if (!stripped) throw new Error('SQL query is empty');
  if (stripped.replace(/;\s*$/, '').includes(';')) throw new Error('Only a single SELECT statement is allowed');
  const normalized = stripped.replace(/;\s*$/, '').trim();
  if (!/^(select|with)\b/i.test(normalized)) throw new Error('Only read-only SELECT queries are allowed');
  if (WRITE_PATTERN.test(normalized)) throw new Error('Write or administrative SQL is not allowed');
  return normalized;
}

export async function executeReadOnlySql(sql: string): Promise<SqlQueryResult> {
  const safe = assertReadOnlySelect(sql);
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '8000'");
    const result = await client.query(safe);
    await client.query('COMMIT');
    const rows = (result.rows as Record<string, unknown>[]).slice(0, MAX_ROWS);
    return { rows, rowCount: rows.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
