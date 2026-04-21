import { Command } from 'commander';
import { type Client } from '@libsql/client';
import * as svc from '../services/accounting.js';

export function buildAccountingCommand(db: Client): Command {
  const cmd = new Command('accounting').description('会計・レポート');

  cmd
    .command('sales')
    .description('売上レポート')
    .requiredOption('--from <datetime>', '期間開始 (ISO8601)')
    .requiredOption('--to <datetime>', '期間終了 (ISO8601)')
    .action(async (opts) => {
      const report = await svc.getSalesReport(db, opts.from, opts.to);
      console.log('\n=== 売上レポート ===');
      console.log(`期間: ${report.period_start} 〜 ${report.period_end}`);
      console.log(`受注数:     ${report.order_count}`);
      console.log(`売上合計:   ¥${report.total_revenue.toFixed(2)}`);
      console.log(`売上原価:   ¥${report.total_cost.toFixed(2)}`);
      console.log(`粗利:       ¥${report.gross_profit.toFixed(2)}`);
    });

  cmd
    .command('valuation')
    .description('在庫評価レポート')
    .action(async () => {
      const rows = await svc.getInventoryValuation(db);
      console.log('\n=== 在庫評価 ===');
      console.table(rows.map((r) => ({
        sku: r.sku, name: r.name,
        quantity: r.quantity,
        avg_cost: r.avg_cost.toFixed(2),
        total_value: r.total_value.toFixed(2),
      })));
    });

  cmd
    .command('low-stock')
    .description('発注点以下の商品一覧')
    .action(async () => {
      const rows = await svc.getLowStockProducts(db);
      if (rows.length === 0) {
        console.log('発注点以下の商品はありません');
        return;
      }
      console.table(rows);
    });

  return cmd;
}
