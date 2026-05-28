import { NextResponse } from "next/server";
import { adjustStock, getStocks } from "@/lib/mock-data";

export function GET() {
  return NextResponse.json(getStocks());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { product_id, quantity_delta } = body;

  if (product_id == null || quantity_delta == null) {
    return NextResponse.json({ error: "product_id and quantity_delta are required" }, { status: 400 });
  }

  const stock = adjustStock(Number(product_id), Number(quantity_delta));
  if (!stock) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(stock);
}
