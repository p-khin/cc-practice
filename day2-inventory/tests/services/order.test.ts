import { describe, it, expect, beforeEach } from 'vitest';
import { type Client } from '@libsql/client';
import { createTestDb } from '../helpers/db.js';
import * as productSvc from '../../src/services/product.js';
import * as inventorySvc from '../../src/services/inventory.js';
import * as campaignSvc from '../../src/services/campaign.js';
import * as svc from '../../src/services/order.js';

let db: Client;
let productId: number;

beforeEach(async () => {
  db = await createTestDb();
  const p = await productSvc.createProduct(db, {
    sku: 'SKU-001', name: 'テスト商品',
    unit_price: 1000, cost_price: 500, reorder_point: 0,
  });
  productId = p.id;
  await inventorySvc.receive(db, { product_id: productId, quantity: 100, unit_cost: 500 });
});

describe('createOrder', () => {
  it('受注を作成できる', async () => {
    const order = await svc.createOrder(db, {
      customer_name: '田中太郎',
      customer_email: 'tanaka@example.com',
      items: [{ product_id: productId, quantity: 2 }],
    });
    expect(order.customer_name).toBe('田中太郎');
    expect(order.subtotal).toBe(2000);
    expect(order.total_amount).toBe(2000);
    expect(order.status).toBe('pending');
    expect(order.order_number).toMatch(/^ORD-/);
  });

  it('存在しない商品IDでエラー', async () => {
    await expect(
      svc.createOrder(db, {
        customer_name: '田中', customer_email: 'x@example.com',
        items: [{ product_id: 999, quantity: 1 }],
      })
    ).rejects.toThrow('Product not found');
  });

  it('パーセント割引キャンペーンが適用される', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 3600_000).toISOString();
    const end = new Date(now.getTime() + 3600_000).toISOString();
    const campaign = await campaignSvc.createCampaign(db, {
      name: '10%OFF', discount_type: 'percentage', discount_value: 10,
      min_order_amount: 0, starts_at: start, ends_at: end,
    });

    const order = await svc.createOrder(db, {
      customer_name: '鈴木', customer_email: 'suzuki@example.com',
      items: [{ product_id: productId, quantity: 1 }],
      campaign_id: campaign.id,
    });
    expect(order.discount_amount).toBe(100);   // 1000 * 10%
    expect(order.total_amount).toBe(900);
  });

  it('最低注文金額未満はキャンペーン割引なし', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 3600_000).toISOString();
    const end = new Date(now.getTime() + 3600_000).toISOString();
    const campaign = await campaignSvc.createCampaign(db, {
      name: '送料無料', discount_type: 'fixed', discount_value: 500,
      min_order_amount: 5000, starts_at: start, ends_at: end,
    });

    const order = await svc.createOrder(db, {
      customer_name: '佐藤', customer_email: 'sato@example.com',
      items: [{ product_id: productId, quantity: 1 }],  // 1000円 < 5000円
      campaign_id: campaign.id,
    });
    expect(order.discount_amount).toBe(0);
    expect(order.total_amount).toBe(1000);
  });
});

describe('updateOrderStatus', () => {
  it('ステータスを更新できる', async () => {
    const order = await svc.createOrder(db, {
      customer_name: 'テスト', customer_email: 't@example.com',
      items: [{ product_id: productId, quantity: 1 }],
    });
    const updated = await svc.updateOrderStatus(db, order.id, 'confirmed');
    expect(updated?.status).toBe('confirmed');
  });
});
