import OpenAI from 'openai';

export type ChatInput = {
  system?: string;
  user: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  temperature?: number;
};

// Minimal chat + embedding seams for dependency-injected tests.
export interface ChatModel {
  complete(input: ChatInput): Promise<string>;
}
export interface EmbeddingModel {
  embed(texts: string[]): Promise<number[][]>;
}
export interface OpenAIClient {
  chat: ChatModel;
  embeddings: EmbeddingModel;
}

export type OpenAIClientOptions = {
  apiKey?: string;
  chatModel?: string;
  embeddingModel?: string;
};

// Real OpenAI-backed client. Uses JSON-schema structured outputs when provided.
export function createOpenAIClient(options: OpenAIClientOptions = {}): OpenAIClient {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required to create the OpenAI client');
  const client = new OpenAI({ apiKey });
  const chatModel = options.chatModel ?? process.env.OPENAI_CHAT_MODEL ?? 'gpt-5.6-luna';
  const embeddingModel = options.embeddingModel ?? process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
  return {
    chat: {
      async complete(input: ChatInput): Promise<string> {
        const response = await client.chat.completions.create({
          model: chatModel,
          // GPT-5.6 Luna only accepts its default temperature.
          ...(chatModel === 'gpt-5.6-luna' ? {} : { temperature: input.temperature ?? 0 }),
          messages: [
            ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
            { role: 'user' as const, content: input.user },
          ],
          response_format: input.jsonSchema
            ? { type: 'json_schema', json_schema: { name: input.jsonSchema.name, schema: input.jsonSchema.schema, strict: false } }
            : undefined,
        });
        return response.choices[0]?.message?.content ?? '';
      },
    },
    embeddings: {
      async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];
        const response = await client.embeddings.create({ model: embeddingModel, input: texts });
        return response.data.map((d) => d.embedding);
      },
    },
  };
}

// Deterministic test seams.
export class StubChatModel implements ChatModel {
  public calls: ChatInput[] = [];
  constructor(private readonly responder: (input: ChatInput) => string) {}
  async complete(input: ChatInput): Promise<string> {
    this.calls.push(input);
    return this.responder(input);
  }
}
export class StubEmbeddingModel implements EmbeddingModel {
  constructor(private readonly dimensions = 8) {}
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((_, i) => Array.from({ length: this.dimensions }, (_v, j) => (i + j) / 10));
  }
}
