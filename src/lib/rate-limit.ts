import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type Limit = { scope: string; subject?: string; limit: number; windowSeconds: number };
type LocalBucket = { startedAt: number; hits: number };

const memory = globalThis as typeof globalThis & {
  __onePmRateLimitBuckets?: Map<string, LocalBucket>;
};
const buckets = (memory.__onePmRateLimitBuckets ??= new Map<string, LocalBucket>());

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const localLimit = (key: string, limit: number, windowSeconds: number) => {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowSeconds * 1000) {
    buckets.set(key, { startedAt: now, hits: 1 });
    return true;
  }
  if (current.hits >= limit) return false;
  current.hits += 1;
  return true;
};

export async function consumeRateLimit({ scope, subject = "", limit, windowSeconds }: Limit) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  const key = hash(`${scope}:${ip}:${subject.toLowerCase().trim()}`);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error && typeof data === "boolean") return data;
  } catch {
    // The process-local limit below protects development and instances where the migration is pending.
  }
  return localLimit(key, limit, windowSeconds);
}

export const rateLimitMessage = "Too many attempts. Please wait a few minutes and try again.";
