import { createInMemoryRepositories } from './in-memory.js';
import { createPostgresRepositories } from './postgres.js';
import type { Repositories } from './types.js';

let cached: Repositories | undefined;

function useMemory(): boolean {
  return Boolean(process.env.VITEST) || !process.env.DATABASE_URL;
}

export function createRepositoriesFromEnv(): Repositories {
  if (!cached) cached = useMemory() ? createInMemoryRepositories() : createPostgresRepositories();
  return cached;
}

export function resetRepositoriesForTests(): void {
  cached = createInMemoryRepositories();
}
