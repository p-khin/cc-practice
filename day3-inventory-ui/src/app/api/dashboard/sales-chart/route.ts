import { NextResponse } from "next/server";
import { getSalesChartData } from "@/lib/dashboard";

export async function GET() {
  try {
    const data = getSalesChartData();
    return NextResponse.json({ data, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
