import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendFulfillmentEmail(orderId: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return;
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "customer_email_snapshot,customer_name_snapshot,order_number,order_method,fulfillment_date,time_slot,order_status,ready_email_sent_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  const value = order as unknown as {
    customer_email_snapshot: string | null;
    customer_name_snapshot: string;
    order_number: number;
    order_method: string;
    fulfillment_date: string;
    time_slot: string;
    order_status: string;
    ready_email_sent_at: string | null;
  } | null;
  if (
    !value ||
    !value.customer_email_snapshot ||
    value.ready_email_sent_at ||
    !["ready_for_pickup", "to_be_delivered"].includes(value.order_status)
  )
    return;
  const { data: log } = await supabase
    .from("email_logs")
    .insert({
      order_id: orderId,
      email_type: "fulfillment_ready",
      recipient: value.customer_email_snapshot,
      status: "sending",
    })
    .select("id")
    .maybeSingle();
  if (!log) return;
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: value.customer_email_snapshot,
      subject: `Your 1PM Club order #${value.order_number} is ready`,
      html: `<p>Hi ${value.customer_name_snapshot},</p><p>Your order <strong>#${value.order_number}</strong> is ${value.order_method === "pickup" ? "ready for pickup" : "on its way to your department"}.</p><p>Fulfilment: ${value.fulfillment_date}, ${value.time_slot}.</p>`,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("email_logs")
      .update({
        status: "sent",
        provider_message_id: data?.id ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", (log as { id: string }).id);
    await supabase
      .from("orders")
      .update({ ready_email_sent_at: new Date().toISOString() })
      .eq("id", orderId);
  } catch (error) {
    await supabase
      .from("email_logs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown Resend error",
      })
      .eq("id", (log as { id: string }).id);
  }
}
