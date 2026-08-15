"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
export function PasswordReset() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (formData: FormData) => {
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(
      String(formData.get("email") ?? ""),
      { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    );
    setLoading(false);
    setMessage(error ? error.message : "Check your email for a password reset link.");
  };
  return (
    <form action={submit} className="card p-7 max-w-md mx-auto">
      <p className="eyebrow">Account help</p>
      <h1 className="display text-5xl mt-2">Reset password</h1>
      <label className="block mt-7">
        <span className="form-label">Personal email</span>
        <input className="field" type="email" name="email" required />
      </label>
      {message && <p className="mt-4 text-sm">{message}</p>}
      <button className="btn w-full mt-6" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
