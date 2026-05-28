import { NextResponse } from "next/server";
import {
  addStockMovement,
  getStockMovementsWithDetails,
  type StockMovementWithDetails,
} from "@/lib/mock-data";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("product_id");
  const warehouseId = searchParams.get("warehouse_id");
  const type = searchParams.get("type") as "in" | "out" | null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.max(1, Number(searchParams.get("per_page") ?? "10"));

  let movements: StockMovementWithDetails[] = getStockMovementsWithDetails()
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (productId) {
    movements = movements.filter((m) => m.product_id === Number(productId));
  }
  if (warehouseId) {
    movements = movements.filter((m) => m.warehouse_id === Number(warehouseId));
  }
  if (type === "in" || type === "out") {
    movements = movements.filter((m) => m.type === type);
  }
  if (from) {
    movements = movements.filter((m) => m.created_at >= from);
  }
  if (to) {
    const toEnd = to.length === 10 ? `${to}T23:59:59Z` : to;
    movements = movements.filter((m) => m.created_at <= toEnd);
  }

  const total = movements.length;
  const data = movements.slice((page - 1) * perPage, page * perPage);

  return NextResponse.json({ data, total, page, per_page: perPage });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { product_id, warehouse_id, type, quantity, memo } = body;

  if (!product_id || !warehouse_id || !type || !quantity) {
    return NextResponse.json(
      { error: "product_id, warehouse_id, type, quantity は必須です" },
      { status: 400 },
    );
  }

  if (type !== "in" && type !== "out") {
    return NextResponse.json(
      { error: "type は 'in' または 'out' である必要があります" },
      { status: 400 },
    );
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return NextResponse.json(
      { error: "数量は正の整数である必要があります" },
      { status: 400 },
    );
  }

  const result = addStockMovement({
    product_id: Number(product_id),
    warehouse_id: Number(warehouse_id),
    type,
    quantity: qty,
    memo: memo ?? undefined,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result.movement, { status: 201 });
}
