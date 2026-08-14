import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

/**
 * The one button.
 *
 * Before this existed the same class string was pasted at three dozen call
 * sites, and they had already drifted: five different paddings, three disabled
 * opacities, two hover colours. A control the user meets on every screen cannot
 * be re-decided per screen.
 */
const VARIANTS = {
  primary:
    "bg-navy-900 text-white hover:bg-navy-800 dark:bg-navy-600 dark:hover:bg-navy-500",
  secondary:
    "border bg-[var(--panel)] hover:border-navy-400/60 hover:bg-[var(--surface)]",
  ghost: "muted hover:bg-[var(--surface)] hover:text-[var(--ink)]",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500",
} as const;

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-sm gap-2.5",
} as const;

/** Shared by every interactive element — see the focus rule in CLAUDE.md. */
export const FOCUS =
  "outline-none focus-visible:ring-4 focus-visible:ring-navy-500/25 focus-visible:border-navy-500";

/**
 * `shrink-0 whitespace-nowrap` is load-bearing, not tidiness.
 *
 * A button placed in a flex row beside anything greedy — a hint, a filename,
 * a name — is a flex item like any other, and the default lets it be squeezed
 * below the width of its own label. The label then wraps: "Bekor / qilish"
 * over two lines, in a control 44px tall standing next to a 28px one. It
 * showed up only in Uzbek, which is the default language here and the longest
 * of the four, so English testing would never have caught it.
 *
 * A button is sized by what it says. If a row is too narrow for that, the row
 * is what has to give — use `block`, or let the text beside it wrap.
 */
const BUTTON_BASE =
  `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl font-semibold transition duration-150 ` +
  `disabled:pointer-events-none disabled:opacity-45 ${FOCUS}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: IconName;
  /** Renders an anchor instead — navigation is a link, not a button. */
  href?: string;
  block?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  href,
  block = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `${BUTTON_BASE} ${VARIANTS[variant]} ${SIZES[size]} ${
    block ? "w-full" : ""
  } ${className}`;
  const inner = (
    <>
      {icon && <Icon name={icon} className="size-4 shrink-0" />}
      {children}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" {...props} className={classes}>
      {inner}
    </button>
  );
}

/** Square, icon-only. `label` is required — it becomes the accessible name. */
export function IconButton({
  icon,
  label,
  variant = "secondary",
  href,
  className = "",
  ...props
}: Omit<ButtonProps, "children" | "size" | "icon"> & {
  icon: IconName;
  label: string;
}) {
  const classes = `${BUTTON_BASE} size-9 shrink-0 p-0 ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={classes}>
        <Icon name={icon} className="size-4" />
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={classes}
    >
      <Icon name={icon} className="size-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                      */
/* ------------------------------------------------------------------ */

/**
 * One skin for every field, so text inputs, selects and the date picker share
 * the same height, radius and focus ring.
 */
export const FIELD =
  "w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none " +
  "transition duration-150 hover:border-navy-400/60 " +
  "focus:border-navy-500 focus:ring-4 focus:ring-navy-500/20";

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
        {description && (
          <p className="muted mt-1 max-w-2xl text-sm">{description}</p>
        )}
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
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          {title && (
            <h2 className="truncate text-sm font-semibold tracking-tight">
              {title}
            </h2>
          )}
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
      className={`panel flex h-full items-start gap-3 p-4 transition duration-150 ${
        href ? "hover:shadow-lift hover:-translate-y-0.5" : ""
      }`}
    >
      <span
        aria-hidden
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${TONES[tone]}`}
      >
        <Icon name={icon} className="size-[1.125rem]" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tracking-tight tabular-nums">
          {value}
        </p>
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

/**
 * Secondary metrics as one divided strip rather than a second row of cards.
 *
 * Two identical rows of `StatCard` gave the organisation's totals exactly the
 * same weight as the reader's own workload, so the page opened with eight
 * equally loud numbers and no answer to "what is mine". A strip reads as
 * context: same information, visibly subordinate.
 */
export function MetricStrip({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    hint?: string;
    href?: string;
  }[];
}) {
  return (
    <div className="panel grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-y-0 [&>*:nth-child(odd)]:border-r sm:[&>*]:border-r sm:[&>*:last-child]:border-r-0">
      {items.map((item) => {
        const body = (
          <div className="px-4 py-3.5">
            <p className="text-lg font-bold leading-none tracking-tight tabular-nums">
              {item.value}
            </p>
            <p className="muted mt-1.5 truncate text-xs font-medium">
              {item.label}
            </p>
            {item.hint && (
              <p className="muted mt-0.5 truncate text-[11px]">{item.hint}</p>
            )}
          </div>
        );
        return item.href ? (
          <a
            key={item.label}
            href={item.href}
            className="block transition duration-150 hover:bg-[var(--surface)]"
          >
            {body}
          </a>
        ) : (
          <div key={item.label}>{body}</div>
        );
      })}
    </div>
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

/**
 * An empty result, said properly.
 *
 * `bare` drops the panel chrome for use *inside* a panel that already has it —
 * the alternative was a bare sentence in the middle of a card, which reads as a
 * rendering failure rather than as "nothing here yet".
 */
export function EmptyState({
  text,
  hint,
  icon = "inbox",
  action,
  bare = false,
}: {
  text: string;
  hint?: string;
  icon?: IconName;
  action?: ReactNode;
  bare?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 px-6 text-center ${
        bare ? "py-10" : "panel py-14"
      }`}
    >
      <span className="muted grid size-11 place-items-center rounded-full border">
        <Icon name={icon} className="size-5" />
      </span>
      <p className="text-sm font-medium">{text}</p>
      {hint && <p className="muted max-w-sm text-xs">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Loading placeholder shaped like the content it stands in for, so the layout
 * does not jump when the real thing arrives.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-lg bg-[var(--surface)] ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                             */
/* ------------------------------------------------------------------ */

/**
 * Owns the horizontal scroll so the *page* never scrolls sideways — the rule
 * that keeps the 360px Mini App webview usable.
 */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-thin w-full overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  numeric = false,
  className = "",
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      {...props}
      className={`muted border-b px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
        numeric ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  numeric = false,
  className = "",
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      {...props}
      className={`border-b px-4 py-3 align-middle ${
        numeric ? "text-right tabular-nums" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
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
