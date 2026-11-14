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

/**
 * Where a company stands on the partnership path (TZ 6.2). The first two
 * stages take no colour — nothing has happened yet; the middle ones are
 * information; negotiation is the waiting one; a signed stage is green;
 * closed is quiet.
 */
export const PATH_TONE: Record<string, string> = {
  NEW_CONTACT: "bg-[var(--surface)] muted ring-[var(--line)]",
  CONTACT: "bg-[var(--surface)] muted ring-[var(--line)]",
  MEETING: "bg-[var(--surface)] text-sky-700 ring-[var(--line)] dark:text-sky-300",
  PROPOSAL: "bg-[var(--surface)] text-sky-700 ring-[var(--line)] dark:text-sky-300",
  NEGOTIATION: "bg-[var(--surface)] text-amber-700 ring-[var(--line)] dark:text-amber-300",
  AGREEMENT: "bg-[var(--surface)] text-emerald-700 ring-[var(--line)] dark:text-emerald-300",
  ACTIVE:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  MONITORING: "bg-[var(--surface)] text-emerald-700 ring-[var(--line)] dark:text-emerald-300",
  CLOSED: "bg-[var(--surface)] muted ring-[var(--line)]",
};

/** Past the stage's limit: the one badge on the path that shouts. */
export const STUCK_TONE =
  "bg-rose-50 text-rose-700 ring-rose-600/25 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30";

/** Whether the company has been checked (TZ 6.2 "tekshiruv holati"). */
export const VERIFICATION_TONE: Record<string, string> = {
  NOT_CHECKED: "bg-[var(--surface)] muted ring-[var(--line)]",
  CHECKED: "bg-[var(--surface)] text-emerald-700 ring-[var(--line)] dark:text-emerald-300",
  FLAGGED: "bg-[var(--surface)] text-amber-700 ring-[var(--line)] dark:text-amber-300",
};

/** An association's standing (TZ 6.1). */
export const ASSOCIATION_TONE: Record<string, string> = {
  FAOL: "bg-[var(--surface)] text-emerald-700 ring-[var(--line)] dark:text-emerald-300",
  SUST: "bg-[var(--surface)] text-amber-700 ring-[var(--line)] dark:text-amber-300",
  TOXTATILGAN: "bg-[var(--surface)] muted ring-[var(--line)]",
};
