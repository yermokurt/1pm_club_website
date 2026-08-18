import { NextRequest, NextResponse } from "next/server";
import { getSettings, getSlotCapacity } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

type CapacityOrder = {
  order_status: string;
  order_items: Array<{ quantity: number }> | null;
};

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  try {
    const admin = createAdminClient();
    const [{ data: orders, error }, settings] = await Promise.all([
      admin
        .from("orders")
        .select("order_status,order_items(quantity)")
        .eq("fulfillment_date", date),
      getSettings(),
    ]);
    if (error) throw error;
    const reservedCups = ((orders ?? []) as unknown as CapacityOrder[])
      .filter((order) => !["rejected", "cancelled"].includes(order.order_status))
      .reduce(
        (total, order) =>
          total + (order.order_items ?? []).reduce((cups, item) => cups + item.quantity, 0),
        0,
      );
    return NextResponse.json(
      ["morning", "lunch"].map((time_slot) => ({
        time_slot,
        reserved_cups: reservedCups,
        capacity: settings.slot_capacity,
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Keep checkout available for environments without the server-only key.
    return NextResponse.json(await getSlotCapacity(date), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
