/**
 * Lightweight suspense fallback while lazy routes load.
 */

export function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <p className="text-sm text-[#7A736B] dark:text-[#94A3B8]">Loading page…</p>
    </div>
  );
}
