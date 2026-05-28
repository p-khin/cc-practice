import type { OrderWithItems, Product, StockWithProduct } from "./mock-data";

export type DailySales = {
  date: string;
  label: string;
  sales: number;
  orders: number;
};

export type ProductSales = {
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  revenue: number;
};

export type InventoryItem = {
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  avg_cost: number;
  total_value: number;
};

export function getDailySales(
  orders: OrderWithItems[],
  from: string,
  to: string,
): DailySales[] {
  const toEnd = `${to}T23:59:59Z`;
  const filtered = orders.filter(
    (o) => o.created_at >= from && o.created_at <= toEnd,
  );

  const result: DailySales[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = filtered.filter((o) => o.created_at.startsWith(dateStr));
    result.push({
      date: dateStr,
      label: dateStr.slice(5).replace("-", "/"),
      sales: dayOrders.reduce((sum, o) => sum + o.total_amount, 0),
      orders: dayOrders.length,
    });
  }
  return result;
}

export function getProductSales(
  orders: OrderWithItems[],
  products: Product[],
  from: string,
  to: string,
): ProductSales[] {
  const toEnd = `${to}T23:59:59Z`;
  const filtered = orders.filter(
    (o) => o.created_at >= from && o.created_at <= toEnd,
  );

  const map = new Map<number, ProductSales>();
  for (const order of filtered) {
    for (const item of order.items) {
      const existing = map.get(item.product_id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.unit_price * item.quantity;
      } else {
        const product = products.find((p) => p.id === item.product_id);
        map.set(item.product_id, {
          product_id: item.product_id,
          product_name: product?.name ?? `商品 #${item.product_id}`,
          product_sku: product?.sku ?? "",
          quantity: item.quantity,
          revenue: item.unit_price * item.quantity,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export function getInventoryValuation(
  stocks: StockWithProduct[],
): InventoryItem[] {
  return stocks
    .map((s) => ({
      product_id: s.product_id,
      product_name: s.name,
      product_sku: s.sku,
      quantity: s.quantity,
      avg_cost: s.avg_cost,
      total_value: s.quantity * s.avg_cost,
    }))
    .sort((a, b) => b.total_value - a.total_value);
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export function downloadCSV(filename: string, content: string): void {
  const bom = "﻿";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
