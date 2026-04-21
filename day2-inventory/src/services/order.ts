import { type Client } from '@libsql/client';
import { type Order, type OrderItem, type CreateOrderInput, type OrderStatus } from '../types/index.js';
import { getActiveCampaign, calcDiscount } from './campaign.js';
import { getProduct } from './product.js';

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export async function createOrder(db: Client, input: CreateOrderInput): Promise<Order> {
  // Resolve unit prices and subtotal
  let subtotal = 0;
  const resolvedItems: Array<{ product_id: number; quantity: number; unit_price: number }> = [];

  for (const item of input.items) {
    const product = await getProduct(db, item.product_id);
    if (!product) throw new Error(`Product not found: ${item.product_id}`);
    const unit_price = product.unit_price;
    subtotal += unit_price * item.quantity;
    resolvedItems.push({ product_id: item.product_id, quantity: item.quantity, unit_price });
  }

  // Apply campaign discount
  let discount_amount = 0;
  const now = new Date().toISOString();
  if (input.campaign_id) {
    const campaign = await getActiveCampaign(db, input.campaign_id, now);
    if (campaign) {
      discount_amount = calcDiscount(campaign, subtotal);
    }
  }

  const total_amount = subtotal - discount_amount;
  const order_number = generateOrderNumber();

  const orderResult = await db.execute({
    sql: `INSERT INTO orders
            (order_number, customer_name, customer_email, subtotal, discount_amount, total_amount, campaign_id)
          VALUES (:order_number, :customer_name, :customer_email, :subtotal, :discount_amount, :total_amount, :campaign_id)
          RETURNING *`,
    args: {
      order_number,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      subtotal,
      discount_amount,
      total_amount,
      campaign_id: input.campaign_id ?? null,
    },
  });
  const order = orderResult.rows[0] as unknown as Order;

  for (const item of resolvedItems) {
    await db.execute({
      sql: `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?)`,
      args: [order.id, item.product_id, item.quantity, item.unit_price],
    });
  }

  return order;
}

export async function listOrders(db: Client): Promise<Order[]> {
  const result = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
  return result.rows as unknown as Order[];
}

export async function getOrder(db: Client, id: number): Promise<Order | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM orders WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Order) ?? null;
}

export async function getOrderItems(db: Client, orderId: number): Promise<OrderItem[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM order_items WHERE order_id = ?',
    args: [orderId],
  });
  return result.rows as unknown as OrderItem[];
}

export async function updateOrderStatus(
  db: Client,
  id: number,
  status: OrderStatus
): Promise<Order | null> {
  const result = await db.execute({
    sql: `UPDATE orders
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?
          RETURNING *`,
    args: [status, id],
  });
  return (result.rows[0] as unknown as Order) ?? null;
}
