export function BlobLoader({ label = "Building your plan" }: { label?: string }) {
  return (
    <div className="organic-loader-screen" role="status" aria-live="polite">
      <div className="organic-loader-card">
        <div className="organic-loader-blob" aria-hidden />
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Momentum</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{label}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Checking commitments, proof, and next steps.</p>
        <div className="organic-loader-dots mt-5" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
