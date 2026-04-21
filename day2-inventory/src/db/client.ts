import { createClient, type Client } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createDbClient(url = 'file:inventory.db'): Client {
  return createClient({ url });
}

export async function runMigrations(client: Client): Promise<void> {
  const sql = readFileSync(
    join(__dirname, 'migrations', '001_initial.sql'),
    'utf-8'
  );
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }
}
