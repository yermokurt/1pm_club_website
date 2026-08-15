import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createAdminClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this server-only operation.");
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", key, {
    auth: { persistSession: false },
  });
};
