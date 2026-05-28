import { NextResponse } from "next/server";
import { createOrder, getOrders } from "@/lib/mock-data";

export function GET() {
  return NextResponse.json(getOrders());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { customer_name, customer_email, items } = body;

  if (!customer_name || !customer_email || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "customer_name, customer_email, and items[] are required" },
      { status: 400 }
    );
  }

  const order = createOrder({ customer_name, customer_email, items });
  return NextResponse.json(order, { status: 201 });
}
