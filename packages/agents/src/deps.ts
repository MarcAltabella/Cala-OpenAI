import type { Company } from '@cala/contracts';
import { createInMemoryRepositories, createInMemoryStore, type Repositories } from '@cala/db';
import { databaseEnabled as companiesDatabaseEnabled, getCompanyPersisted, listCompaniesPersisted } from '@cala/db/src/repositories/companies.js';
import { databaseEnabled, getRun, getRunPersisted, updateRun, updateRunPersisted } from '@cala/db/src/repositories/runs.js';
import { createGraphFromEnv, type GraphProjector } from '@cala/graph';
import { HttpCalaClient, type CalaClient } from './cala.js';
import { OpenAIFastinoClient, type FastinoClient } from './fastino.js';
import { createOpenAIClient, type OpenAIClient } from './models.js';
import { defaultResearchTools, type ResearchTool } from './tools.js';

export type WorkflowDeps = {
  cala: CalaClient;
  fastino: FastinoClient;
  repos: Repositories;
  graph: GraphProjector;
  tools: ResearchTool[];
  openai?: OpenAIClient;
};

function createSeededStore(companies: Company[]) {
  return createInMemoryStore({ companies });
}

// Bridge the run repository to the shared @cala/db runs module so the API's
// GET /runs/:id observes phase updates written by the worker.
function createWorkerRepositories(seed?: { companies?: Company[] }): Repositories {
  const store = createInMemoryRepositories(seed?.companies ? createSeededStore(seed.companies) : undefined);
  return {
    ...store,
    companies: companiesDatabaseEnabled() ? {
      async get(id) { return getCompanyPersisted(id); },
      async list() { return listCompaniesPersisted(); },
    } : store.companies,
    runs: {
      async get(id) {
        return databaseEnabled() ? getRunPersisted(id) : getRun(id);
      },
      async update(id, patch) {
        return databaseEnabled() ? updateRunPersisted(id, patch) : updateRun(id, patch);
      },
    },
  };
}

// Production wiring from environment. Requires OPENAI_API_KEY; Cala/Neo4j fall
// back to mock/in-memory when their env is unset.
export function defaultDeps(seed?: { companies?: Company[] }): WorkflowDeps {
  const openai = createOpenAIClient();
  return {
    openai,
    cala: new HttpCalaClient(),
    fastino: new OpenAIFastinoClient(openai.chat),
    repos: createWorkerRepositories(seed),
    graph: createGraphFromEnv(),
    tools: defaultResearchTools(),
  };
}
