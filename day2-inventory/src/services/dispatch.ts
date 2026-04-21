import { type Client } from '@libsql/client';
import { type Shipment, type CreateShipmentInput, type ShipmentStatus } from '../types/index.js';
import { getOrderItems, updateOrderStatus } from './order.js';
import { ship } from './inventory.js';

export async function createShipment(
  db: Client,
  input: CreateShipmentInput
): Promise<Shipment> {
  const existing = await db.execute({
    sql: 'SELECT id FROM shipments WHERE order_id = ?',
    args: [input.order_id],
  });
  if (existing.rows.length > 0) {
    throw new Error(`Shipment already exists for order ${input.order_id}`);
  }

  const result = await db.execute({
    sql: `INSERT INTO shipments (order_id, tracking_number, carrier)
          VALUES (:order_id, :tracking_number, :carrier)
          RETURNING *`,
    args: {
      order_id: input.order_id,
      tracking_number: input.tracking_number ?? null,
      carrier: input.carrier ?? null,
    },
  });
  const shipment = result.rows[0] as unknown as Shipment;

  // Deduct stock for each order item
  const items = await getOrderItems(db, input.order_id);
  for (const item of items) {
    await ship(db, item.product_id, item.quantity, shipment.id);
  }

  await updateOrderStatus(db, input.order_id, 'shipped');

  return shipment;
}

export async function listShipments(db: Client): Promise<Shipment[]> {
  const result = await db.execute('SELECT * FROM shipments ORDER BY created_at DESC');
  return result.rows as unknown as Shipment[];
}

export async function getShipment(db: Client, id: number): Promise<Shipment | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM shipments WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Shipment) ?? null;
}

export async function updateShipmentStatus(
  db: Client,
  id: number,
  status: ShipmentStatus,
  opts?: { tracking_number?: string; carrier?: string }
): Promise<Shipment | null> {
  const now = new Date().toISOString();
  const shipped_at = status === 'shipped' ? now : null;
  const delivered_at = status === 'delivered' ? now : null;

  const result = await db.execute({
    sql: `UPDATE shipments
          SET status          = :status,
              shipped_at      = COALESCE(:shipped_at,   shipped_at),
              delivered_at    = COALESCE(:delivered_at, delivered_at),
              tracking_number = COALESCE(:tracking_number, tracking_number),
              carrier         = COALESCE(:carrier,         carrier)
          WHERE id = :id
          RETURNING *`,
    args: {
      id,
      status,
      shipped_at,
      delivered_at,
      tracking_number: opts?.tracking_number ?? null,
      carrier: opts?.carrier ?? null,
    },
  });

  const shipment = (result.rows[0] as unknown as Shipment) ?? null;
  if (shipment && status === 'delivered') {
    await updateOrderStatus(db, shipment.order_id, 'delivered');
  }
  return shipment;
}
