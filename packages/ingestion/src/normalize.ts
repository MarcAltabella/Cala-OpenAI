import { createHash } from 'node:crypto';
import type { FetchImpl } from './types.js';

// Collapse whitespace and trim so equivalent content produces equal hashes.
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// Stable content hash over normalized title + body, used for idempotent ingestion.
export function contentHash(title: string, body: string): string {
  return createHash('sha256').update(`${normalizeText(title)}\n${normalizeText(body)}`).digest('hex');
}

const DEFAULT_TIMEOUT_MS = 45_000;

export type FetchJsonOptions = {
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

// Perform a JSON request with an explicit timeout using the injected or global fetch.
export async function fetchJson(url: string, options?: FetchJsonOptions): Promise<unknown> {
  const fetchImpl = options?.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl);
  if (!fetchImpl) throw new Error('no fetch implementation available');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: options?.method,
      headers: options?.headers,
      body: options?.body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`request failed with status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
