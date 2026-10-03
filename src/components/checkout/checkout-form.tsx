"use client";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { BusinessSettings } from "@/types/domain";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/order";
import { cartCupCount, cartTotal, useCartStore } from "@/stores/cart-store";
import { formatPeso } from "@/lib/currency";
import { submitOrder } from "@/app/actions/orders";
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
      items: [],
    },
  });
  const method = form.watch("orderMethod");
  const paymentMethod = form.watch("paymentMethod");
  useEffect(() => {
    form.setValue(
      "items",
      lines.map((line) => ({
        productId: line.product.id,
        addonIds: line.addons.map((addon) => addon.id),
        temperature: line.temperature ?? (line.product.is_iced_available ? "iced" : "hot"),
        quantity: line.quantity,
      })),
      { shouldValidate: false },
    );
  }, [form, lines]);
  useEffect(() => {
    if (method === "pickup") form.setValue("departmentName", undefined);
  }, [method, form]);
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
  const submit = (values: CheckoutInput) => {
    if (!lines.length) return setMessage("Your cart is empty.");
    if (!online) return setMessage("You’re offline. Reconnect before submitting your pre-order.");
    startTransition(async () => {
      try {
        const result = await submitOrder({
          ...values,
          items: lines.map((line) => ({
            productId: line.product.id,
            addonIds: line.addons.map((addon) => addon.id),
            temperature: line.temperature ?? (line.product.is_iced_available ? "iced" : "hot"),
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
