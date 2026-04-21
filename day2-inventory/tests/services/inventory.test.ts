import { describe, it, expect, beforeEach } from 'vitest';
import { type Client } from '@libsql/client';
import { createTestDb } from '../helpers/db.js';
import * as productSvc from '../../src/services/product.js';
import * as svc from '../../src/services/inventory.js';

let db: Client;
let productId: number;

beforeEach(async () => {
  db = await createTestDb();
  const p = await productSvc.createProduct(db, {
    sku: 'SKU-001', name: 'テスト商品',
    unit_price: 1000, cost_price: 500, reorder_point: 5,
  });
  productId = p.id;
});

describe('receive', () => {
  it('入庫で在庫が増える', async () => {
    await svc.receive(db, { product_id: productId, quantity: 10, unit_cost: 500 });
    const inv = await svc.getInventory(db, productId);
    expect(inv?.quantity).toBe(10);
    expect(inv?.avg_cost).toBe(500);
  });

  it('2回入庫すると移動平均原価が正しく計算される', async () => {
    await svc.receive(db, { product_id: productId, quantity: 10, unit_cost: 500 });
    await svc.receive(db, { product_id: productId, quantity: 10, unit_cost: 700 });
    const inv = await svc.getInventory(db, productId);
    expect(inv?.quantity).toBe(20);
    // (10*500 + 10*700) / 20 = 600
    expect(inv?.avg_cost).toBe(600);
  });
});

describe('ship', () => {
  it('出庫で在庫が減る', async () => {
    await svc.receive(db, { product_id: productId, quantity: 20, unit_cost: 500 });
    await svc.ship(db, productId, 5, 1);
    const inv = await svc.getInventory(db, productId);
    expect(inv?.quantity).toBe(15);
  });

  it('在庫不足でエラー', async () => {
    await svc.receive(db, { product_id: productId, quantity: 3, unit_cost: 500 });
    await expect(svc.ship(db, productId, 5, 1)).rejects.toThrow('Insufficient stock');
  });
});

describe('adjustStock', () => {
  it('在庫をプラス調整できる', async () => {
    await svc.receive(db, { product_id: productId, quantity: 10, unit_cost: 500 });
    await svc.adjustStock(db, { product_id: productId, quantity_delta: 5, note: '棚卸調整' });
    const inv = await svc.getInventory(db, productId);
    expect(inv?.quantity).toBe(15);
  });

  it('在庫をマイナス調整できる', async () => {
    await svc.receive(db, { product_id: productId, quantity: 10, unit_cost: 500 });
    await svc.adjustStock(db, { product_id: productId, quantity_delta: -3 });
    const inv = await svc.getInventory(db, productId);
    expect(inv?.quantity).toBe(7);
  });

  it('マイナス在庫になる調整はエラー', async () => {
    await svc.receive(db, { product_id: productId, quantity: 10, unit_cost: 500 });
    await expect(
      svc.adjustStock(db, { product_id: productId, quantity_delta: -20 })
    ).rejects.toThrow('negative stock');
  });
});
