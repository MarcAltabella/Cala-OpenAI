import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value;
  }
}
loadDotEnv();

import { defaultDeps, runIntelligenceWorkflow } from '@cala/agents';
import { createRepositoriesFromEnv, migrate, pool, seedCompanies } from '@cala/db';

async function main(): Promise<void> {
  await migrate();
  const companyCount = await seedCompanies();
  const deps = defaultDeps();
  const repos = createRepositoriesFromEnv();
  const companies = await repos.companies.list();
  console.log(`Watchlist: ${companyCount} companies. Ingesting live sources sequentially...\n`);

  for (const company of companies) {
    const run = await repos.runs.create({ companyId: company.id, mode: 'seed' });
    console.log(`--- ${company.name} (${company.ticker ?? 'n/a'}) run ${run.id}`);
    try {
      const state = await runIntelligenceWorkflow(run.id, deps);
      const neighborhood = await deps.graph.neighborhood({ companyId: company.id });
      console.log(
        `    documents=${state.documentIds.length} entities=${state.entityIds.length} edges=${neighborhood.edges.length} errors=${state.errors.length ? state.errors.join('; ') : 'none'}`,
      );
    } catch (error) {
      console.error(`    failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const documents = await Promise.all(companies.map((c) => repos.documents.listByCompany(c.id)));
  const docCount = documents.reduce((n, list) => n + list.length, 0);
  const moderna = companies.find((c) => c.ticker === 'MRNA');
  const modernaNeighborhood = moderna ? await deps.graph.neighborhood({ companyId: moderna.id }) : { nodes: [], edges: [] };
  console.log(`\nPostgres documents: ${docCount}`);
  console.log(`Moderna graph nodes/edges: ${modernaNeighborhood.nodes.length}/${modernaNeighborhood.edges.length}`);
  await deps.graph.close();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
