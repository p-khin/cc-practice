import { Command } from 'commander';
import { type Client } from '@libsql/client';
import { CreateReceivingSlipSchema } from '../schemas/index.js';
import * as svc from '../services/inventory.js';

export function buildReceivingCommand(db: Client): Command {
  const cmd = new Command('receive').description('入庫処理');

  cmd
    .command('add')
    .description('入庫を記録')
    .requiredOption('--product <id>', '商品ID', parseInt)
    .requiredOption('--qty <quantity>', '数量', parseInt)
    .requiredOption('--cost <cost>', '仕入単価', parseFloat)
    .option('--supplier <name>', '仕入先')
    .option('--note <note>')
    .action(async (opts) => {
      const input = CreateReceivingSlipSchema.parse({
        product_id: opts.product,
        quantity: opts.qty,
        unit_cost: opts.cost,
        supplier: opts.supplier,
        note: opts.note,
      });
      const slip = await svc.receive(db, input);
      console.log('入庫を記録しました:', slip);
    });

  cmd
    .command('stock')
    .description('在庫一覧')
    .action(async () => {
      const inventory = await svc.listInventory(db);
      console.table(inventory.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        avg_cost: i.avg_cost.toFixed(2),
      })));
    });

  cmd
    .command('adjust')
    .description('在庫調整')
    .requiredOption('--product <id>', '商品ID', parseInt)
    .requiredOption('--delta <delta>', '数量変化（正負可）', parseInt)
    .option('--note <note>')
    .action(async (opts) => {
      await svc.adjustStock(db, {
        product_id: opts.product,
        quantity_delta: opts.delta,
        note: opts.note,
      });
      console.log('在庫を調整しました');
    });

  return cmd;
}
