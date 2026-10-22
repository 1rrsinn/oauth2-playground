import express from 'express';
import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { errors, jwtVerify } from 'jose';
import type { CryptoKey } from 'jose';
import { audience, parseScope } from './contracts.js';
import { loadPublicKey } from './configuration.js';
import {
  authorizationUrl,
  dataDirectory,
  isMain,
  resourceUrl,
  serverMain,
  startServer,
} from './runtime.js';

export interface ResourceConfig {
  publicKey: CryptoKey;
  issuer: string;
  audience: string;
  now?: () => number;
}

function bearerError(
  response: Response,
  status: number,
  error?: string,
  scope?: string,
): void {
  let challenge = 'Bearer realm="lab01-api"';
  if (error) {
    challenge += `, error="${error}"`;
  }
  if (scope) {
    challenge += `, scope="${scope}"`;
  }
  response.set('WWW-Authenticate', challenge);
  response.status(status).json({ error: error ?? 'authentication_required' });
}

export function createResourceServer(config: ResourceConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  const now = config.now ?? Date.now;
  const authorize =
    (requiredScope: string): RequestHandler =>
    async (request, response, next) => {
      response.set('Cache-Control', 'no-store');
      const header = request.headers.authorization;
      const headerCount = request.rawHeaders.filter(
        (_, index) =>
          index % 2 === 0 &&
          request.rawHeaders[index]?.toLowerCase() === 'authorization',
      ).length;
      if (
        headerCount > 1 ||
        new URL(request.originalUrl, 'http://127.0.0.1').searchParams.has(
          'access_token',
        )
      ) {
        bearerError(response, 400, 'invalid_request');
        return;
      }
      if (!header || !/^Bearer(?: |$)/i.test(header)) {
        bearerError(response, 401);
        return;
      }
      const token = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i.exec(header)?.[1];
      if (!token || token.length > 8192) {
        bearerError(response, 401, 'invalid_token');
        return;
      }
      let scopes: string[] | undefined;
      try {
        // Pinned key: no jku/x5u URL or other key source supplied by the token is used.
        const { payload } = await jwtVerify(token, config.publicKey, {
          algorithms: ['RS256'],
          typ: 'at+jwt',
          issuer: config.issuer,
          audience: config.audience,
          requiredClaims: [
            'iss',
            'aud',
            'sub',
            'client_id',
            'iat',
            'exp',
            'jti',
            'scope',
          ],
          currentDate: new Date(now()),
        });
        const nowSeconds = Math.floor(now() / 1000);
        if (
          typeof payload.sub !== 'string' ||
          !payload.sub ||
          typeof payload.client_id !== 'string' ||
          payload.client_id !== payload.sub ||
          typeof payload.jti !== 'string' ||
          !payload.jti ||
          typeof payload.iat !== 'number' ||
          !Number.isSafeInteger(payload.iat) ||
          payload.iat > nowSeconds ||
          typeof payload.exp !== 'number' ||
          !Number.isSafeInteger(payload.exp) ||
          payload.exp <= payload.iat ||
          typeof payload.scope !== 'string'
        ) {
          bearerError(response, 401, 'invalid_token');
          return;
        }
        scopes = parseScope(payload.scope);
      } catch (error: unknown) {
        if (!(error instanceof errors.JOSEError)) {
          throw error;
        }
        bearerError(response, 401, 'invalid_token');
        return;
      }
      if (!scopes) {
        bearerError(response, 401, 'invalid_token');
        return;
      }
      // Authentication succeeded. This separate decision authorizes the route.
      if (!scopes.includes(requiredScope)) {
        bearerError(response, 403, 'insufficient_scope', requiredScope);
        return;
      }
      next();
    };
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/api/catalog', authorize('catalog:read'), (_request, response) => {
    response.json({ items: [{ id: 'book-01', name: 'OAuth2 handbook' }] });
  });
  app.get('/api/reports', authorize('reports:read'), (_request, response) => {
    response.json({ reports: [{ id: 'report-01', total: 42 }] });
  });
  app.use(
    (
      _error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      response.status(500).json({ error: 'server_error' });
    },
  );
  return app;
}

if (isMain(import.meta.url)) {
  await serverMain(async () => {
    const config: ResourceConfig = {
      publicKey: await loadPublicKey(dataDirectory()),
      issuer: authorizationUrl(),
      audience,
    };
    await startServer(
      createResourceServer(config),
      resourceUrl(),
      'Resource Server',
    );
  });
}
