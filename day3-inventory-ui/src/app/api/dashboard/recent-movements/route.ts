import { NextResponse } from "next/server";
import { getRecentMovements } from "@/lib/dashboard";

export async function GET() {
  try {
    const data = getRecentMovements(10);
    return NextResponse.json({ data, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
