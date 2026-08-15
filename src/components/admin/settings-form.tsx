"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { BusinessSettings } from "@/types/domain";
export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const [message, setMessage] = useState<string | null>(null);
  const [acceptingOrders, setAcceptingOrders] = useState(settings.accepting_orders);
  const save = async (formData: FormData) => {
    const values = {
      accepting_orders: acceptingOrders,
      morning_cutoff: String(formData.get("morning_cutoff")),
      lunch_cutoff: String(formData.get("lunch_cutoff")),
      slot_capacity: Number(formData.get("slot_capacity")),
    };
    const { error } = await createClient().from("business_settings").update(values).eq("id", true);
    setMessage(error ? "Settings could not be saved." : "Settings saved.");
  };
  return (
    <form className="card p-6 max-w-xl" action={save}>
      <label className="flex gap-3 items-center font-bold">
        <input
          type="checkbox"
          name="accepting_orders"
          checked={acceptingOrders}
          onChange={(event) => setAcceptingOrders(event.target.checked)}
        />{" "}
        Accepting orders
      </label>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <label>
          <span className="form-label">Morning cutoff</span>
          <input
            className="field"
            type="time"
            name="morning_cutoff"
            defaultValue={settings.morning_cutoff}
          />
        </label>
        <label>
          <span className="form-label">Lunch cutoff</span>
          <input
            className="field"
            type="time"
            name="lunch_cutoff"
            defaultValue={settings.lunch_cutoff}
          />
        </label>
        <label>
          <span className="form-label">Slot capacity</span>
          <input
            className="field"
            type="number"
            min="1"
            name="slot_capacity"
            defaultValue={settings.slot_capacity}
          />
        </label>
      </div>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Timezone is fixed to Asia/Manila. QR payment cards are managed from the app&apos;s local
        payment QR gallery.
      </p>
      {message && <p className="mt-4 text-sm">{message}</p>}
      <button className="btn mt-6">Save settings</button>
    </form>
  );
}
