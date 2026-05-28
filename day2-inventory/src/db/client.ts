import { createClient, type Client } from '@libsql/client';
export { runMigrations } from './schema.js';

export function createDbClient(url = 'file:inventory.db'): Client {
  return createClient({ url });
}
