import { NextRequest, NextResponse } from "next/server";
import { getSlotCapacity } from "@/lib/data";
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  return NextResponse.json(await getSlotCapacity(date), {
    headers: { "Cache-Control": "no-store" },
  });
}
