"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/layout/theme-provider";
export function ProfilePanel({
  id,
  name,
  email,
  summary,
}: {
  id: string;
  name: string;
  email: string;
  summary: { total: number; active: number; completed: number };
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { theme, toggle } = useTheme();
  const update = async (formData: FormData) => {
    setSaving(true);
    const client = createClient();
    const nextName = String(formData.get("name") ?? "").trim();
    const { error } = await client.from("profiles").update({ name: nextName }).eq("id", id);
    setSaving(false);
    setMessage(error ? "Profile could not be updated." : "Profile updated.");
  };
  const logout = async () => {
    await createClient().auth.signOut();
    window.location.assign("/");
  };
  return (
    <div className="grid gap-5 max-w-3xl">
      <section className="card p-6">
        <p className="eyebrow">Account information</p>
        <form action={update}>
          <label>
            <span className="form-label">Name</span>
            <input className="field" name="name" defaultValue={name} required minLength={2} />
          </label>
          <label className="block mt-5">
            <span className="form-label">Personal email</span>
            <input className="field opacity-70" type="email" value={email} readOnly />
          </label>
          {message && <p className="mt-4 text-sm">{message}</p>}
          <button className="btn mt-6" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>
      <section>
        <p className="eyebrow">Order summary</p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            [summary.total, "Total orders"],
            [summary.active, "Active"],
            [summary.completed, "Completed"],
          ].map(([value, label]) => (
            <article className="card p-4" key={label as string}>
              <strong className="display text-4xl block">{value}</strong>
              <span className="text-xs uppercase font-bold text-[var(--color-muted)]">{label}</span>
            </article>
          ))}
        </div>
        {!summary.total && (
          <p className="card p-5 mt-4 text-[var(--color-muted)]">
            No orders yet. Browse the menu and place your first pre-order.
          </p>
        )}
      </section>
      <section className="card p-6">
        <p className="eyebrow">Quick actions</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link className="btn" href="/orders">
            My orders &amp; history
          </Link>
          <Link className="btn secondary" href="/menu">
            Order from menu
          </Link>
        </div>
      </section>
      <section className="card p-6">
        <p className="eyebrow">Preferences</p>
        <button className="btn secondary mt-4" onClick={toggle}>
          Use {theme === "blue" ? "purple" : "blue"} theme
        </button>
      </section>
      <section className="card p-6">
        <p className="eyebrow">Account actions</p>
        <button
          onClick={logout}
          className="mt-7 text-xs font-bold uppercase text-[var(--color-danger)]"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
