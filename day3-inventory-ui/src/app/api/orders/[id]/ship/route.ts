import { NextResponse } from "next/server";
import { createShipment } from "@/lib/mock-data";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const { carrier, tracking_number } = body;

  if (!carrier || !tracking_number) {
    return NextResponse.json(
      { error: "carrier と tracking_number は必須です" },
      { status: 400 },
    );
  }

  const result = createShipment({
    order_id: Number(params.id),
    carrier,
    tracking_number,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.shipment, { status: 201 });
}
