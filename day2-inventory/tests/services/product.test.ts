import { describe, it, expect, beforeEach } from 'vitest';
import { type Client } from '@libsql/client';
import { createTestDb } from '../helpers/db.js';
import * as svc from '../../src/services/product.js';

let db: Client;

beforeEach(async () => {
  db = await createTestDb();
});

const baseInput = {
  sku: 'SKU-001',
  name: 'テスト商品',
  unit_price: 1000,
  cost_price: 500,
  reorder_point: 10,
};

describe('createProduct', () => {
  it('商品を作成できる', async () => {
    const p = await svc.createProduct(db, baseInput);
    expect(p.sku).toBe('SKU-001');
    expect(p.unit_price).toBe(1000);
    expect(p.id).toBeTypeOf('number');
  });

  it('SKU が重複するとエラー', async () => {
    await svc.createProduct(db, baseInput);
    await expect(svc.createProduct(db, baseInput)).rejects.toThrow();
  });
});

describe('listProducts', () => {
  it('作成した商品が一覧に含まれる', async () => {
    await svc.createProduct(db, baseInput);
    await svc.createProduct(db, { ...baseInput, sku: 'SKU-002', name: '商品2' });
    const list = await svc.listProducts(db);
    expect(list).toHaveLength(2);
  });
});

describe('updateProduct', () => {
  it('名前と価格を更新できる', async () => {
    const p = await svc.createProduct(db, baseInput);
    const updated = await svc.updateProduct(db, p.id, { name: '更新商品', unit_price: 1500 });
    expect(updated?.name).toBe('更新商品');
    expect(updated?.unit_price).toBe(1500);
    expect(updated?.sku).toBe('SKU-001');
  });

  it('存在しない ID は null を返す', async () => {
    const result = await svc.updateProduct(db, 999, { name: 'x' });
    expect(result).toBeNull();
  });
});

describe('deleteProduct', () => {
  it('商品を削除できる', async () => {
    const p = await svc.createProduct(db, baseInput);
    const ok = await svc.deleteProduct(db, p.id);
    expect(ok).toBe(true);
    expect(await svc.getProduct(db, p.id)).toBeNull();
  });

  it('存在しない ID は false を返す', async () => {
    expect(await svc.deleteProduct(db, 999)).toBe(false);
  });
});
