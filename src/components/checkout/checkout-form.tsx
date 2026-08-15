"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { BusinessSettings, SlotCapacity } from "@/types/domain";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/order";
import { availableDates } from "@/lib/scheduling";
import { cartCupCount, cartTotal, useCartStore } from "@/stores/cart-store";
import { formatPeso } from "@/lib/currency";
import { submitOrder } from "@/app/actions/orders";
import { createClient } from "@/lib/supabase/browser";
import { QrPaymentCarousel } from "./qr-payment-carousel";

export function CheckoutForm({
  settings,
  initialName = "",
  initialEmail = "",
}: {
  settings: BusinessSettings;
  initialName?: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const clear = useCartStore((state) => state.clear);
  const dates = useMemo(() => availableDates(settings), [settings]);
  const [capacities, setCapacities] = useState<SlotCapacity[]>([]);
  const [online, setOnline] = useState(true);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: initialName,
      customerEmail: initialEmail,
      orderMethod: "pickup",
      paymentMethod: "qr",
      fulfillmentDate: dates[0] ?? "",
      timeSlot: "morning",
      items: [],
    },
  });
  const method = form.watch("orderMethod");
  const paymentMethod = form.watch("paymentMethod");
  const date = form.watch("fulfillmentDate");
  const slot = form.watch("timeSlot");
  useEffect(() => {
    form.setValue(
      "items",
      lines.map((line) => ({
        productId: line.product.id,
        addonIds: line.addons.map((addon) => addon.id),
        quantity: line.quantity,
      })),
      { shouldValidate: false },
    );
  }, [form, lines]);
  useEffect(() => {
    if (method === "pickup") form.setValue("departmentName", undefined);
  }, [method, form]);
  const refreshCapacity = useCallback(async () => {
    if (!date) return setCapacities([]);
    try {
      const response = await fetch(`/api/capacity?date=${date}`, { cache: "no-store" });
      setCapacities(response.ok ? ((await response.json()) as SlotCapacity[]) : []);
    } catch {
      setCapacities([]);
    }
  }, [date]);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  useEffect(() => {
    void refreshCapacity();
  }, [refreshCapacity]);
  useEffect(() => {
    if (!date) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`checkout-capacity-${date}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "slot_capacity_events",
          filter: `fulfillment_date=eq.${date}`,
        },
        () => void refreshCapacity(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [date, refreshCapacity]);
  useEffect(() => {
    const cap = capacities.find((item) => item.time_slot === slot);
    if (cap && cap.capacity - cap.reserved_cups < cartCupCount(lines))
      form.setError("timeSlot", {
        message: `Only ${Math.max(0, cap.capacity - cap.reserved_cups)} cups remain for this slot.`,
      });
  }, [capacities, slot, lines, form]);
  const submit = (values: CheckoutInput) => {
    if (!lines.length) return setMessage("Your cart is empty.");
    if (!online) return setMessage("You’re offline. Reconnect before submitting your pre-order.");
    const requested = cartCupCount(lines);
    const cap = capacities.find((item) => item.time_slot === values.timeSlot);
    if (cap && cap.capacity - cap.reserved_cups < requested)
      return setMessage(`Only ${cap.capacity - cap.reserved_cups} cups remain for this slot.`);
    startTransition(async () => {
      try {
        const result = await submitOrder({
          ...values,
          items: lines.map((line) => ({
            productId: line.product.id,
            addonIds: line.addons.map((addon) => addon.id),
            quantity: line.quantity,
          })),
        });
        if (!result.ok) return setMessage(result.message);
        clear();
        const query = result.guestToken ? `?token=${encodeURIComponent(result.guestToken)}` : "";
        router.push(`/orders/${result.orderNumber}${query}`);
      } catch {
        setMessage("We couldn’t submit this order. Please check your connection and try again.");
      }
    });
  };
  if (!lines.length)
    return (
      <div className="card p-8">
        Your cart is empty.{" "}
        <a className="text-primary underline" href="/menu">
          Return to the menu.
        </a>
      </div>
    );
  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-8 lg:grid-cols-[1fr_330px]">
      <div className="space-y-8">
        <section>
          <p className="eyebrow">Your details</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <label>
              <span className="form-label">Name</span>
              <input className="field" {...form.register("customerName")} />
              {form.formState.errors.customerName && (
                <small className="text-red-700">{form.formState.errors.customerName.message}</small>
              )}
            </label>
            <label>
              <span className="form-label">Personal email (optional)</span>
              <input className="field" type="email" {...form.register("customerEmail")} />
              {form.formState.errors.customerEmail && (
                <small className="text-red-700">
                  {form.formState.errors.customerEmail.message}
                </small>
              )}
            </label>
          </div>
        </section>
        <section>
          <p className="eyebrow">How should we get it to you?</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {(["pickup", "delivery"] as const).map((value) => (
              <label
                key={value}
                className={`card p-5 cursor-pointer transition-colors ${method === value ? "bg-primary border-primary text-white" : ""}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  value={value}
                  {...form.register("orderMethod")}
                />
                <strong className="block capitalize">{value}</strong>
                <span className="text-sm text-[var(--color-muted)]">₱0 fee</span>
              </label>
            ))}
          </div>
          {method === "delivery" && (
            <label className="block mt-4">
              <span className="form-label">Select department</span>
              <input
                className="field"
                placeholder="Type your department"
                maxLength={100}
                {...form.register("departmentName")}
              />
              {form.formState.errors.departmentName && (
                <small className="text-red-700">
                  {form.formState.errors.departmentName.message}
                </small>
              )}
            </label>
          )}
        </section>
        <section>
          <p className="eyebrow">Payment method</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {(
              [
                { value: "qr", label: "QR payment", description: "Scan the café QR" },
                { value: "cod", label: "Cash on delivery", description: "Pay when you receive it" },
              ] as const
            ).map(({ value, label, description }) => (
              <label
                key={value}
                className={`card p-5 cursor-pointer transition-colors ${paymentMethod === value ? "bg-primary border-primary text-white" : ""}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  value={value}
                  {...form.register("paymentMethod")}
                />
                <strong className="block">{label}</strong>
                <span className="text-sm text-[var(--color-muted)]">{description}</span>
              </label>
            ))}
          </div>
        </section>
        <section>
          <p className="eyebrow">Select fulfilment date</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {dates.map((value) => (
              <label
                key={value}
                className={`card p-4 cursor-pointer transition-colors ${date === value ? "bg-primary border-primary text-white" : ""}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  value={value}
                  {...form.register("fulfillmentDate")}
                />
                <span className="block text-xs uppercase font-bold">
                  {new Intl.DateTimeFormat("en-PH", { weekday: "long", timeZone: "UTC" }).format(
                    new Date(`${value}T12:00:00Z`),
                  )}
                </span>
                <strong>
                  {new Intl.DateTimeFormat("en-PH", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${value}T12:00:00Z`))}
                </strong>
              </label>
            ))}
          </div>
        </section>
        <section>
          <p className="eyebrow">Select time</p>
          {(() => {
            const selectedCapacity = capacities.find((item) => item.time_slot === slot);
            if (!selectedCapacity)
              return (
                <p className="mt-4 text-sm text-[var(--color-muted)]" aria-live="polite">
                  Checking live capacity…
                </p>
              );
            const percentage = Math.min(
              100,
              Math.round((selectedCapacity.reserved_cups / selectedCapacity.capacity) * 100),
            );
            const remaining = Math.max(
              0,
              selectedCapacity.capacity - selectedCapacity.reserved_cups,
            );
            const fill =
              percentage >= 100
                ? "var(--color-danger)"
                : percentage >= 80
                  ? "var(--color-warning)"
                  : "var(--color-primary)";
            return (
              <div className="card mt-4 p-4" aria-live="polite">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <strong>Daily capacity (morning + lunch)</strong>
                  <span>
                    {selectedCapacity.reserved_cups} / {selectedCapacity.capacity} cups
                  </span>
                </div>
                <div
                  className="mt-2 h-3 overflow-hidden border border-[var(--color-border)]"
                  role="progressbar"
                  aria-label="Daily capacity shared by morning and lunch"
                  aria-valuemin={0}
                  aria-valuenow={selectedCapacity.reserved_cups}
                  aria-valuemax={selectedCapacity.capacity}
                >
                  <div
                    className="h-full transition-[width]"
                    style={{ width: `${percentage}%`, background: fill }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {remaining > 0 ? `${remaining} cups remaining today` : "Today is fully booked."}
                </p>
              </div>
            );
          })()}
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {(["morning", "lunch"] as const).map((value) => {
              const cap = capacities.find((item) => item.time_slot === value);
              const remaining = cap ? cap.capacity - cap.reserved_cups : null;
              const disabled =
                remaining !== null && (remaining <= 0 || remaining < cartCupCount(lines));
              const isSelected = slot === value;
              const window = value === "morning" ? "7:00 AM – 10:00 AM" : "12:00 PM – 1:30 PM";
              return (
                <label
                  key={value}
                  className={`card p-5 cursor-pointer transition-colors ${isSelected ? "bg-primary border-primary text-white" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    value={value}
                    disabled={disabled}
                    {...form.register("timeSlot")}
                  />
                  <strong className="block capitalize">{value}</strong>
                  <span className="block text-xs mt-1 text-[var(--color-muted)]">{window}</span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {remaining === null
                      ? "Checking availability…"
                      : remaining <= 0
                        ? "FULL"
                        : `${cap?.reserved_cups} / ${cap?.capacity} cups · ${remaining} remaining`}
                  </span>
                </label>
              );
            })}
          </div>
          {form.formState.errors.timeSlot && (
            <small className="text-red-700">{form.formState.errors.timeSlot.message}</small>
          )}
        </section>
        <section>
          <label>
            <span className="form-label">Note (optional)</span>
            <textarea
              className="field min-h-24"
              maxLength={300}
              {...form.register("customerNote")}
            />
          </label>
        </section>
      </div>
      <aside className="card h-fit p-6">
        <p className="eyebrow">Payment</p>
        <h2 className="display text-3xl mt-2">
          {paymentMethod === "qr" ? "Scan, then submit." : "Pay when it arrives."}
        </h2>
        {paymentMethod === "qr" ? (
          <QrPaymentCarousel />
        ) : (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            No QR code is needed. Please pay cash when your order is delivered or collected.
          </p>
        )}
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Payment remains Unpaid until the admin verifies it.
        </p>
        <div className="border-t border-[var(--color-border)] mt-6 pt-4 flex justify-between">
          <span>{cartCupCount(lines)} cups</span>
          <strong>{formatPeso(cartTotal(lines))}</strong>
        </div>
        {!online && (
          <p className="mt-4 text-sm text-red-700">
            You&apos;re offline. Reconnect before submitting.
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {message}
          </p>
        )}
        <button
          className="btn w-full mt-6"
          disabled={pending || !online || !settings.accepting_orders}
        >
          {pending
            ? "Submitting…"
            : settings.accepting_orders
              ? "Submit pre-order"
              : "Pre-orders closed"}
        </button>
      </aside>
    </form>
  );
}
