"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <div className="card p-8">
        <p className="eyebrow">Profile unavailable</p>
        <p className="mt-3">We couldn’t load your profile right now.</p>
        <button className="btn mt-5" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
