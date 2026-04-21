import { Command } from 'commander';
import { type Client } from '@libsql/client';
import { CreateShipmentSchema, ShipmentStatusSchema } from '../schemas/index.js';
import * as svc from '../services/dispatch.js';

export function buildDispatchCommand(db: Client): Command {
  const cmd = new Command('dispatch').description('発送処理');

  cmd
    .command('ship <orderId>')
    .description('出荷を作成')
    .option('--tracking <number>', '追跡番号')
    .option('--carrier <name>', '配送業者')
    .action(async (orderId, opts) => {
      const input = CreateShipmentSchema.parse({
        order_id: Number(orderId),
        tracking_number: opts.tracking,
        carrier: opts.carrier,
      });
      const shipment = await svc.createShipment(db, input);
      console.log('出荷を作成しました:', shipment);
    });

  cmd
    .command('list')
    .description('出荷一覧')
    .action(async () => {
      const shipments = await svc.listShipments(db);
      console.table(shipments.map((s) => ({
        id: s.id, order_id: s.order_id,
        status: s.status, tracking: s.tracking_number, carrier: s.carrier,
      })));
    });

  cmd
    .command('update <id>')
    .description('出荷ステータス更新')
    .requiredOption('--status <status>')
    .option('--tracking <number>')
    .option('--carrier <name>')
    .action(async (id, opts) => {
      const status = ShipmentStatusSchema.parse(opts.status);
      const shipment = await svc.updateShipmentStatus(db, Number(id), status, {
        tracking_number: opts.tracking,
        carrier: opts.carrier,
      });
      if (!shipment) { console.error('出荷が見つかりません'); process.exit(1); }
      console.log('更新しました:', shipment);
    });

  return cmd;
}
