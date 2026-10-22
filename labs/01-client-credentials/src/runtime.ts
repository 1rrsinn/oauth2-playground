import type { Express } from 'express';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const labDirectory = fileURLToPath(
  new URL('../../../', import.meta.url),
);

export function dataDirectory(): string {
  return resolve(process.env.LAB_DATA_DIR ?? resolve(labDirectory, '.local'));
}

// Deliberately IPv4-only: no DNS lookups and no accidental external HTTP targets.
export function loopbackUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Only HTTP base URLs on 127.0.0.1 are allowed.');
  }
  return url.origin;
}

export function authorizationUrl(): string {
  return loopbackUrl(process.env.LAB_AS_URL ?? 'http://127.0.0.1:9000');
}

export function resourceUrl(): string {
  return loopbackUrl(process.env.LAB_RS_URL ?? 'http://127.0.0.1:9001');
}

export function isMain(moduleUrl: string): boolean {
  return (
    process.argv[1] !== undefined &&
    resolve(process.argv[1]) === fileURLToPath(moduleUrl)
  );
}

export async function startServer(
  app: Express,
  url: string,
  role: string,
): Promise<void> {
  const server = app.listen(Number(new URL(url).port || 80), '127.0.0.1');
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  await once(server, 'listening');
  console.log(`${role} ready: ${url}`);
  const stop = (): void => {
    server.close();
    server.closeAllConnections();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

export async function serverMain(start: () => Promise<void>): Promise<void> {
  try {
    await start();
  } catch {
    console.error(
      'Startup failed. Check setup, local configuration, and port availability.',
    );
    process.exitCode = 1;
  }
}
