import type { Company, FinanceImpact, HealthcareGate, RelationPack } from '@cala/contracts';
import { z } from 'zod';
import type { ChatModel } from './models.js';
import type { CalaQueryResult } from './cala.js';

export const healthcareGateSchema = z.object({
  isNew: z.boolean(),
  isRelevant: z.boolean(),
  relevanceScore: z.number().min(0).max(1),
  rationale: z.string(),
  developmentSummary: z.string(),
});

export const financeImpactSchema = z.object({
  developmentSummary: z.string(),
  potentialProductOrCatalyst: z.string(),
  expectedImpact: z.object({
    direction: z.enum(['up', 'down', 'unclear']),
    magnitude: z.enum(['low', 'medium', 'high']),
    horizon: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  rationale: z.string(),
  evidenceIds: z.array(z.string()),
});

export type HealthcareGateInput = {
  company: Company;
  relationPack: RelationPack;
  calaHealthcare: CalaQueryResult;
  documentSummaries: string[];
};
export type FinanceImpactInput = {
  company: Company;
  developmentSummary: string;
  relationPack: RelationPack;
  calaFinance: CalaQueryResult;
};

// Healthcare gate + finance impact. OpenAI-backed today; swap for a real Fastino
// Hugging Face endpoint later without changing the run graph.
export interface FastinoClient {
  healthcareGate(input: HealthcareGateInput): Promise<HealthcareGate>;
  financeImpact(input: FinanceImpactInput): Promise<FinanceImpact>;
}

function toJsonSchema(shape: 'gate' | 'finance'): { name: string; schema: Record<string, unknown> } {
  if (shape === 'gate') {
    return {
      name: 'healthcare_gate',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['isNew', 'isRelevant', 'relevanceScore', 'rationale', 'developmentSummary'],
        properties: {
          isNew: { type: 'boolean' },
          isRelevant: { type: 'boolean' },
          relevanceScore: { type: 'number' },
          rationale: { type: 'string' },
          developmentSummary: { type: 'string' },
        },
      },
    };
  }
  return {
    name: 'finance_impact',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['developmentSummary', 'potentialProductOrCatalyst', 'expectedImpact', 'rationale', 'evidenceIds'],
      properties: {
        developmentSummary: { type: 'string' },
        potentialProductOrCatalyst: { type: 'string' },
        expectedImpact: {
          type: 'object',
          additionalProperties: false,
          required: ['direction', 'magnitude', 'horizon', 'confidence'],
          properties: {
            direction: { type: 'string', enum: ['up', 'down', 'unclear'] },
            magnitude: { type: 'string', enum: ['low', 'medium', 'high'] },
            horizon: { type: 'string' },
            confidence: { type: 'number' },
          },
        },
        rationale: { type: 'string' },
        evidenceIds: { type: 'array', items: { type: 'string' } },
      },
    },
  };
}

const HEALTHCARE_SYSTEM =
  'You are a healthcare research analyst. Given a company, its knowledge-graph neighborhood, Cala healthcare intel, and recent documents, decide whether there is a NEW and RELEVANT material healthcare development. Respond only with JSON matching the schema.';
const FINANCE_SYSTEM =
  'You are a financial analyst specialized in healthcare. Given a qualifying healthcare development and Cala financial data, assess how it could impact the company financially. Respond only with JSON matching the schema.';

export class OpenAIFastinoClient implements FastinoClient {
  constructor(private readonly chat: ChatModel) {}
  async healthcareGate(input: HealthcareGateInput): Promise<HealthcareGate> {
    const user = [
      `Company: ${input.company.name} (${input.company.ticker ?? 'no ticker'})`,
      `Graph brief: ${input.relationPack.brief}`,
      `Cala healthcare query: ${input.calaHealthcare.input}`,
      `Cala healthcare results: ${JSON.stringify(input.calaHealthcare.results).slice(0, 4000)}`,
      `Recent documents:\n${input.documentSummaries.slice(0, 25).join('\n')}`,
    ].join('\n');
    const raw = await this.chat.complete({ system: HEALTHCARE_SYSTEM, user, jsonSchema: toJsonSchema('gate') });
    return healthcareGateSchema.parse(JSON.parse(raw));
  }
  async financeImpact(input: FinanceImpactInput): Promise<FinanceImpact> {
    const user = [
      `Company: ${input.company.name} (${input.company.ticker ?? 'no ticker'})`,
      `Development: ${input.developmentSummary}`,
      `Graph brief: ${input.relationPack.brief}`,
      `Cala finance query: ${input.calaFinance.input}`,
      `Cala finance results: ${JSON.stringify(input.calaFinance.results).slice(0, 4000)}`,
    ].join('\n');
    const raw = await this.chat.complete({ system: FINANCE_SYSTEM, user, jsonSchema: toJsonSchema('finance') });
    return financeImpactSchema.parse(JSON.parse(raw));
  }
}

// Deterministic Fastino client for tests.
export class MockFastinoClient implements FastinoClient {
  public gateCalls = 0;
  public financeCalls = 0;
  constructor(private readonly seed: { gate?: Partial<HealthcareGate>; impact?: Partial<FinanceImpact> } = {}) {}
  async healthcareGate(input: HealthcareGateInput): Promise<HealthcareGate> {
    this.gateCalls += 1;
    return {
      isNew: true,
      isRelevant: true,
      relevanceScore: 0.9,
      rationale: 'mock rationale',
      developmentSummary: `${input.company.name} development`,
      ...this.seed.gate,
    };
  }
  async financeImpact(input: FinanceImpactInput): Promise<FinanceImpact> {
    this.financeCalls += 1;
    return {
      developmentSummary: input.developmentSummary,
      potentialProductOrCatalyst: 'mock catalyst',
      expectedImpact: { direction: 'up', magnitude: 'high', horizon: '12m', confidence: 0.7 },
      rationale: 'mock finance rationale',
      evidenceIds: [],
      ...this.seed.impact,
    };
  }
}
