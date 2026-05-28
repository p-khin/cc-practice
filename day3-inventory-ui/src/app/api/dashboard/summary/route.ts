import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard";

export async function GET() {
  try {
    const data = getDashboardSummary();
    return NextResponse.json({ data, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
