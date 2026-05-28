import { ProductsClient } from "./_components/ProductsClient";
import type { Product } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function getData(): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("商品データの取得に失敗しました");
  return res.json();
}

export default async function ProductsPage() {
  const products = await getData();
  return <ProductsClient products={products} />;
}
