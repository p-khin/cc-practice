import { OrdersClient } from "./_components/OrdersClient";
import type { OrderWithItems, Product } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function getData(): Promise<{
  orders: OrderWithItems[];
  products: Product[];
}> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const [ordersRes, productsRes] = await Promise.all([
    fetch(`${base}/api/orders`, { cache: "no-store" }),
    fetch(`${base}/api/products`, { cache: "no-store" }),
  ]);
  if (!ordersRes.ok) throw new Error("受注データの取得に失敗しました");
  if (!productsRes.ok) throw new Error("商品データの取得に失敗しました");
  const [orders, products] = await Promise.all([
    ordersRes.json() as Promise<OrderWithItems[]>,
    productsRes.json() as Promise<Product[]>,
  ]);
  return { orders, products };
}

export default async function OrdersPage() {
  const { orders, products } = await getData();
  return <OrdersClient orders={orders} products={products} />;
}
