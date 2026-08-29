import { defineConfig } from 'drizzle-kit';
export default defineConfig({ schema: './src/schema.ts', out: './drizzle', dialect: 'postgresql', dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://cala:cala@localhost:5432/cala' } });
