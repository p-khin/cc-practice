import { Command } from 'commander';
import { type Client } from '@libsql/client';
import { CreateOrderSchema, OrderStatusSchema } from '../schemas/index.js';
import * as svc from '../services/order.js';

export function buildOrderCommand(db: Client): Command {
  const cmd = new Command('order').description('受注管理');

  cmd
    .command('create')
    .description('受注を作成')
    .requiredOption('--customer <name>')
    .requiredOption('--email <email>')
    .requiredOption('--items <json>', '商品リスト JSON (例: [{"product_id":1,"quantity":2}])')
    .option('--campaign <id>', 'キャンペーンID', parseInt)
    .action(async (opts) => {
      const input = CreateOrderSchema.parse({
        customer_name: opts.customer,
        customer_email: opts.email,
        items: JSON.parse(opts.items),
        campaign_id: opts.campaign,
      });
      const order = await svc.createOrder(db, input);
      console.log('受注を作成しました:', order);
    });

  cmd
    .command('list')
    .description('受注一覧')
    .action(async () => {
      const orders = await svc.listOrders(db);
      console.table(orders.map((o) => ({
        id: o.id, order_number: o.order_number,
        customer: o.customer_name, status: o.status, total: o.total_amount,
      })));
    });

  cmd
    .command('status <id>')
    .description('ステータス更新')
    .requiredOption('--status <status>')
    .action(async (id, opts) => {
      const status = OrderStatusSchema.parse(opts.status);
      const order = await svc.updateOrderStatus(db, Number(id), status);
      if (!order) { console.error('受注が見つかりません'); process.exit(1); }
      console.log('ステータスを更新しました:', order);
    });

  return cmd;
}
