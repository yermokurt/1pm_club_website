"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import type { BusinessSettings } from "@/types/domain";

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [acceptingOrders, setAcceptingOrders] = useState(settings.accepting_orders);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setAcceptingOrders(settings.accepting_orders);
  }, [settings.accepting_orders]);
  useEffect(() => {
    if (!message || messageType !== "success") return;
    const timer = window.setTimeout(() => setMessage(null), 3_000);
    return () => window.clearTimeout(timer);
  }, [message, messageType]);
  const save = async () => {
    setSaving(true);
    const values = {
      accepting_orders: acceptingOrders,
    };
    const { error } = await createClient().from("business_settings").update(values).eq("id", true);
    setMessageType(error ? "error" : "success");
    setMessage(error ? "Settings could not be saved." : "Settings saved.");
    if (!error) {
      setAcceptingOrders(values.accepting_orders);
      router.refresh();
    }
    setSaving(false);
  };
  return (
    <form
      className="card p-6 max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={acceptingOrders}
        disabled={saving}
        onClick={() => setAcceptingOrders((value) => !value)}
        className={`settings-toggle card flex w-full items-center justify-between gap-4 p-4 text-left transition-colors ${acceptingOrders ? "bg-primary border-primary" : ""}`}
      >
        <span>
          <strong className="block">Accepting pre-orders</strong>
          <span className="mt-1 block text-sm text-[var(--color-muted)]">
            {acceptingOrders
              ? "Customers can submit new orders."
              : "Checkout is closed to customers."}
          </span>
        </span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full border border-[var(--color-border)] ${acceptingOrders ? "bg-[var(--color-field)]" : "bg-[var(--color-background)]"}`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-primary transition-transform ${acceptingOrders ? "translate-x-6" : "translate-x-1"}`}
          />
        </span>
      </button>
      <p className="mt-5 text-xs text-[var(--color-muted)]">
        Use this switch to open or close checkout for every customer. QR payment cards are managed
        from the app&apos;s local payment QR gallery.
      </p>
      {message && (
        <p
          className={`mt-4 text-sm ${messageType === "success" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
          role="status"
        >
          {message}
        </p>
      )}
      <div className="mt-6 flex justify-center">
        <button className="btn" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
