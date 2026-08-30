import { createRepositoriesFromEnv, type Repositories } from '@cala/db';
import { createGraphFromEnv, type GraphProjector } from '@cala/graph';
import { HttpCalaClient, type CalaClient } from './cala.js';
import { OpenAIFastinoClient, type FastinoClient } from './fastino.js';
import { createOpenAIClient, type OpenAIClient } from './models.js';
import { defaultResearchTools, type ResearchTool } from './tools.js';
import type { RunEvent } from '@cala/contracts';

export type WorkflowDeps = {
  cala: CalaClient;
  fastino: FastinoClient;
  repos: Repositories;
  graph: GraphProjector;
  tools: ResearchTool[];
  openai?: OpenAIClient;
  onEvent?: (event: Omit<RunEvent, 'id' | 'createdAt'>) => Promise<void> | void;
};

// Production wiring from environment.
export function defaultDeps(): WorkflowDeps {
  const openai = createOpenAIClient();
  return {
    openai,
    cala: new HttpCalaClient({ timeoutMs: 90_000 }),
    fastino: new OpenAIFastinoClient(openai.chat),
    repos: createRepositoriesFromEnv(),
    graph: createGraphFromEnv(),
    tools: defaultResearchTools(),
  };
}
