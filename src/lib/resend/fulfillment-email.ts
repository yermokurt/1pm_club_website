import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });

export type FulfillmentEmailResult = {
  sent: boolean;
  message: string;
};

export async function sendFulfillmentEmail(orderId: string): Promise<FulfillmentEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !password || !from)
    return { sent: false, message: "Email was not sent: Gmail SMTP is not configured." };
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "customer_email_snapshot,customer_name_snapshot,order_number,order_method,fulfillment_date,time_slot,order_status,payment_status,ready_email_sent_at",
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
    payment_status: string;
    ready_email_sent_at: string | null;
  } | null;
  if (
    !value ||
    !value.customer_email_snapshot ||
    value.ready_email_sent_at ||
    !["ready_for_pickup", "to_be_delivered"].includes(value.order_status)
  )
    return {
      sent: false,
      message: !value?.customer_email_snapshot
        ? "Email was not sent: this order has no customer email."
        : "A fulfillment email is not due for this order.",
    };
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
  if (!log)
    return { sent: false, message: "Email could not be queued. Check email_logs permissions." };
  try {
    const isDelivery = value.order_method === "delivery";
    const fulfilmentText = isDelivery ? "On its way to you" : "Ready for pickup";
    const customerName = escapeHtml(value.customer_name_snapshot);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
    const data = await transporter.sendMail({
      from,
      to: value.customer_email_snapshot,
      subject: `1PM Club · Order #${value.order_number} ${isDelivery ? "is on its way" : "is ready"}`,
      html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f7f7f7;color:#000728;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f7f7;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;border:1px solid #000728;background:#ffffff;">
          <tr><td style="padding:26px 30px;background:#0224cc;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;">Off Shift Café</p>
            <h1 style="margin:0;font-size:32px;line-height:1.1;letter-spacing:-1px;">Your break is ready.</h1>
          </td></tr>
          <tr><td style="padding:30px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.5;">Hi ${customerName},</p>
            <div style="border:1px solid #000728;padding:18px;background:#f7f7f7;">
              <p style="margin:0 0 6px;color:#4a10bd;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">Order #${value.order_number}</p>
              <p style="margin:0;font-size:23px;font-weight:800;">${fulfilmentText}</p>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.5;">${isDelivery ? "Your order is on its way to your department." : "Your order is ready for collection."}</p>
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #000728;font-weight:700;">Fulfillment</td><td align="right" style="padding:10px 0;border-bottom:1px solid #000728;">${escapeHtml(value.fulfillment_date)} · ${escapeHtml(value.time_slot)}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #000728;font-weight:700;">Order status</td><td align="right" style="padding:10px 0;border-bottom:1px solid #000728;text-transform:capitalize;">${escapeHtml(value.order_status.replaceAll("_", " "))}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700;">Payment status</td><td align="right" style="padding:10px 0;text-transform:capitalize;">${escapeHtml(value.payment_status)}</td></tr>
            </table>
            <p style="margin:24px 0 0;color:#625e70;font-size:12px;line-height:1.5;">You can follow every update in the 1PM Club app under My Orders.</p>
          </td></tr>
          <tr><td style="padding:16px 30px;border-top:1px solid #000728;color:#625e70;font-size:11px;">1PM Club · Office café pre-orders</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    });
    await supabase
      .from("email_logs")
      .update({
        status: "sent",
        provider_message_id: data.messageId ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", (log as { id: string }).id);
    await supabase
      .from("orders")
      .update({ ready_email_sent_at: new Date().toISOString() })
      .eq("id", orderId);
    return { sent: true, message: "Fulfillment email sent." };
  } catch (error) {
    await supabase
      .from("email_logs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown Resend error",
      })
      .eq("id", (log as { id: string }).id);
    return {
      sent: false,
      message: `Email was not sent: ${error instanceof Error ? error.message : "unknown provider error"}`,
    };
  }
}
