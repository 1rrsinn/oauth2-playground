export const clientId = 'lab01-client';
export const audience = 'urn:oauth2-playground:lab01:api';
export const allowedScopes = ['catalog:read', 'reports:read'];
export const tokenLifetimeSeconds = 60;

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// RFC 6749 section 3.3: scope tokens use printable ASCII except quote/backslash.
export function parseScope(value: string): string[] | undefined {
  if (
    !/^[\x21\x23-\x5b\x5d-\x7e]+(?: [\x21\x23-\x5b\x5d-\x7e]+)*$/.test(value)
  ) {
    return undefined;
  }
  return [...new Set(value.split(' '))];
}
