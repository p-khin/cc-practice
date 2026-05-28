import { ReportsClient } from "./_components/ReportsClient";
import type {
  OrderWithItems,
  Product,
  StockWithProduct,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function getData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const [ordersRes, productsRes, stocksRes] = await Promise.all([
    fetch(`${base}/api/orders`, { cache: "no-store" }),
    fetch(`${base}/api/products`, { cache: "no-store" }),
    fetch(`${base}/api/stocks`, { cache: "no-store" }),
  ]);
  if (!ordersRes.ok) throw new Error("受注データの取得に失敗しました");
  if (!productsRes.ok) throw new Error("商品データの取得に失敗しました");
  if (!stocksRes.ok) throw new Error("在庫データの取得に失敗しました");
  const [orders, products, stocks] = await Promise.all([
    ordersRes.json() as Promise<OrderWithItems[]>,
    productsRes.json() as Promise<Product[]>,
    stocksRes.json() as Promise<StockWithProduct[]>,
  ]);
  return { orders, products, stocks };
}

export default async function ReportsPage() {
  const { orders, products, stocks } = await getData();
  return <ReportsClient orders={orders} products={products} stocks={stocks} />;
}
