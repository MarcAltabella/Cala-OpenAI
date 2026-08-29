# CALA X OPENAI HACKATHON

## Project

Build a local-first intelligence dashboard with an unlimited company watchlist, seeded with ten healthcare and biotech companies for the demo and with Moderna as the primary narrative. The system monitors research, clinical, regulatory, disclosure, and company-news sources; identifies meaningful healthcare developments; retrieves relevant multi-year market history from Cala; and produces evidence-backed market-impact findings and a cross-company daily report.

The demo flow is:

1. Open the companies page, with Moderna pinned first.
2. Run the pipeline manually.
3. Inspect newly ingested documents and agent activity for a company.
4. Follow an important development through healthcare analysis, Cala market history, and finance analysis.
5. Explore related evidence in the knowledge graph.
6. Open the cross-company daily report.

## Scope

### Companies and sources

- Support an unlimited company watchlist; seed ten healthcare/biotech companies, including Moderna, for the demo.
- Seed each source with the prior 12 months of research and regulatory material.
- In daily mode, fetch and process only new or changed material.
- Use live external APIs and feeds:
  - ClinicalTrials.gov
  - PubMed and PMC
  - FDA: drugs, biologics, and press releases
  - DailyMed
  - SEC EDGAR filings
  - Company investor-relations and news feeds
- Retrieve multi-year historical financial data from Cala only for healthcare developments that qualify for finance analysis.

### Product pages

```text
Companies (/companies)
├── Company detail (/companies/:companyId)
│   ├── Overview: developments and finance findings
│   ├── Research: source documents and extracted facts
│   └── Agent runs: ingestion, healthcare, and finance statuses
Knowledge graph (/knowledge-graph)
└── Company filter and node/edge/path detail
Reports (/reports)
└── Daily cross-company briefing (/reports/:reportId)
```

- The Companies page is the default page; there is no landing page.
- Primary navigation is Companies, Knowledge graph, and Reports.
- A persistent Run now action starts the same workflow used by scheduled ingestion.
- The MVP has one local demo operator: no authentication, organizations, settings, or separate analytics page.

## Architecture

```text
React/Vite dashboard
        ↓
Express API
        ├── PostgreSQL + pgvector (source of truth)
        │   companies, documents, runs, findings, reports, embeddings
        │
        └── LangGraph worker
             ├── source ingestion and extraction
             ├── Fastino Healthcare analysis
             ├── Cala historical-data retrieval
             ├── Fastino Finance impact analysis
             └── report synthesis
                      ↓
                   Neo4j (derived knowledge graph)
```

### Backend

- TypeScript throughout.
- Express provides dashboard APIs and starts runs without waiting for agents to finish.
- LangGraph is the sole agent/workflow framework. It owns retries, checkpoints, and conditional routing.
- Source adapters normalize each provider into a common document format.
- Ingestion is idempotent: provider identifiers and content hashes prevent duplicate analysis.
- A local scheduler runs the daily workflow; Run now invokes that workflow on demand.

### Agent routing

1. Ingest and normalize new source material.
2. Use a general OpenAI or free model such as 0xAlpha for orchestration and structured extraction.
3. Run Fastino Healthcare to assess healthcare significance and return structured findings.
4. If relevance is at least 0.70, retrieve multi-year market history from Cala and run Fastino Finance to assess potential market impact.
5. Store all results in PostgreSQL, then project approved entities and relationships into Neo4j.
6. Synthesize a cross-company daily report from the qualifying finance findings.

Use a free embedding model for semantic retrieval. Any LLM-generated Cypher is read-only, schema-restricted, and used only for graph retrieval.

### Data stores

PostgreSQL is the source of truth and has pgvector enabled.

| Area | Tables |
| --- | --- |
| Watchlist | `companies`, `company_sources` |
| Ingestion | `ingestion_runs`, `source_documents` |
| Agent output | `developments`, `agent_runs`, `finance_analyses`, `daily_reports` |
| Retrieval | embeddings on `source_documents` and `developments` |
| Graph projection | `entities`, `relationships`, `document_entities` |

`source_documents` retain the provider URL/identifier, publication time, raw payload, normalized text, content hash, and company link. This provides provenance and permits safe reprocessing.

Neo4j is a derived read model, never a competing source of truth. It stores only curated entities, evidence-backed relationships, and their links to PostgreSQL records. It can be rebuilt from PostgreSQL after a schema change or failed projection.

### API contract

```text
GET    /companies
POST   /companies
GET    /companies/:id
GET    /companies/:id/documents
GET    /companies/:id/developments
GET    /companies/:id/agent-runs
POST   /runs                     # all companies or one company
GET    /runs/:id
GET    /knowledge-graph?companyId=
GET    /reports
GET    /reports/:id
```

`POST /runs` returns a run ID immediately. The frontend polls `GET /runs/:id` for progress and errors.

### Local infrastructure

```text
Docker Compose
├── postgres:16 + pgvector
├── neo4j
├── api       # Express / TypeScript
└── worker    # LangGraph / TypeScript
```

The React/Vite frontend uses Tailwind CSS and native React/HTML components for the dashboard. React Flow is the sole UI library in the MVP, used only for the knowledge graph; introduce other UI/dashboard libraries later when a concrete need appears. The frontend runs locally during development and may later be built into the API container. `.env` holds provider keys, model endpoints, source configuration, and the relevance threshold. No Supabase, Redis, cloud scheduler, hosted PostgreSQL provider, or authentication provider is in MVP scope.

## Non-goals and upgrade triggers

- No Redis or queue service initially. Add one when concurrent runs, retry persistence, or API responsiveness demonstrate that the in-process worker is insufficient.
- No hosted deployment or managed database for the initial local demo.
- No graph database as a source of truth. Neo4j becomes independently writable only if graph operations become the product's primary workflow.
- No user authentication or per-user watchlists until the demo evolves beyond a single operator.
