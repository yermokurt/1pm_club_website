import { ThemedLogo } from "@/components/layout/themed-logo";
export default function Loading() {
  return (
    <main className="min-h-screen grid place-items-center bg-paper">
      <div className="text-center">
        <ThemedLogo
          className="mx-auto animate-pulse motion-reduce:animate-none"
          width={220}
          height={99}
          priority
        />
        <p className="mt-5 text-sm font-bold uppercase tracking-widest">Loading your break...</p>
      </div>
    </main>
  );
}
