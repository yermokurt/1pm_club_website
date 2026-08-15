"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/order";
import { sendFulfillmentEmail } from "@/lib/resend/fulfillment-email";

export type OrderActionResult =
  { ok: true; orderNumber: number; guestToken?: string } | { ok: false; message: string };
async function submitOrderInternal(input: CheckoutInput): Promise<OrderActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your order." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const result = data as unknown as {
    order_number: number;
    guest_access_token: string | null;
  } | null;
  if (!result) return { ok: false, message: "We couldn’t create an order." };
  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    orderNumber: result.order_number,
    ...(user ? {} : { guestToken: result.guest_access_token ?? undefined }),
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
  const { error } = await supabase.rpc("admin_update_order", {
    p_order_id: orderId,
    p_status: status,
    p_payment_status: paymentStatus ?? null,
    p_rejection_message: null,
  });
  if (error) return { ok: false, message: "The update could not be applied." };
  if (status === "ready_for_pickup" || status === "to_be_delivered")
    await sendFulfillmentEmail(orderId);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return { ok: true, message: "Order updated." };
}
