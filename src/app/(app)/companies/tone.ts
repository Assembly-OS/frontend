/** Cooperation status colours. Shared so the list and the card agree. */
export const COMPANY_TONE: Record<string, string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  POTENTIAL:
    "bg-[var(--surface)] text-sky-700 ring-[var(--line)] dark:text-sky-300",
  PAUSED:
    "bg-[var(--surface)] text-amber-700 ring-[var(--line)] dark:text-amber-300",
  ARCHIVED: "bg-[var(--surface)] muted ring-[var(--line)]",
};

/** Agreement status colours, including the derived "overdue". */
export const AGREEMENT_TONE: Record<string, string> = {
  NEW: "bg-[var(--surface)] muted ring-[var(--line)]",
  IN_PROGRESS:
    "bg-[var(--surface)] text-amber-700 ring-[var(--line)] dark:text-amber-300",
  DONE:
    "bg-[var(--surface)] text-emerald-700 ring-[var(--line)] dark:text-emerald-300",
  CANCELLED: "bg-[var(--surface)] muted ring-[var(--line)]",
  OVERDUE:
    "bg-rose-50 text-rose-700 ring-rose-600/25 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
};
