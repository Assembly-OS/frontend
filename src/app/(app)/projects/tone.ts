/**
 * Project status colours, and the one rule behind them.
 *
 * Only two states are coloured: work that is running, and work that is
 * stopped. Planned, wrapping up and finished are all quiet — they are states
 * nobody has to act on, and a list where every row is tinted tells a reader
 * nothing about which row to open first.
 */
export const PROJECT_TONE: Record<string, string> = {
  REJA: "bg-[var(--surface)] muted ring-[var(--line)]",
  FAOL: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  PAUZA:
    "bg-[var(--surface)] text-amber-700 ring-[var(--line)] dark:text-amber-300",
  YAKUNLANMOQDA:
    "bg-[var(--surface)] text-sky-700 ring-[var(--line)] dark:text-sky-300",
  YAKUNLANDI: "bg-[var(--surface)] muted ring-[var(--line)]",
};

/** The icon that marks each kind of thread in the rail. */
export const THREAD_ICON = {
  ORG: "users",
  DIRECTION: "chart",
  INTERNAL: "shield",
} as const;

/**
 * The marker on an entry in the journal.
 *
 * These are what make a year of a thread skimmable: "when did we last
 * actually meet them" is answered by running an eye down the calendar marks,
 * and no amount of reading paragraphs replaces that.
 */
export const ENTRY_ICON = {
  NOTE: "chat",
  MEETING: "calendar",
  AGREEMENT: "check",
  FILE: "paperclip",
  LINK: "link",
} as const;
