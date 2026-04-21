import { describe, it, expect, beforeEach } from 'vitest';
import { type Client } from '@libsql/client';
import { createTestDb } from '../helpers/db.js';
import * as productSvc from '../../src/services/product.js';
import * as inventorySvc from '../../src/services/inventory.js';
import * as orderSvc from '../../src/services/order.js';
import * as dispatchSvc from '../../src/services/dispatch.js';
import * as svc from '../../src/services/accounting.js';

let db: Client;

beforeEach(async () => {
  db = await createTestDb();
  const p = await productSvc.createProduct(db, {
    sku: 'SKU-001', name: 'テスト商品',
    unit_price: 1000, cost_price: 500, reorder_point: 5,
  });
  await inventorySvc.receive(db, { product_id: p.id, quantity: 100, unit_cost: 500 });

  const order = await orderSvc.createOrder(db, {
    customer_name: '田中', customer_email: 't@example.com',
    items: [{ product_id: p.id, quantity: 2 }],
  });
  await orderSvc.updateOrderStatus(db, order.id, 'confirmed');
  await dispatchSvc.createShipment(db, { order_id: order.id });
});

describe('getSalesReport', () => {
  it('売上・原価・粗利を正しく計算する', async () => {
    const start = '2000-01-01T00:00:00.000Z';
    const end = '2099-12-31T23:59:59.999Z';
    const report = await svc.getSalesReport(db, start, end);
    expect(report.order_count).toBe(1);
    expect(report.total_revenue).toBe(2000);
    expect(report.total_cost).toBe(1000);   // 2個 × 移動平均原価 500
    expect(report.gross_profit).toBe(1000);
  });
});

describe('getInventoryValuation', () => {
  it('在庫評価額を返す', async () => {
    const rows = await svc.getInventoryValuation(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(98);       // 100 - 2
    expect(rows[0].avg_cost).toBe(500);
    expect(rows[0].total_value).toBe(49000);
  });
});

describe('getLowStockProducts', () => {
  it('発注点以下の商品を返す', async () => {
    // reorder_point=5, quantity=98 → 対象外
    const rows = await svc.getLowStockProducts(db);
    expect(rows).toHaveLength(0);
  });

  it('在庫が発注点以下になったら検出される', async () => {
    const p2 = await productSvc.createProduct(db, {
      sku: 'SKU-002', name: '低在庫商品',
      unit_price: 500, cost_price: 200, reorder_point: 10,
    });
    await inventorySvc.receive(db, { product_id: p2.id, quantity: 3, unit_cost: 200 });
    const rows = await svc.getLowStockProducts(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].sku).toBe('SKU-002');
  });
});
