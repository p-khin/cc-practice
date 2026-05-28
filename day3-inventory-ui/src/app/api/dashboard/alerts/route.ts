import { NextResponse } from "next/server";
import { getLowStockAlerts } from "@/lib/dashboard";

export async function GET() {
  try {
    const data = getLowStockAlerts();
    return NextResponse.json({ data, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
