"use client";
import Link from "next/link";
import { useState } from "react";
import { registerAccount, signInWithPassword } from "@/app/actions/auth";
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const response =
      mode === "login"
        ? await signInWithPassword(email, password)
        : await registerAccount(email, password, name);
    setLoading(false);
    if (!response.ok) return setMessage(response.message ?? "Could not complete that request.");
    if (mode === "register") setMessage("Check your email to confirm your account.");
    else window.location.assign("/");
  };
  return (
    <form action={submit} className="card p-6 sm:p-8 max-w-md mx-auto">
      <p className="eyebrow">The 1PM Club</p>
      <h1 className="display text-5xl mt-2">
        {mode === "login" ? "Welcome back" : "Join the club"}
      </h1>
      {mode === "register" && (
        <label className="block mt-7">
          <span className="form-label">Name</span>
          <input className="field" name="name" required minLength={2} />
        </label>
      )}
      <label className="block mt-5">
        <span className="form-label">Personal email</span>
        <input className="field" type="email" name="email" required />
      </label>
      <label className="block mt-5">
        <span className="form-label">Password</span>
        <input className="field" type="password" name="password" required minLength={8} />
      </label>
      {message && (
        <p className="mt-4 text-sm text-[var(--color-danger)]" role="alert">
          {message}
        </p>
      )}
      <button className="btn w-full mt-7" disabled={loading}>
        {loading ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <div className="flex justify-between mt-5 text-sm text-primary">
        <Link href={mode === "login" ? "/auth/register" : "/auth/login"}>
          {mode === "login" ? "Create an account" : "Already a member?"}
        </Link>
        {mode === "login" && <Link href="/auth/forgot-password">Forgot password?</Link>}
      </div>
    </form>
  );
}
