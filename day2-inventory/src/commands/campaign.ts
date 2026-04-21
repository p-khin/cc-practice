import { Command } from 'commander';
import { type Client } from '@libsql/client';
import { CreateCampaignSchema } from '../schemas/index.js';
import * as svc from '../services/campaign.js';

export function buildCampaignCommand(db: Client): Command {
  const cmd = new Command('campaign').description('キャンペーン管理');

  cmd
    .command('add')
    .description('キャンペーンを作成')
    .requiredOption('--name <name>')
    .requiredOption('--type <type>', 'percentage または fixed')
    .requiredOption('--value <value>', '割引値', parseFloat)
    .requiredOption('--start <datetime>', '開始日時 (ISO8601)')
    .requiredOption('--end <datetime>', '終了日時 (ISO8601)')
    .option('--min-amount <amount>', '最低注文金額', parseFloat)
    .action(async (opts) => {
      const input = CreateCampaignSchema.parse({
        name: opts.name,
        discount_type: opts.type,
        discount_value: opts.value,
        min_order_amount: opts.minAmount,
        starts_at: opts.start,
        ends_at: opts.end,
      });
      const campaign = await svc.createCampaign(db, input);
      console.log('キャンペーンを作成しました:', campaign);
    });

  cmd
    .command('list')
    .description('キャンペーン一覧')
    .action(async () => {
      const campaigns = await svc.listCampaigns(db);
      console.table(campaigns.map((c) => ({
        id: c.id, name: c.name,
        type: c.discount_type, value: c.discount_value,
        starts_at: c.starts_at, ends_at: c.ends_at, active: c.is_active,
      })));
    });

  cmd
    .command('deactivate <id>')
    .description('キャンペーンを無効化')
    .action(async (id) => {
      const ok = await svc.deactivateCampaign(db, Number(id));
      if (!ok) { console.error('キャンペーンが見つかりません'); process.exit(1); }
      console.log('無効化しました');
    });

  return cmd;
}
