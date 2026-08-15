import { createClient } from "@/lib/supabase/server";
import type { Addon, BusinessSettings, Product, SlotCapacity } from "@/types/domain";

const defaultSettings: BusinessSettings = {
  accepting_orders: true,
  morning_cutoff: "10:00",
  lunch_cutoff: "13:30",
  slot_capacity: 15,
  timezone: "Asia/Manila",
  payment_qr_url: null,
};
export async function getMenu(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .order("sort_order");
  return (data ?? []) as unknown as Product[];
}
export async function getAddons(): Promise<Addon[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("addons").select("*").order("sort_order");
  return (data ?? []) as unknown as Addon[];
}
export async function getSettings(): Promise<BusinessSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return (data as unknown as BusinessSettings | null) ?? defaultSettings;
}
export async function getSlotCapacity(date: string): Promise<SlotCapacity[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_slot_capacity", { p_fulfillment_date: date });
  return (data ?? []) as unknown as SlotCapacity[];
}
