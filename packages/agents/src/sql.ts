import { assertReadOnlySelect } from '@cala/db';
import type { ChatModel } from './models.js';

export const SQL_SCHEMA = `
companies(id uuid, name text, ticker text, display_order int, recency text, created_at timestamptz)
company_sources(company_id uuid, provider text, config jsonb)
ingestion_runs(id uuid, company_id uuid, mode text, status text, started_at timestamptz, finished_at timestamptz, error text, counts jsonb)
source_documents(id uuid, company_id uuid, provider text, provider_id text, url text, published_at timestamptz, normalized_text text, content_hash text, created_at timestamptz)
developments(id uuid, company_id uuid, source_document_id uuid, summary text, relevance_score numeric, status text, created_at timestamptz)
agent_runs(id uuid, company_id uuid, mode text, status text, phase text, started_at timestamptz, finished_at timestamptz, error text, counts jsonb)
finance_analyses(id uuid, development_id uuid, market_snapshot jsonb, impact text, confidence numeric, rationale text, created_at timestamptz)
daily_reports(id uuid, report_date date, summary text, created_at timestamptz)
entities(id uuid, entity_type text, external_id text, label text, properties jsonb, source_id uuid)
relationships(id uuid, from_entity_id uuid, to_entity_id uuid, relationship_type text, evidence_document_id uuid, evidence_url text, confidence numeric)
document_entities(document_id uuid, entity_id uuid)
cala_snapshots(id uuid, company_id uuid, run_id uuid, kind text, input text, entities jsonb, results jsonb, created_at timestamptz)
healthcare_gates(id uuid, run_id uuid, company_id uuid, is_new boolean, is_relevant boolean, relevance_score numeric, rationale text, development_summary text, created_at timestamptz)
finance_impacts(id uuid, run_id uuid, company_id uuid, development_summary text, potential_product_or_catalyst text, expected_impact jsonb, rationale text, evidence_ids jsonb, created_at timestamptz)
momentum_reports(company_id uuid, thesis text, events jsonb, generated_at timestamptz)
`.trim();

export const GRAPH_ENTITY_TYPES = [
  'company',
  'clinical_trial',
  'paper',
  'news',
  'patent',
  'person',
  'institution',
  'program',
] as const;

export const GRAPH_RELATIONSHIP_TYPES = [
  'RESEARCH_ON',
  'TRIAL_BY',
  'REPORTED_ON',
  'PATENT_OF',
  'COLLABORATES_WITH',
  'ABOUT',
  'EVIDENCES',
] as const;

export type GraphAskFilter = {
  allCompanies?: boolean;
  companyTicker?: string | null;
  companyName?: string | null;
  entityTypes?: string[];
  relationshipTypes?: string[];
  labelQuery?: string | null;
};

export type GeneratedSql = {
  sql: string;
  explanation: string;
  graphFilter: GraphAskFilter;
};

export type HardcodedSqlResult = GeneratedSql & {
  rows: Record<string, unknown>[];
  rowCount: number;
};

const MODERNA_SQL = `SELECT c.name, c.ticker, c.recency,
  count(*) FILTER (WHERE e.entity_type = 'clinical_trial') AS trials,
  count(*) FILTER (WHERE e.entity_type = 'paper') AS papers,
  count(*) FILTER (WHERE e.entity_type = 'news') AS news
FROM companies c
JOIN entities ce ON ce.entity_type = 'company' AND ce.label = c.name
JOIN relationships r ON r.to_entity_id = ce.id OR r.from_entity_id = ce.id
JOIN entities e ON e.id = CASE WHEN r.to_entity_id = ce.id THEN r.from_entity_id ELSE r.to_entity_id END
WHERE c.ticker = 'MRNA'
GROUP BY c.name, c.ticker, c.recency
LIMIT 20`;

const TRIAL_SQL = `SELECT e.label AS trial, e.external_id, c.name AS sponsor, c.ticker, sd.url, sd.published_at
FROM entities e
JOIN relationships r ON r.from_entity_id = e.id AND r.relationship_type = 'TRIAL_BY'
JOIN entities ce ON ce.id = r.to_entity_id AND ce.entity_type = 'company'
JOIN companies c ON c.name = ce.label
LEFT JOIN source_documents sd ON sd.provider = 'clinicaltrials' AND sd.provider_id = replace(e.external_id, 'clinicaltrials:', '')
WHERE e.entity_type = 'clinical_trial'
  AND (e.label ILIKE '%mRNA-4157%' OR e.external_id = 'clinicaltrials:NCT03897881')
ORDER BY sd.published_at DESC NULLS LAST
LIMIT 20`;

const TRIALS_NEWS_SQL = `SELECT e.entity_type, e.label, e.external_id, r.relationship_type, sd.url
FROM companies c
JOIN entities ce ON ce.entity_type = 'company' AND ce.label = c.name
JOIN relationships r ON r.to_entity_id = ce.id OR r.from_entity_id = ce.id
JOIN entities e ON e.id = CASE WHEN r.to_entity_id = ce.id THEN r.from_entity_id ELSE r.to_entity_id END
LEFT JOIN source_documents sd ON sd.id = r.evidence_document_id
WHERE c.ticker = 'MRNA'
  AND e.entity_type IN ('clinical_trial', 'news')
  AND r.relationship_type IN ('TRIAL_BY', 'REPORTED_ON')
ORDER BY e.entity_type, e.label
LIMIT 100`;

const ENTITY_ALIASES: Array<{ type: string; pattern: RegExp; relationships: string[] }> = [
  { type: 'clinical_trial', pattern: /clinical[_\s-]?trials?|nct\d+|keynote/i, relationships: ['TRIAL_BY'] },
  { type: 'news', pattern: /news|press|headline|reported/i, relationships: ['REPORTED_ON'] },
  { type: 'paper', pattern: /papers?|pubmed|publication|research article/i, relationships: ['RESEARCH_ON'] },
  { type: 'patent', pattern: /patents?/i, relationships: ['PATENT_OF'] },
  { type: 'person', pattern: /people|persons?|executives?|investigators?/i, relationships: ['ABOUT', 'EVIDENCES'] },
  { type: 'institution', pattern: /institutions?|hospitals?|universit/i, relationships: ['ABOUT', 'COLLABORATES_WITH'] },
  { type: 'program', pattern: /programs?|products?|mrna[-\s]?\d+/i, relationships: ['ABOUT'] },
];

function normalizeEntityTypes(types: unknown): string[] | undefined {
  if (!Array.isArray(types)) return undefined;
  const allowed = new Set<string>(GRAPH_ENTITY_TYPES);
  const next = [...new Set(types.map((item) => String(item)).filter((item) => allowed.has(item)))];
  return next.length ? next : undefined;
}

function normalizeRelationshipTypes(types: unknown): string[] | undefined {
  if (!Array.isArray(types)) return undefined;
  const allowed = new Set<string>(GRAPH_RELATIONSHIP_TYPES);
  const next = [...new Set(types.map((item) => String(item)).filter((item) => allowed.has(item)))];
  return next.length ? next : undefined;
}

export function normalizeGraphFilter(input: Partial<GraphAskFilter> | null | undefined): GraphAskFilter {
  const entityTypes = normalizeEntityTypes(input?.entityTypes);
  const relationshipTypes = normalizeRelationshipTypes(input?.relationshipTypes);
  const filter: GraphAskFilter = {
    allCompanies: Boolean(input?.allCompanies),
    companyTicker: typeof input?.companyTicker === 'string' && input.companyTicker.trim() ? input.companyTicker.trim().toUpperCase() : null,
    companyName: typeof input?.companyName === 'string' && input.companyName.trim() ? input.companyName.trim() : null,
    entityTypes,
    relationshipTypes,
    labelQuery: typeof input?.labelQuery === 'string' && input.labelQuery.trim() ? input.labelQuery.trim() : null,
  };
  if (entityTypes && !entityTypes.includes('company') && !filter.allCompanies) {
    filter.entityTypes = ['company', ...entityTypes];
  }
  return filter;
}

export function inferGraphFilter(question: string): GraphAskFilter {
  const askedTypes = ENTITY_ALIASES.filter((alias) => alias.pattern.test(question));
  const entityTypes = askedTypes.map((alias) => alias.type);
  const relationshipTypes = [...new Set(askedTypes.flatMap((alias) => alias.relationships))];
  const allCompanies = /\b(all companies|every company|entire graph|whole graph)\b/i.test(question);
  const moderna = /\bmoderna\b|\bmrna\b/i.test(question);
  const merck = /\bmerck\b|\bmrk\b/i.test(question);
  const pfizer = /\bpfizer\b|\bpfe\b/i.test(question);
  return normalizeGraphFilter({
    allCompanies,
    companyTicker: allCompanies ? null : moderna ? 'MRNA' : merck ? 'MRK' : pfizer ? 'PFE' : null,
    companyName: allCompanies ? null : moderna ? 'Moderna' : merck ? 'Merck' : pfizer ? 'Pfizer' : null,
    entityTypes: entityTypes.length ? entityTypes : undefined,
    relationshipTypes: relationshipTypes.length ? relationshipTypes : undefined,
  });
}

export const HARDCODED_SQL_DEMOS: Array<{
  id: string;
  match: RegExp;
  explanation: string;
  sql: string;
  rows: Record<string, unknown>[];
  graphFilter: GraphAskFilter;
}> = [
  {
    id: 'moderna-trials-news',
    match: /moderna[\s\S]{0,80}(clinical[_\s-]?trials?|trials?).{0,40}news|news.{0,40}(clinical[_\s-]?trials?|trials?).{0,40}moderna|(clinical[_\s-]?trials?|trials?).{0,40}news.{0,40}moderna/i,
    explanation: 'Filtered the graph to Moderna clinical trials and related news.',
    sql: TRIALS_NEWS_SQL,
    graphFilter: {
      companyTicker: 'MRNA',
      companyName: 'Moderna',
      entityTypes: ['company', 'clinical_trial', 'news'],
      relationshipTypes: ['TRIAL_BY', 'REPORTED_ON'],
    },
    rows: [
      {
        entity_type: 'clinical_trial',
        label: 'An Efficacy Study of Adjuvant Treatment With the Personalized Cancer Vaccine mRNA-4157 and Pembrolizumab in Participants With High-Risk Melanoma (KEYNOTE-942)',
        external_id: 'clinicaltrials:NCT03897881',
        relationship_type: 'TRIAL_BY',
        url: 'https://clinicaltrials.gov/study/NCT03897881',
      },
      {
        entity_type: 'news',
        label: 'Moderna, Merck vaccine cuts recurrence and spread of ... - Reuters',
        external_id: null,
        relationship_type: 'REPORTED_ON',
        url: null,
      },
    ],
  },
  {
    id: 'clinical-trial',
    match: /clinical[_\s-]?trial|keynote[-\s]?942|nct03897881|mRNA-4157|melanoma vaccine/i,
    explanation: 'KEYNOTE-942 / mRNA-4157 melanoma trial linked to Moderna in the knowledge graph.',
    sql: TRIAL_SQL,
    graphFilter: {
      companyTicker: 'MRNA',
      companyName: 'Moderna',
      entityTypes: ['company', 'clinical_trial'],
      relationshipTypes: ['TRIAL_BY'],
      labelQuery: 'mRNA-4157',
    },
    rows: [
      {
        trial: 'An Efficacy Study of Adjuvant Treatment With the Personalized Cancer Vaccine mRNA-4157 and Pembrolizumab in Participants With High-Risk Melanoma (KEYNOTE-942)',
        external_id: 'clinicaltrials:NCT03897881',
        sponsor: 'Moderna',
        ticker: 'MRNA',
        url: 'https://clinicaltrials.gov/study/NCT03897881',
        published_at: '2019-04-01T00:00:00.000Z',
      },
      {
        trial: 'Safety, Tolerability, and Immunogenicity of mRNA-4157 Alone and in Combination in Participants With Solid Tumors',
        external_id: 'clinicaltrials:NCT03313778',
        sponsor: 'Moderna',
        ticker: 'MRNA',
        url: 'https://clinicaltrials.gov/study/NCT03313778',
        published_at: '2017-10-18T00:00:00.000Z',
      },
    ],
  },
  {
    id: 'moderna',
    match: /\bmoderna\b|\bmrna\b/i,
    explanation: 'Moderna watchlist profile with linked trial, paper, and news counts from the knowledge graph.',
    sql: MODERNA_SQL,
    graphFilter: {
      companyTicker: 'MRNA',
      companyName: 'Moderna',
      entityTypes: ['company', 'clinical_trial', 'paper', 'news'],
      relationshipTypes: ['TRIAL_BY', 'RESEARCH_ON', 'REPORTED_ON'],
    },
    rows: [
      {
        name: 'Moderna',
        ticker: 'MRNA',
        recency: 'high',
        trials: 50,
        papers: 20,
        news: 12,
      },
    ],
  },
];

export function matchHardcodedSql(question: string): HardcodedSqlResult | null {
  const demo = HARDCODED_SQL_DEMOS.find((entry) => entry.match.test(question));
  if (!demo) return null;
  return {
    sql: assertReadOnlySelect(demo.sql),
    explanation: demo.explanation,
    rows: demo.rows,
    rowCount: demo.rows.length,
    graphFilter: normalizeGraphFilter(demo.graphFilter),
  };
}

function parseSqlResponse(raw: string): GeneratedSql {
  try {
    const parsed = JSON.parse(raw) as Partial<GeneratedSql>;
    if (parsed.sql) {
      return {
        sql: parsed.sql,
        explanation: parsed.explanation ?? '',
        graphFilter: normalizeGraphFilter(parsed.graphFilter ?? {}),
      };
    }
  } catch {
    const fenced = raw.match(/```sql\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return {
        sql: fenced[1].trim(),
        explanation: raw.replace(fenced[0], '').trim(),
        graphFilter: {},
      };
    }
  }
  throw new Error('The SQL agent did not return a query');
}

export async function generateSqlQuery(chat: ChatModel, question: string): Promise<GeneratedSql> {
  const hardcoded = matchHardcodedSql(question);
  if (hardcoded) {
    return { sql: hardcoded.sql, explanation: hardcoded.explanation, graphFilter: hardcoded.graphFilter };
  }

  const inferred = inferGraphFilter(question);
  const raw = await chat.complete({
    system: `You write PostgreSQL for a healthcare market-intelligence database and also describe how to filter the Neo4j knowledge-graph UI.
Return JSON {
  "sql": string,
  "explanation": string,
  "graphFilter": {
    "allCompanies"?: boolean,
    "companyTicker"?: string | null,
    "companyName"?: string | null,
    "entityTypes"?: string[],
    "relationshipTypes"?: string[],
    "labelQuery"?: string | null
  }
}.
Rules:
- One read-only SELECT or WITH ... SELECT.
- Never modify data.
- Prefer LIMIT 100 unless the user asks for more, capped at 200.
- Always include graphFilter so the UI can show the matching subgraph.
- entityTypes must be a subset of: ${GRAPH_ENTITY_TYPES.join(', ')}.
- relationshipTypes must be a subset of: ${GRAPH_RELATIONSHIP_TYPES.join(', ')}.
- If the user names a company, set companyTicker/companyName and include "company" in entityTypes.
- If they ask for trials and news, entityTypes should be ["company","clinical_trial","news"] and relationshipTypes ["TRIAL_BY","REPORTED_ON"].
Schema:
${SQL_SCHEMA}`,
    user: question,
    jsonSchema: {
      name: 'sql_query',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sql: { type: 'string' },
          explanation: { type: 'string' },
          graphFilter: {
            type: 'object',
            additionalProperties: false,
            properties: {
              allCompanies: { type: 'boolean' },
              companyTicker: { type: ['string', 'null'] },
              companyName: { type: ['string', 'null'] },
              entityTypes: { type: 'array', items: { type: 'string' } },
              relationshipTypes: { type: 'array', items: { type: 'string' } },
              labelQuery: { type: ['string', 'null'] },
            },
          },
        },
        required: ['sql', 'explanation', 'graphFilter'],
      },
    },
  });
  const generated = parseSqlResponse(raw);
  return {
    sql: assertReadOnlySelect(generated.sql),
    explanation: generated.explanation,
    graphFilter: normalizeGraphFilter({
      ...inferred,
      ...generated.graphFilter,
      entityTypes: generated.graphFilter.entityTypes ?? inferred.entityTypes,
      relationshipTypes: generated.graphFilter.relationshipTypes ?? inferred.relationshipTypes,
      companyTicker: generated.graphFilter.companyTicker ?? inferred.companyTicker,
      companyName: generated.graphFilter.companyName ?? inferred.companyName,
      allCompanies: generated.graphFilter.allCompanies || inferred.allCompanies,
      labelQuery: generated.graphFilter.labelQuery ?? inferred.labelQuery,
    }),
  };
}
