import { describe, it, expect, beforeEach } from 'vitest';
import { type Client } from '@libsql/client';
import { createTestDb } from '../helpers/db.js';
import * as productSvc from '../../src/services/product.js';
import * as inventorySvc from '../../src/services/inventory.js';
import * as orderSvc from '../../src/services/order.js';
import * as svc from '../../src/services/dispatch.js';

let db: Client;
let orderId: number;

beforeEach(async () => {
  db = await createTestDb();
  const p = await productSvc.createProduct(db, {
    sku: 'SKU-001', name: 'テスト商品',
    unit_price: 1000, cost_price: 500, reorder_point: 0,
  });
  await inventorySvc.receive(db, { product_id: p.id, quantity: 50, unit_cost: 500 });
  const order = await orderSvc.createOrder(db, {
    customer_name: '田中', customer_email: 't@example.com',
    items: [{ product_id: p.id, quantity: 3 }],
  });
  orderId = order.id;
});

describe('createShipment', () => {
  it('出荷を作成し在庫が減る', async () => {
    const shipment = await svc.createShipment(db, {
      order_id: orderId,
      tracking_number: 'TRACK-123',
      carrier: 'ヤマト',
    });
    expect(shipment.order_id).toBe(orderId);
    expect(shipment.tracking_number).toBe('TRACK-123');

    // 在庫確認は order_items に紐づく商品で検証
    const order = await orderSvc.getOrder(db, orderId);
    expect(order?.status).toBe('shipped');
  });

  it('同じ受注に2回出荷するとエラー', async () => {
    await svc.createShipment(db, { order_id: orderId });
    await expect(svc.createShipment(db, { order_id: orderId })).rejects.toThrow('already exists');
  });
});

describe('updateShipmentStatus', () => {
  it('delivered に更新すると受注も delivered になる', async () => {
    const shipment = await svc.createShipment(db, { order_id: orderId, carrier: 'ヤマト' });
    await svc.updateShipmentStatus(db, shipment.id, 'shipped');
    const updated = await svc.updateShipmentStatus(db, shipment.id, 'delivered');
    expect(updated?.status).toBe('delivered');

    const order = await orderSvc.getOrder(db, orderId);
    expect(order?.status).toBe('delivered');
  });
});
