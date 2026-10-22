import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { SignJWT } from 'jose';
import type { CryptoKey } from 'jose';
import {
  audience,
  isRecord,
  parseScope,
  tokenLifetimeSeconds,
} from './contracts.js';
import type { TokenResponse } from './contracts.js';
import { loadPrivateKey, loadRegistration } from './configuration.js';
import {
  authorizationUrl,
  dataDirectory,
  isMain,
  serverMain,
  startServer,
} from './runtime.js';

export interface AuthorizationConfig {
  clientId: string;
  clientSecret: string;
  allowedScopes: string[];
  defaultScope: string;
  issuer: string;
  audience: string;
  privateKey: CryptoKey;
  tokenLifetimeSeconds: number;
  rateLimit?: { maxRequests: number; windowMs: number };
  now?: () => number;
}

function sameSecret(actual: string, expected: string): boolean {
  const hash = (value: string): Buffer =>
    createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(actual), hash(expected));
}

function basicCredentials(
  request: Request,
): { id: string; secret: string } | undefined {
  const header = request.headers.authorization;
  const headerCount = request.rawHeaders.filter(
    (_, index) =>
      index % 2 === 0 &&
      request.rawHeaders[index]?.toLowerCase() === 'authorization',
  ).length;
  if (!header || header.length > 4096 || headerCount !== 1) {
    return undefined;
  }
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  const encoded = match?.[1];
  if (!encoded) {
    return undefined;
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded) {
    return undefined;
  }
  const text = bytes.toString('utf8');
  const separator = text.indexOf(':');
  if (separator < 0) {
    return undefined;
  }
  try {
    const decode = (value: string): string =>
      decodeURIComponent(value.replace(/\+/g, ' '));
    return {
      id: decode(text.slice(0, separator)),
      secret: decode(text.slice(separator + 1)),
    };
  } catch {
    return undefined;
  }
}

function tokenError(response: Response, status: number, error: string): void {
  response.status(status).json({ error });
}

export function createAuthorizationServer(
  config: AuthorizationConfig,
): Express {
  const app = express();
  app.disable('x-powered-by');
  const now = config.now ?? Date.now;
  const limit = config.rateLimit ?? { maxRequests: 60, windowMs: 60_000 };
  let windowStartMs = now();
  let requests = 0;
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.use('/token', (_request, response, next) => {
    response.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    if (now() - windowStartMs >= limit.windowMs) {
      requests = 0;
      windowStartMs = now();
    }
    requests += 1;
    if (requests > limit.maxRequests) {
      response.set(
        'Retry-After',
        String(
          Math.max(
            1,
            Math.ceil((windowStartMs + limit.windowMs - now()) / 1000),
          ),
        ),
      );
      tokenError(response, 429, 'rate_limited');
      return;
    }
    next();
  });
  app.post(
    '/token',
    express.urlencoded({
      extended: false,
      limit: '2kb',
      parameterLimit: 10,
      inflate: false,
    }),
    async (request, response) => {
      const body: unknown = request.body;
      if (
        !request.is('application/x-www-form-urlencoded') ||
        request.originalUrl.includes('?') ||
        !isRecord(body) ||
        Object.values(body).some((value) => typeof value !== 'string') ||
        'client_id' in body ||
        'client_secret' in body ||
        typeof body.grant_type !== 'string' ||
        body.grant_type === '' ||
        (body.scope !== undefined && typeof body.scope !== 'string')
      ) {
        tokenError(response, 400, 'invalid_request');
        return;
      }
      // Client authentication is separate from signing the access token below.
      const credentials = basicCredentials(request);
      const secretMatches = sameSecret(
        credentials?.secret ?? '',
        config.clientSecret,
      );
      if (
        !credentials ||
        credentials.id !== config.clientId ||
        !secretMatches
      ) {
        response.set('WWW-Authenticate', 'Basic realm="lab01-token"');
        tokenError(response, 401, 'invalid_client');
        return;
      }
      if (body.grant_type !== 'client_credentials') {
        tokenError(response, 400, 'unsupported_grant_type');
        return;
      }
      const scopes = parseScope(
        body.scope === undefined || body.scope === ''
          ? config.defaultScope
          : body.scope,
      );
      if (
        !scopes ||
        !scopes.every((scope) => config.allowedScopes.includes(scope))
      ) {
        tokenError(response, 400, 'invalid_scope');
        return;
      }
      const scope = scopes.join(' ');
      const issuedAtSeconds = Math.floor(now() / 1000);
      const accessToken = await new SignJWT({
        client_id: config.clientId,
        scope,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
        .setIssuer(config.issuer)
        .setAudience(config.audience)
        .setSubject(config.clientId)
        .setIssuedAt(issuedAtSeconds)
        .setExpirationTime(issuedAtSeconds + config.tokenLifetimeSeconds)
        .setJti(randomUUID())
        .sign(config.privateKey);
      const result: TokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: config.tokenLifetimeSeconds,
        scope,
      };
      response.json(result);
    },
  );
  app.all('/token', (_request, response) => {
    response.set('Allow', 'POST');
    tokenError(response, 405, 'invalid_request');
  });
  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      const isBodyError =
        isRecord(error) &&
        typeof error.type === 'string' &&
        [
          'entity.too.large',
          'parameters.too.many',
          'encoding.unsupported',
          'charset.unsupported',
          'entity.parse.failed',
          'request.aborted',
          'request.size.invalid',
        ].includes(error.type);
      tokenError(
        response,
        isBodyError ? 400 : 500,
        isBodyError ? 'invalid_request' : 'server_error',
      );
    },
  );
  return app;
}

if (isMain(import.meta.url)) {
  await serverMain(async () => {
    const directory = dataDirectory();
    const url = authorizationUrl();
    const config: AuthorizationConfig = {
      ...(await loadRegistration(directory)),
      privateKey: await loadPrivateKey(directory),
      issuer: url,
      audience,
      tokenLifetimeSeconds,
    };
    await startServer(
      createAuthorizationServer(config),
      url,
      'Authorization Server',
    );
  });
}
