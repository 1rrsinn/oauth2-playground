import { once } from 'node:events';
import type { Server } from 'node:http';
import type { Express } from 'express';

export interface RunningServer {
  url: string;
  close: () => Promise<void>;
}

export async function listen(app: Express): Promise<RunningServer> {
  const server: Server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No TCP port available.');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
        server.closeAllConnections();
      }),
  };
}

export function basicAuth(id: string, secret: string): string {
  const encode = (value: string): string =>
    new URLSearchParams({ v: value }).toString().slice(2);
  return `Basic ${Buffer.from(`${encode(id)}:${encode(secret)}`).toString('base64')}`;
}
