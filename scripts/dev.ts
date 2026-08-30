import { existsSync, readFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';

for (const line of (existsSync('.env') ? readFileSync('.env', 'utf8') : '').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=][^=]*)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
process.env.PORT ??= '3002';
process.env.VITE_API_PORT ??= process.env.PORT;

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children: ChildProcess[] = [
  ['@cala/api', 'dev'],
  ['@cala/worker', 'dev'],
  ['@cala/web', 'dev'],
].map(([filter, script]) => spawn(command, ['--filter', filter, script], { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' }));

const shutdown = () => { for (const child of children) child.kill(); };
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
