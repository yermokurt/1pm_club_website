import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePanel } from "@/components/profile/profile-panel";
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("name,email").eq("id", user.id).single(),
    supabase.from("orders").select("order_status").eq("customer_id", user.id),
  ]);
  const profile = data as unknown as { name: string; email: string } | null;
  const statuses = (orders ?? []).map((order) => (order as { order_status: string }).order_status);
  const activeStatuses = new Set([
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "to_be_delivered",
  ]);
  const summary = {
    total: statuses.length,
    active: statuses.filter((status) => activeStatuses.has(status)).length,
    completed: statuses.filter((status) => status === "completed").length,
  };
  return (
    <main className="shell max-w-3xl">
      <p className="eyebrow">Your account</p>
      <h1 className="display text-6xl mt-2">Profile</h1>
      <div className="mt-8">
        <ProfilePanel
          id={user.id}
          name={profile?.name ?? ""}
          email={profile?.email ?? user.email ?? ""}
          summary={summary}
        />
      </div>
    </main>
  );
}
