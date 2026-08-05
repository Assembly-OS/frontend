import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ */
/* Form controls                                                      */
/* ------------------------------------------------------------------ */

/**
 * One skin for every field, so text inputs, selects and the date picker share
 * the same height, radius and focus ring.
 */
export const FIELD =
  "w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition hover:border-navy-400/60 focus:border-navy-500 focus:ring-4 focus:ring-navy-500/15";

/** Trailing glyph shared by <Select> and <DateField>. */
function FieldIcon({ name }: { name: IconName }) {
  return (
    <span className="muted pointer-events-none absolute inset-y-0 right-0 grid w-8 place-items-center">
      <Icon name={name} className="size-4" />
    </span>
  );
}

/**
 * A native <select> — full keyboard and mobile behaviour intact — wearing our
 * own chevron instead of the platform's chunky arrows. The OS skin itself is
 * stripped in globals.css.
 */
export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={`${FIELD} cursor-pointer pr-8 ${className}`}>
        {children}
      </select>
      <FieldIcon name="chevron" />
    </span>
  );
}

/**
 * Date input whose calendar button is stretched invisibly across the field
 * (see globals.css), so a click anywhere opens the picker, with our own
 * calendar glyph where that button used to sit.
 */
export function DateField({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative block">
      <input
        type="date"
        {...props}
        className={`${FIELD} cursor-pointer pr-8 ${className}`}
      />
      <FieldIcon name="calendar" />
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-stretch gap-3">
        <span
          aria-hidden
          className="mt-0.5 w-1 shrink-0 rounded-full bg-gold-500"
        />
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">{title}</h1>
          {description && (
            <p className="muted mt-1 max-w-2xl text-sm">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Calm accent icons. In the light theme they sit on no tint at all (a faint
// wash reads unevenly — warm hues like gold "box" while cool ones vanish), so
// every badge is just its icon. The dark theme keeps a subtle tinted chip,
// which reads consistently against the dark panel.
const TONES = {
  navy: "text-navy-700 dark:bg-navy-400/15 dark:text-navy-200",
  gold: "text-gold-600 dark:bg-gold-500/15 dark:text-gold-400",
  emerald: "text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rose: "text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  slate: "text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "navy",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconName;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  // h-full so a linked card (wrapped in <a>) fills the stretched grid row the
  // same way an unlinked one does — otherwise the cards end up different
  // heights and their icons no longer line up across a row.
  const inner = (
    <div
      className={`panel flex h-full items-start gap-3 p-3.5 transition duration-150 sm:gap-4 sm:p-4 ${
        href ? "hover:shadow-lift hover:-translate-y-0.5" : ""
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${TONES[tone]}`}
      >
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        {/* Wrap to two lines on the narrow (two-up) mobile grid rather than
            truncating a two-word label like "Active users" mid-word. */}
        <p className="muted mt-1.5 text-xs font-medium leading-snug line-clamp-2">
          {label}
        </p>
        {hint && <p className="muted mt-0.5 truncate text-[11px]">{hint}</p>}
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="muted grid size-11 place-items-center rounded-full border">
        <Icon name="inbox" className="size-5" />
      </span>
      <p className="muted text-sm">{text}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "bg-navy-600",
}: {
  value: number;
  tone?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface)]"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
