import type { Company } from '@cala/contracts';
import { createRepositoriesFromEnv, createInMemoryRepositories, createInMemoryStore, type Repositories } from '@cala/db';
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

// Production wiring from environment. Requires OPENAI_API_KEY; Cala/Neo4j fall
// back to mock/in-memory when their env is unset.
export function defaultDeps(seed?: { companies?: Company[] }): WorkflowDeps {
  const openai = createOpenAIClient();
  const repos = seed?.companies
    ? createInMemoryRepositories(createSeededStore(seed.companies))
    : createRepositoriesFromEnv();
  return {
    openai,
    cala: new HttpCalaClient({ timeoutMs: 90_000 }),
    fastino: new OpenAIFastinoClient(openai.chat),
    repos,
    graph: createGraphFromEnv(),
    tools: defaultResearchTools(),
  };
}
