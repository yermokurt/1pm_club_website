"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export type OrderNotification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function OrderNotifications({
  profileId,
  initialNotifications,
}: {
  profileId: string;
  initialNotifications: OrderNotification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);
  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel(`customer-notifications-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (event) => setNotifications((current) => [event.new as OrderNotification, ...current]),
      )
      .subscribe();
    return () => void client.removeChannel(channel);
  }, [profileId]);
  if (!notifications.length) return null;
  const markRead = async (id: string) => {
    await createClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: new Date().toISOString() }
          : notification,
      ),
    );
  };
  return (
    <section className="card mb-6 p-5">
      <p className="eyebrow">Order updates</p>
      <div className="mt-3 grid gap-2">
        {notifications.slice(0, 5).map((notification) => (
          <button
            type="button"
            key={notification.id}
            className={`w-full border border-[var(--color-border)] p-3 text-left text-sm ${notification.read_at ? "opacity-65" : "bg-[var(--color-field)]"}`}
            onClick={() => void markRead(notification.id)}
          >
            <strong className="block">{notification.title}</strong>
            <span className="mt-1 block text-[var(--color-muted)]">{notification.body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
