/** Shown while a protected page's server component streams in. */
export default function Loading() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center">
      <span
        role="status"
        aria-label="loading"
        className="size-8 animate-spin rounded-full border-2 border-navy-200 border-t-navy-800 dark:border-navy-700 dark:border-t-gold-400"
      />
    </div>
  );
}
