import {
  createClinicalTrialsAdapter,
  createNewsAdapter,
  createPubmedAdapter,
  createWebNewsAdapter,
  type NormalizedDocument,
  type SourceAdapter,
  type SourceContext,
} from '@cala/ingestion';
import type { Company } from '@cala/contracts';

// A research tool the agent can call. Each wraps a source adapter and is named
// after its provider so failures can be attributed and recorded.
export type ResearchTool = {
  name: string;
  run(context: SourceContext): Promise<NormalizedDocument[]>;
};

export function adapterTool(adapter: SourceAdapter): ResearchTool {
  return { name: adapter.provider, run: (context) => adapter.fetch(context) };
}

export type DefaultToolOptions = {
  newsFeedFor?: (company: Company) => string | null;
  tavilyApiKey?: string | null;
};

// PubMed, ClinicalTrials.gov, IR/RSS news, and Tavily web news. Patents, FDA,
// DailyMed, and SEC are deferred.
export function defaultResearchTools(options: DefaultToolOptions = {}): ResearchTool[] {
  const newsFeedFor = options.newsFeedFor ?? (() => process.env.NEWS_FEED_URL ?? null);
  return [
    adapterTool(createPubmedAdapter()),
    adapterTool(createClinicalTrialsAdapter()),
    adapterTool(createNewsAdapter(newsFeedFor)),
    adapterTool(createWebNewsAdapter({ apiKey: options.tavilyApiKey })),
  ];
}
