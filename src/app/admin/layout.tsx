import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNavigation } from "@/components/admin/admin-navigation";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((data as { role?: string } | null)?.role !== "admin") redirect("/");
  return (
    <main className="shell">
      <div className="border-b border-[var(--color-border)] pb-5 flex flex-wrap gap-4 justify-between">
        <div>
          <p className="eyebrow">Staff only</p>
          <h1 className="display text-5xl">Club control</h1>
        </div>
        <AdminNavigation />
      </div>
      {children}
    </main>
  );
}
