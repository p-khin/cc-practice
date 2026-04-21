import { Command } from 'commander';
import { type Client } from '@libsql/client';
import { CreateProductSchema, UpdateProductSchema } from '../schemas/index.js';
import * as svc from '../services/product.js';

export function buildProductCommand(db: Client): Command {
  const cmd = new Command('product').description('商品管理');

  cmd
    .command('add')
    .description('商品を追加')
    .requiredOption('--sku <sku>')
    .requiredOption('--name <name>')
    .requiredOption('--price <price>', '販売単価', parseFloat)
    .requiredOption('--cost <cost>', '仕入原価', parseFloat)
    .option('--desc <description>')
    .option('--reorder <point>', '発注点', parseInt)
    .action(async (opts) => {
      const input = CreateProductSchema.parse({
        sku: opts.sku,
        name: opts.name,
        description: opts.desc,
        unit_price: opts.price,
        cost_price: opts.cost,
        reorder_point: opts.reorder,
      });
      const product = await svc.createProduct(db, input);
      console.log('商品を追加しました:', product);
    });

  cmd
    .command('list')
    .description('商品一覧')
    .action(async () => {
      const products = await svc.listProducts(db);
      console.table(products.map((p) => ({
        id: p.id, sku: p.sku, name: p.name,
        unit_price: p.unit_price, cost_price: p.cost_price, reorder_point: p.reorder_point,
      })));
    });

  cmd
    .command('update <id>')
    .description('商品を更新')
    .option('--name <name>')
    .option('--price <price>', '販売単価', parseFloat)
    .option('--cost <cost>', '仕入原価', parseFloat)
    .option('--desc <description>')
    .option('--reorder <point>', '発注点', parseInt)
    .action(async (id, opts) => {
      const input = UpdateProductSchema.parse({
        name: opts.name,
        unit_price: opts.price,
        cost_price: opts.cost,
        description: opts.desc,
        reorder_point: opts.reorder,
      });
      const product = await svc.updateProduct(db, Number(id), input);
      if (!product) { console.error('商品が見つかりません'); process.exit(1); }
      console.log('更新しました:', product);
    });

  cmd
    .command('delete <id>')
    .description('商品を削除')
    .action(async (id) => {
      const ok = await svc.deleteProduct(db, Number(id));
      if (!ok) { console.error('商品が見つかりません'); process.exit(1); }
      console.log('削除しました');
    });

  return cmd;
}
