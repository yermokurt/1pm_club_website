import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const response = NextResponse.redirect(new URL(next, url.origin));
  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies: Array<{ name: string; value: string; options: CookieOptions }>) =>
            cookies.forEach((cookie) =>
              response.cookies.set(cookie.name, cookie.value, cookie.options),
            ),
        },
      },
    );
    await supabase.auth.exchangeCodeForSession(code);
  }
  return response;
}
