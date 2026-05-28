import { StockClient } from "./_components/StockClient";
import { getWarehouses } from "@/lib/mock-data";
import type { Product, StockWithProduct } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function getData(): Promise<{
  products: Product[];
  stocks: StockWithProduct[];
}> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const [productsRes, stocksRes] = await Promise.all([
    fetch(`${base}/api/products`, { cache: "no-store" }),
    fetch(`${base}/api/stocks`, { cache: "no-store" }),
  ]);
  if (!productsRes.ok) throw new Error("商品データの取得に失敗しました");
  if (!stocksRes.ok) throw new Error("在庫データの取得に失敗しました");
  const [products, stocks] = await Promise.all([
    productsRes.json() as Promise<Product[]>,
    stocksRes.json() as Promise<StockWithProduct[]>,
  ]);
  return { products, stocks };
}

export default async function StockPage() {
  const { products, stocks } = await getData();
  const warehouses = getWarehouses();
  return (
    <StockClient products={products} stocks={stocks} warehouses={warehouses} />
  );
}
