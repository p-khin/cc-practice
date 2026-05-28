import { NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/mock-data";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const updated = updateProduct(id, {
    sku: body.sku,
    name: body.name,
    description: body.description ?? null,
    unit_price: body.unit_price != null ? Number(body.unit_price) : undefined,
    cost_price: body.cost_price != null ? Number(body.cost_price) : undefined,
    reorder_point: body.reorder_point != null ? Number(body.reorder_point) : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ok = deleteProduct(id);
  if (!ok) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
