"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/order";
import { sendFulfillmentEmail } from "@/lib/resend/fulfillment-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { getSettings } from "@/lib/data";
import { dateIsBookable } from "@/lib/scheduling";

export type OrderActionResult =
  { ok: true; orderNumber: number; guestToken?: string } | { ok: false; message: string };
async function submitOrderInternal(input: CheckoutInput): Promise<OrderActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your order." };
  const settings = await getSettings();
  if (!settings.accepting_orders) return { ok: false, message: "Pre-orders are currently closed." };
  if (!dateIsBookable(parsed.data.fulfillmentDate, settings))
    return { ok: false, message: "That fulfilment date is not currently open for booking." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    !(await consumeRateLimit({
      scope: "checkout",
      subject: user?.id ?? parsed.data.customerEmail,
      limit: 5,
      windowSeconds: 600,
    }))
  )
    return { ok: false, message: rateLimitMessage };
  const { data, error } = await supabase.rpc("create_order_with_payment", {
    p_customer_name: parsed.data.customerName,
    p_customer_email: parsed.data.customerEmail,
    p_order_method: parsed.data.orderMethod,
    p_payment_method: parsed.data.paymentMethod,
    p_department_name:
      parsed.data.orderMethod === "delivery" ? parsed.data.departmentName?.trim() || null : null,
    p_fulfillment_date: parsed.data.fulfillmentDate,
    p_time_slot: parsed.data.timeSlot,
    p_customer_note: parsed.data.customerNote || null,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      addon_ids: item.addonIds,
      quantity: item.quantity,
    })),
  });
  if (error?.message.includes("create_order_with_payment"))
    return {
      ok: false,
      message:
        "Checkout needs the latest database migration. Run migrations 004 through 007 in Supabase, then try again.",
    };
  if (error?.message.includes("CAPACITY_FULL"))
    return {
      ok: false,
      message: "This date has reached its cup limit. Please choose another available date.",
    };
  if (error?.message.includes("SCHEDULE") || error?.message.includes("SLOT_CLOSED"))
    return {
      ok: false,
      message: "The selected ordering window is no longer available. Please choose another time.",
    };
  if (error?.message.includes("PRODUCT_UNAVAILABLE"))
    return {
      ok: false,
      message: "One of the items in your cart is no longer available. Please review your cart.",
    };
  if (error?.message.includes("ADDON_UNAVAILABLE") || error?.message.includes("INVALID_ADDON"))
    return {
      ok: false,
      message: "One of your selected add-ons is no longer available. Please update your order.",
    };
  if (error?.message.includes("INVALID_DEPARTMENT"))
    return { ok: false, message: "Enter a valid department for delivery." };
  if (error)
    return {
      ok: false,
      message: error.message.includes("CAPACITY_FULL")
        ? "That slot just became full. Please choose another available slot."
        : error.message.includes("SCHEDULE")
          ? "That fulfilment date or slot is no longer available."
          : "We couldn’t submit this order. Please try again.",
    };
  const rawResult = (Array.isArray(data) ? data[0] : data) as unknown as {
    order_number: number;
    guest_access_token: string | null;
  } | null;
  const orderNumber = Number(rawResult?.order_number);
  if (!Number.isSafeInteger(orderNumber) || orderNumber <= 0)
    return {
      ok: false,
      message:
        "Your order was created, but its confirmation number could not be read. Check My Orders.",
    };
  try {
    const admin = createAdminClient();
    const { data: administrators } = await admin.from("profiles").select("id").eq("role", "admin");
    const cups = parsed.data.items.reduce((total, item) => total + item.quantity, 0);
    if (administrators?.length)
      await admin.from("notifications").insert(
        administrators.map(({ id }) => ({
          profile_id: id,
          title: `New order #${orderNumber}`,
          body: `${parsed.data.customerName} placed a ${cups}-cup ${parsed.data.orderMethod} order.`,
        })),
      );
  } catch {
    // The order is valid even if staff notifications cannot be written.
  }
  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    orderNumber,
    ...(user ? {} : { guestToken: rawResult?.guest_access_token ?? undefined }),
  };
}

export async function submitOrder(input: CheckoutInput): Promise<OrderActionResult> {
  try {
    return await submitOrderInternal(input);
  } catch (error) {
    console.error("Order submission failed unexpectedly", error);
    return {
      ok: false,
      message:
        "The checkout server could not process this order. Refresh the page and confirm migrations 004 through 007 have run in Supabase.",
    };
  }
}

export async function cancelOrder(orderId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    !(await consumeRateLimit({
      scope: "cancel-order",
      subject: user?.id ?? orderId,
      limit: 10,
      windowSeconds: 600,
    }))
  )
    return { ok: false, message: rateLimitMessage };
  const { error } = await supabase.rpc("cancel_own_pending_order", { p_order_id: orderId });
  if (error) return { ok: false, message: "Only your pending orders can be cancelled." };
  revalidatePath("/orders");
  return { ok: true, message: "Order cancelled. The slot capacity is available again." };
}
export async function updateOrderByAdmin(
  orderId: string,
  status: string,
  paymentStatus?: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    !(await consumeRateLimit({
      scope: "admin-order-update",
      subject: user?.id ?? "unknown",
      limit: 30,
      windowSeconds: 300,
    }))
  )
    return { ok: false, message: rateLimitMessage };
  const { error } = await supabase.rpc("admin_update_order", {
    p_order_id: orderId,
    p_status: status,
    p_payment_status: paymentStatus ?? null,
    p_rejection_message: null,
  });
  if (error) return { ok: false, message: "The update could not be applied." };
  const statusLabel = status.replaceAll("_", " ");
  let notificationMessage = "Customer notification could not be created.";
  try {
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("customer_id,order_number")
      .eq("id", orderId)
      .maybeSingle();
    const owner = order as { customer_id: string | null; order_number: number } | null;
    if (owner?.customer_id) {
      const { error: notificationError } = await admin.from("notifications").insert({
        profile_id: owner.customer_id,
        title: `Order #${owner.order_number} updated`,
        body: `Order status: ${statusLabel}.`,
      });
      notificationMessage = notificationError
        ? "Customer notification could not be created."
        : "Customer notification created.";
    }
  } catch {
    // A notification failure must never prevent the status change.
  }
  let email: { sent: boolean; message: string } | null = null;
  if (status === "ready_for_pickup" || status === "to_be_delivered") {
    try {
      email = await sendFulfillmentEmail(orderId);
    } catch {
      email = {
        sent: false,
        message: "Email was not sent: server email configuration is incomplete.",
      };
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message: email
      ? `Order updated. ${notificationMessage} ${email.message}`
      : `Order updated. ${notificationMessage}`,
  };
}

export async function deleteOrderByAdmin(
  orderId: string,
  typedOrderNumber: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Only an administrator can delete orders." };
  if (
    !(await consumeRateLimit({
      scope: "admin-order-delete",
      subject: user.id,
      limit: 10,
      windowSeconds: 600,
    }))
  )
    return { ok: false, message: rateLimitMessage };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "admin")
    return { ok: false, message: "Only an administrator can delete orders." };

  const { data: order } = await admin
    .from("orders")
    .select("id,order_number")
    .eq("id", orderId)
    .maybeSingle();
  const target = order as { id: string; order_number: number } | null;
  if (!target) return { ok: false, message: "That order no longer exists." };
  if (typedOrderNumber.trim() !== String(target.order_number))
    return { ok: false, message: "Enter the exact order number to confirm deletion." };

  const { data: items, error: itemsReadError } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", target.id);
  if (itemsReadError) return { ok: false, message: "The order could not be deleted." };
  const itemIds = (items ?? []).map((item) => item.id as string);
  if (itemIds.length) {
    const { error } = await admin.from("order_item_addons").delete().in("order_item_id", itemIds);
    if (error) return { ok: false, message: "The order could not be deleted." };
  }
  const { error: emailError } = await admin.from("email_logs").delete().eq("order_id", target.id);
  if (emailError) return { ok: false, message: "The order could not be deleted." };
  const { error: itemError } = await admin.from("order_items").delete().eq("order_id", target.id);
  if (itemError) return { ok: false, message: "The order could not be deleted." };
  const { error: orderError } = await admin.from("orders").delete().eq("id", target.id);
  if (orderError) return { ok: false, message: "The order could not be deleted." };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/analytics");
  revalidatePath("/admin/reports");
  revalidatePath("/checkout");
  return { ok: true, message: `Order #${target.order_number} was permanently deleted.` };
}
