"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, rateLimitMessage } from "@/lib/rate-limit";

export type AuthActionResult = { ok: boolean; message?: string };

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  if (!(await consumeRateLimit({ scope: "login", subject: email, limit: 5, windowSeconds: 900 })))
    return { ok: false, message: rateLimitMessage };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: "Invalid email or password." } : { ok: true };
}

export async function registerAccount(
  email: string,
  password: string,
  name: string,
): Promise<AuthActionResult> {
  if (!(await consumeRateLimit({ scope: "register", limit: 3, windowSeconds: 3600 })))
    return { ok: false, message: rateLimitMessage };
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function requestPasswordReset(email: string): Promise<AuthActionResult> {
  if (
    !(await consumeRateLimit({
      scope: "password-reset",
      subject: email,
      limit: 3,
      windowSeconds: 3600,
    }))
  )
    return { ok: false, message: rateLimitMessage };
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/profile`,
  });
  // Do not reveal whether an email has an account.
  return {
    ok: true,
    message: "If an account exists for this address, a reset link has been sent.",
  };
}
