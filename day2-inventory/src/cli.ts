#!/usr/bin/env node
import { Command } from 'commander';
import { createDbClient, runMigrations } from './db/client.js';
import { buildProductCommand } from './commands/product.js';
import { buildReceivingCommand } from './commands/receiving.js';
import { buildOrderCommand } from './commands/order.js';
import { buildDispatchCommand } from './commands/dispatch.js';
import { buildCampaignCommand } from './commands/campaign.js';
import { buildAccountingCommand } from './commands/accounting.js';

async function main() {
  const db = createDbClient(process.env['DB_URL'] ?? 'file:inventory.db');
  await runMigrations(db);

  const program = new Command();
  program
    .name('inventory')
    .description('在庫管理 CLI')
    .version('1.0.0');

  program.addCommand(buildProductCommand(db));
  program.addCommand(buildReceivingCommand(db));
  program.addCommand(buildOrderCommand(db));
  program.addCommand(buildDispatchCommand(db));
  program.addCommand(buildCampaignCommand(db));
  program.addCommand(buildAccountingCommand(db));

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
