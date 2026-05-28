import {
  getProducts,
  getStocks,
  getOrders,
  getStockMovements,
} from "./mock-data";

export type DashboardSummary = {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
};

export function getDashboardSummary(): DashboardSummary {
  const stocks = getStocks();
  return {
    totalProducts: getProducts().length,
    totalStock: stocks.reduce((sum, s) => sum + s.quantity, 0),
    totalValue: stocks.reduce((sum, s) => sum + s.quantity * s.avg_cost, 0),
  };
}

export type RecentMovement = {
  id: number;
  date: string;
  productName: string;
  type: "in" | "out";
  quantity: number;
};

export function getRecentMovements(limit = 10): RecentMovement[] {
  const movements = getStockMovements();
  const products = getProducts();
  return movements
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      date: m.created_at,
      productName: products.find((p) => p.id === m.product_id)?.name ?? "不明",
      type: m.type,
      quantity: m.quantity,
    }));
}

export type StockAlert = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  reorderPoint: number;
};

export function getLowStockAlerts(): StockAlert[] {
  return getStocks()
    .filter((s) => s.quantity < s.reorder_point)
    .map((s) => ({
      id: s.id,
      sku: s.sku,
      name: s.name,
      quantity: s.quantity,
      reorderPoint: s.reorder_point,
    }));
}

export type SalesChartPoint = {
  date: string;
  sales: number;
};

export function getSalesChartData(): SalesChartPoint[] {
  const orders = getOrders();
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const sales = orders
      .filter((o) => o.created_at.startsWith(dateStr))
      .reduce((sum, o) => sum + o.total_amount, 0);
    return { date: dateStr, sales };
  });
}
