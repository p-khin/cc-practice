import { type Client } from '@libsql/client';
import { type SalesReport, type InventoryValuation } from '../types/index.js';

export async function getSalesReport(
  db: Client,
  periodStart: string,
  periodEnd: string
): Promise<SalesReport> {
  // Revenue from delivered/shipped orders
  const revenueResult = await db.execute({
    sql: `SELECT
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount), 0) as total_revenue
          FROM orders
          WHERE status IN ('shipped', 'delivered')
            AND created_at >= ? AND created_at <= ?`,
    args: [periodStart, periodEnd],
  });
  const { order_count, total_revenue } = revenueResult.rows[0] as unknown as {
    order_count: number;
    total_revenue: number;
  };

  // COGS from ship movements in the period
  const cogsResult = await db.execute({
    sql: `SELECT COALESCE(SUM(ABS(quantity_delta) * unit_cost), 0) as total_cost
          FROM stock_movements
          WHERE movement_type = 'ship'
            AND created_at >= ? AND created_at <= ?`,
    args: [periodStart, periodEnd],
  });
  const { total_cost } = cogsResult.rows[0] as unknown as { total_cost: number };

  return {
    period_start: periodStart,
    period_end: periodEnd,
    total_revenue,
    total_cost,
    gross_profit: total_revenue - total_cost,
    order_count: Number(order_count),
  };
}

export async function getInventoryValuation(db: Client): Promise<InventoryValuation[]> {
  const result = await db.execute(`
    SELECT
      i.product_id,
      p.sku,
      p.name,
      i.quantity,
      i.avg_cost,
      i.quantity * i.avg_cost AS total_value
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    WHERE i.quantity > 0
    ORDER BY total_value DESC
  `);
  return result.rows as unknown as InventoryValuation[];
}

export async function getLowStockProducts(db: Client): Promise<
  Array<{ product_id: number; sku: string; name: string; quantity: number; reorder_point: number }>
> {
  const result = await db.execute(`
    SELECT
      i.product_id,
      p.sku,
      p.name,
      i.quantity,
      p.reorder_point
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    WHERE i.quantity <= p.reorder_point
    ORDER BY i.quantity ASC
  `);
  return result.rows as unknown as Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    reorder_point: number;
  }>;
}
