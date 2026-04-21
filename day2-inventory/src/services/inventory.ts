import { type Client } from '@libsql/client';
import {
  type Inventory,
  type ReceivingSlip,
  type CreateReceivingSlipInput,
  type StockAdjustmentInput,
} from '../types/index.js';

export async function getInventory(db: Client, productId: number): Promise<Inventory | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM inventory WHERE product_id = ?',
    args: [productId],
  });
  return (result.rows[0] as unknown as Inventory) ?? null;
}

export async function listInventory(db: Client): Promise<Inventory[]> {
  const result = await db.execute(`
    SELECT i.*, p.sku, p.name, p.reorder_point
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    ORDER BY p.sku
  `);
  return result.rows as unknown as Inventory[];
}

export async function receive(
  db: Client,
  input: CreateReceivingSlipInput
): Promise<ReceivingSlip> {
  // Insert receiving slip
  const slipResult = await db.execute({
    sql: `INSERT INTO receiving_slips (product_id, quantity, unit_cost, supplier, note)
          VALUES (:product_id, :quantity, :unit_cost, :supplier, :note)
          RETURNING *`,
    args: {
      product_id: input.product_id,
      quantity: input.quantity,
      unit_cost: input.unit_cost,
      supplier: input.supplier ?? null,
      note: input.note ?? null,
    },
  });
  const slip = slipResult.rows[0] as unknown as ReceivingSlip;

  // Upsert inventory with moving average cost calculation
  await db.execute({
    sql: `INSERT INTO inventory (product_id, quantity, avg_cost)
          VALUES (:product_id, :quantity, :unit_cost)
          ON CONFLICT (product_id) DO UPDATE SET
            avg_cost   = (inventory.quantity * inventory.avg_cost + :quantity * :unit_cost)
                         / (inventory.quantity + :quantity),
            quantity   = inventory.quantity + :quantity,
            updated_at = datetime('now')`,
    args: {
      product_id: input.product_id,
      quantity: input.quantity,
      unit_cost: input.unit_cost,
    },
  });

  // Record stock movement
  const inv = await getInventory(db, input.product_id);
  await db.execute({
    sql: `INSERT INTO stock_movements
            (product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, note)
          VALUES (?, 'receive', ?, ?, 'receiving_slip', ?, ?)`,
    args: [
      input.product_id,
      input.quantity,
      inv?.avg_cost ?? input.unit_cost,
      slip.id,
      input.note ?? null,
    ],
  });

  return slip;
}

export async function ship(
  db: Client,
  productId: number,
  quantity: number,
  shipmentId: number
): Promise<void> {
  const inv = await getInventory(db, productId);
  if (!inv || inv.quantity < quantity) {
    throw new Error(`Insufficient stock for product ${productId}`);
  }

  await db.execute({
    sql: `UPDATE inventory
          SET quantity = quantity - ?, updated_at = datetime('now')
          WHERE product_id = ?`,
    args: [quantity, productId],
  });

  await db.execute({
    sql: `INSERT INTO stock_movements
            (product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id)
          VALUES (?, 'ship', ?, ?, 'shipment', ?)`,
    args: [productId, -quantity, inv.avg_cost, shipmentId],
  });
}

export async function adjustStock(
  db: Client,
  input: StockAdjustmentInput
): Promise<void> {
  const inv = await getInventory(db, input.product_id);
  const currentQty = inv?.quantity ?? 0;

  if (currentQty + input.quantity_delta < 0) {
    throw new Error('Adjustment would result in negative stock');
  }

  if (inv) {
    await db.execute({
      sql: `UPDATE inventory
            SET quantity = quantity + ?, updated_at = datetime('now')
            WHERE product_id = ?`,
      args: [input.quantity_delta, input.product_id],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO inventory (product_id, quantity, avg_cost) VALUES (?, ?, 0)`,
      args: [input.product_id, input.quantity_delta],
    });
  }

  await db.execute({
    sql: `INSERT INTO stock_movements
            (product_id, movement_type, quantity_delta, unit_cost, reference_type, note)
          VALUES (?, 'adjust', ?, ?, 'adjustment', ?)`,
    args: [
      input.product_id,
      input.quantity_delta,
      inv?.avg_cost ?? 0,
      input.note ?? null,
    ],
  });
}
