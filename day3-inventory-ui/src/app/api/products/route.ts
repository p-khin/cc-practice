import { NextResponse } from "next/server";
import { createProduct, getProducts } from "@/lib/mock-data";

export function GET() {
  return NextResponse.json(getProducts());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { sku, name, description, unit_price, cost_price, reorder_point } = body;

  if (!sku || !name || unit_price == null || cost_price == null) {
    return NextResponse.json({ error: "sku, name, unit_price, cost_price are required" }, { status: 400 });
  }

  const product = createProduct({
    sku,
    name,
    description: description ?? null,
    unit_price: Number(unit_price),
    cost_price: Number(cost_price),
    reorder_point: Number(reorder_point ?? 0),
  });

  return NextResponse.json(product, { status: 201 });
}
