"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, CupSoda } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import type { BusinessSettings } from "@/types/domain";
export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [acceptingOrders, setAcceptingOrders] = useState(settings.accepting_orders);
  const [morningCutoff, setMorningCutoff] = useState(settings.morning_cutoff);
  const [lunchCutoff, setLunchCutoff] = useState(settings.lunch_cutoff);
  const [slotCapacity, setSlotCapacity] = useState(settings.slot_capacity);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setAcceptingOrders(settings.accepting_orders);
    setMorningCutoff(settings.morning_cutoff);
    setLunchCutoff(settings.lunch_cutoff);
    setSlotCapacity(settings.slot_capacity);
  }, [
    settings.accepting_orders,
    settings.lunch_cutoff,
    settings.morning_cutoff,
    settings.slot_capacity,
  ]);
  useEffect(() => {
    if (!message || messageType !== "success") return;
    const timer = window.setTimeout(() => setMessage(null), 3_000);
    return () => window.clearTimeout(timer);
  }, [message, messageType]);
  const save = async () => {
    setSaving(true);
    const values = {
      accepting_orders: acceptingOrders,
      morning_cutoff: morningCutoff,
      lunch_cutoff: lunchCutoff,
      slot_capacity: slotCapacity,
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
      <div className="grid gap-4 mt-5 sm:grid-cols-2">
        <label className="card p-4">
          <span className="form-label inline-label">
            <Clock3 size={15} /> Morning cutoff
          </span>
          <input
            className="field mt-3"
            type="time"
            name="morning_cutoff"
            value={morningCutoff}
            onChange={(event) => setMorningCutoff(event.target.value)}
          />
        </label>
        <label className="card p-4">
          <span className="form-label inline-label">
            <Clock3 size={15} /> Lunch cutoff
          </span>
          <input
            className="field mt-3"
            type="time"
            name="lunch_cutoff"
            value={lunchCutoff}
            onChange={(event) => setLunchCutoff(event.target.value)}
          />
        </label>
        <label className="card p-4 sm:col-span-2">
          <span className="form-label inline-label">
            <CupSoda size={15} /> Daily slot capacity
          </span>
          <span className="block mt-1 text-xs text-[var(--color-muted)]">
            Shared limit across morning and lunch.
          </span>
          <input
            className="field mt-3 max-w-xs"
            type="number"
            min="1"
            name="slot_capacity"
            value={slotCapacity}
            onChange={(event) => setSlotCapacity(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
      </div>
      <p className="mt-5 text-xs text-[var(--color-muted)]">
        Timezone is fixed to Asia/Manila. QR payment cards are managed from the app&apos;s local
        payment QR gallery.
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
