import { NextResponse } from "next/server";
import {
  getOrderById,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/mock-data";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export function GET(_request: Request, { params }: { params: { id: string } }) {
  const order = getOrderById(Number(params.id));
  if (!order) {
    return NextResponse.json(
      { error: "受注が見つかりません" },
      { status: 404 },
    );
  }
  return NextResponse.json(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "有効なステータスを指定してください" },
      { status: 400 },
    );
  }

  const order = updateOrderStatus(Number(params.id), status as OrderStatus);
  if (!order) {
    return NextResponse.json(
      { error: "受注が見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}
