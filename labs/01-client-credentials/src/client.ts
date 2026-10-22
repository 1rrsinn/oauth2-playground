import { loadClient } from './configuration.js';
import type { ClientCredentials } from './configuration.js';
import { allowedScopes, isRecord, parseScope } from './contracts.js';
import type { TokenResponse } from './contracts.js';
import {
  authorizationUrl,
  dataDirectory,
  isMain,
  loopbackUrl,
  resourceUrl,
} from './runtime.js';

export interface ClientOptions extends ClientCredentials {
  asUrl: string;
  rsUrl: string;
  scope?: string;
  resource: 'catalog' | 'reports';
  timeoutMs: number;
}

export class ClientError extends Error {}

const knownErrors = new Set([
  'invalid_request',
  'invalid_client',
  'unsupported_grant_type',
  'invalid_scope',
  'server_error',
  'temporarily_unavailable',
  'rate_limited',
  'invalid_token',
  'insufficient_scope',
  'authentication_required',
]);

function safeError(body: unknown): string {
  return isRecord(body) &&
    typeof body.error === 'string' &&
    knownErrors.has(body.error)
    ? body.error
    : 'unknown error';
}

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  stage: string,
): Promise<{ status: number; body: unknown }> {
  try {
    const response = await fetch(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const reader = response.body?.getReader();
    if (!reader) {
      throw new ClientError(`${stage}: empty response.`);
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      size += chunk.value.length;
      if (size > 16_384) {
        await reader.cancel();
        throw new ClientError(`${stage}: response exceeds the size limit.`);
      }
      chunks.push(chunk.value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new ClientError(`${stage}: invalid JSON response.`);
    }
    return { status: response.status, body };
  } catch (error: unknown) {
    if (error instanceof ClientError) {
      throw error;
    }
    throw new ClientError(
      `${stage}: network error, timeout, or redirect. Check servers and URLs.`,
    );
  }
}

function tokenResponse(body: unknown): TokenResponse {
  if (
    !isRecord(body) ||
    typeof body.access_token !== 'string' ||
    body.access_token.length > 8192 ||
    !/^[A-Za-z0-9\-._~+/]+=*$/.test(body.access_token) ||
    body.token_type !== 'Bearer' ||
    typeof body.expires_in !== 'number' ||
    !Number.isSafeInteger(body.expires_in) ||
    body.expires_in <= 0 ||
    typeof body.scope !== 'string' ||
    !parseScope(body.scope)
  ) {
    throw new ClientError('Token endpoint: invalid response format.');
  }
  return {
    access_token: body.access_token,
    token_type: body.token_type,
    expires_in: body.expires_in,
    scope: body.scope,
  };
}

function apiData(body: unknown, resource: 'catalog' | 'reports'): unknown {
  const field = resource === 'catalog' ? 'items' : 'reports';
  if (!isRecord(body) || !Array.isArray(body[field])) {
    throw new ClientError('Resource Server: invalid response format.');
  }
  const rows: unknown[] = body[field];
  if (rows.length > 100) {
    throw new ClientError('Resource Server: too many records.');
  }
  const data = rows.map((row) => {
    if (!isRecord(row) || typeof row.id !== 'string' || row.id.length > 256) {
      throw new ClientError('Resource Server: invalid record.');
    }
    if (resource === 'catalog') {
      if (typeof row.name !== 'string' || row.name.length > 256) {
        throw new ClientError('Resource Server: invalid catalog item.');
      }
      return { id: row.id, name: row.name };
    }
    if (typeof row.total !== 'number' || !Number.isFinite(row.total)) {
      throw new ClientError('Resource Server: invalid report.');
    }
    return { id: row.id, total: row.total };
  });
  return { [field]: data };
}

export async function runClient(
  options: ClientOptions,
  write: (line: string) => void,
): Promise<void> {
  const asUrl = loopbackUrl(options.asUrl);
  const rsUrl = loopbackUrl(options.rsUrl);
  const encode = (value: string): string =>
    new URLSearchParams({ v: value }).toString().slice(2);
  const authorization = `Basic ${Buffer.from(`${encode(options.clientId)}:${encode(options.clientSecret)}`).toString('base64')}`;
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  if (options.scope !== undefined) {
    body.set('scope', options.scope);
  }
  write(
    `1. POST ${asUrl}/token — client_secret_basic; grant_type=client_credentials`,
  );
  const tokenResult = await requestJson(
    `${asUrl}/token`,
    { method: 'POST', headers: { authorization }, body },
    options.timeoutMs,
    'Token endpoint',
  );
  if (tokenResult.status !== 200) {
    throw new ClientError(
      `Token endpoint: HTTP ${tokenResult.status} (${safeError(tokenResult.body)}).`,
    );
  }
  // Treat the token as opaque: only the HTTP response contract is checked here.
  const token = tokenResponse(tokenResult.body);
  const displayScope = token.scope
    .split(' ')
    .map((scope) => (allowedScopes.includes(scope) ? scope : '[unknown]'))
    .join(' ');
  write(
    `2. Token received: Bearer, ${token.expires_in} s; scope=${displayScope}. Token value stays in memory.`,
  );
  write(
    `3. GET ${rsUrl}/api/${options.resource} — Authorization: Bearer [REDACTED]`,
  );
  const apiResult = await requestJson(
    `${rsUrl}/api/${options.resource}`,
    { headers: { authorization: `Bearer ${token.access_token}` } },
    options.timeoutMs,
    'Resource Server',
  );
  if (apiResult.status !== 200) {
    throw new ClientError(
      `Resource Server: HTTP ${apiResult.status} (${safeError(apiResult.body)}).`,
    );
  }
  // Redact string values before JSON escaping (secrets may contain quotes/backslashes).
  const output = JSON.stringify(
    apiData(apiResult.body, options.resource),
    (_key: string, value: unknown): unknown =>
      typeof value === 'string'
        ? value
            .replaceAll(token.access_token, '[REDACTED]')
            .replaceAll(options.clientSecret, '[REDACTED]')
        : value,
  );
  write(`4. API 200: ${output}`);
}

function argumentsFrom(
  argv: string[],
): Omit<ClientOptions, keyof ClientCredentials> {
  let asUrl = authorizationUrl();
  let rsUrl = resourceUrl();
  let scope: string | undefined;
  let resource: 'catalog' | 'reports' = 'catalog';
  let timeoutMs = 3000;
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name || value === undefined || seen.has(name)) {
      throw new ClientError(
        'Options require one value each and must not be repeated.',
      );
    }
    seen.add(name);
    switch (name) {
      case '--as-url':
        asUrl = loopbackUrl(value);
        break;
      case '--rs-url':
        rsUrl = loopbackUrl(value);
        break;
      case '--scope':
        if (value.length > 1024 || /[\r\n]/.test(value)) {
          throw new ClientError('Invalid scope parameter.');
        }
        scope = value;
        break;
      case '--resource':
        if (value !== 'catalog' && value !== 'reports') {
          throw new ClientError('--resource allows catalog or reports.');
        }
        resource = value;
        break;
      case '--timeout-ms':
        timeoutMs = Number(value);
        if (
          !Number.isSafeInteger(timeoutMs) ||
          timeoutMs < 100 ||
          timeoutMs > 10_000
        ) {
          throw new ClientError(
            '--timeout-ms allows 100 to 10000 milliseconds.',
          );
        }
        break;
      default:
        throw new ClientError('Unknown option. Use --help for usage.');
    }
  }
  return {
    asUrl,
    rsUrl,
    resource,
    timeoutMs,
    ...(scope === undefined ? {} : { scope }),
  };
}

if (isMain(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    if (argv.length === 1 && argv[0] === '--help') {
      console.log(
        'client [--scope "catalog:read reports:read"] [--resource catalog|reports] [--as-url http://127.0.0.1:9000] [--rs-url http://127.0.0.1:9001] [--timeout-ms 3000]',
      );
    } else {
      const options = argumentsFrom(argv);
      await runClient(
        { ...options, ...(await loadClient(dataDirectory())) },
        console.log,
      );
    }
  } catch (error: unknown) {
    console.error(
      error instanceof ClientError
        ? error.message
        : 'Invalid client configuration. Check setup, options, and loopback URLs.',
    );
    process.exitCode = 1;
  }
}
