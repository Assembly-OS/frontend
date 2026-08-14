"use client";

import { EmptyState } from "./ui";

import { useState } from "react";

export interface PieSlice {
  key: string;
  /** Short tag drawn beside the slice — "GR", "AI Lab". */
  code: string;
  /** Full name for the legend. */
  label: string;
  /** Secondary line under the label in the legend — a head's name, a region… */
  hint?: string | null;
  value: number;
}

const SIZE = 260;
const CENTER = SIZE / 2;
const R_OUT = 88;
const R_IN = 52;

/** Where the value rides — the middle of the ring band. */
const R_VALUE = (R_OUT + R_IN) / 2;
/** Where the category tag sits — clear of the ring with breathing room. */
const R_TAG = R_OUT + 17;
/** How far a slice slides outward when it is the active one. */
const LIFT = 7;

/**
 * Below this share a slice is too narrow to hold its value without the text
 * spilling over its neighbours, so the legend carries it alone.
 */
const VALUE_MIN_SHARE = 0.05;
/**
 * Below this share, two adjacent thin slices' outer tags collide (e.g. a team's
 * 4%/4% wedges), which is the one thing that makes a ring look untidy. Such
 * slices drop their outer name and rely on the legend, so every chart keeps the
 * clean, evenly-spaced look of one with only substantial slices.
 */
const TAG_MIN_SHARE = 0.06;

/**
 * Slot colours come from the theme so light and dark each get their own step.
 * The hex fallback matters: without it a stale stylesheet renders the chart
 * invisible rather than merely off-palette.
 */
const SERIES = [
  "var(--series-1, #d1a24f)",
  "var(--series-2, #bb8100)",
  "var(--series-3, #a06300)",
  "var(--series-4, #804b00)",
  "var(--series-5, #5d3800)",
];

/** The tail bucket is deliberately neutral — it is context, not a category. */
const OTHER_COLOR = "var(--muted, #64748b)";

/**
 * Past this many categories a chart runs out of validated hues, and inventing
 * a sixth would produce a colour nobody can tell from an existing one. The
 * smallest slices fold into one neutral "other" bucket instead.
 */
const MAX_SLICES = SERIES.length;

/**
 * The palette is a single-hue ramp, so its lighter steps want black value
 * labels and its darker steps white — each slot ships the ink that clears
 * 4.5:1 on it as `--series-N-ink`. The neutral "other" bucket takes black.
 */
const SERIES_INK = [
  "var(--series-1-ink, #000000)",
  "var(--series-2-ink, #000000)",
  "var(--series-3-ink, #ffffff)",
  "var(--series-4-ink, #ffffff)",
  "var(--series-5-ink, #ffffff)",
];
const OTHER_INK = "#000000";

function fold(slices: PieSlice[], otherLabel: string): PieSlice[] {
  if (slices.length <= MAX_SLICES) return slices;
  const ranked = [...slices].sort((a, b) => b.value - a.value);
  const rest = ranked.slice(MAX_SLICES - 1);
  return [
    ...ranked.slice(0, MAX_SLICES - 1),
    {
      key: "__other",
      code: otherLabel,
      label: otherLabel,
      hint: `${rest.length}`,
      value: rest.reduce((sum, slice) => sum + slice.value, 0),
    },
  ];
}

function point(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

/**
 * The lift is a CSS translate rather than a redrawn path: `d` only animates in
 * Chrome, `transform` animates everywhere, and it carries the slice's labels
 * along with it for free.
 */
function liftStyle(angle: number, on: boolean): React.CSSProperties {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    transform: on
      ? `translate(${(Math.cos(rad) * LIFT).toFixed(2)}px, ${(
          Math.sin(rad) * LIFT
        ).toFixed(2)}px)`
      : undefined,
    transition: "transform 160ms ease-out",
  };
}

/** One ring segment: out along the outer arc, back along the inner one. */
function ringPath(start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;
  const a = point(start, R_OUT);
  const b = point(end, R_OUT);
  const c = point(end, R_IN);
  const d = point(start, R_IN);
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(a.x)} ${f(a.y)}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${f(b.x)} ${f(b.y)}`,
    `L ${f(c.x)} ${f(c.y)}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${f(d.x)} ${f(d.y)}`,
    "Z",
  ].join(" ");
}

/**
 * A tag is pinned by its *near* edge, so the gap to the ring reads the same all
 * the way round. Which edge is near depends on where the slice sits:
 *
 *  - horizontally, on the x component — right of centre the text flows right
 *    (anchor its start), left of centre it flows left (anchor its end);
 *  - vertically, on the y component — above the ring the text must sit on top
 *    of the anchor, below it must hang beneath, so the baseline shifts by a
 *    cap-height instead of a fixed nudge.
 *
 * Both were previously decided from `sin` alone, i.e. the anchor was rotated a
 * quarter turn against the text: tags near the top and bottom flowed back over
 * the ring (a 12 o'clock slice overlapped it by ~33px) while tags at the sides
 * drifted out, which is what made the spacing look arbitrary.
 */
function tagPlacement(
  angle: number,
  fontSize: number,
): { anchor: "start" | "middle" | "end"; dy: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    anchor: x > 0.2 ? "start" : x < -0.2 ? "end" : "middle",
    // 0 → baseline on the anchor (text above it); 0.72em → cap top on the
    // anchor (text below it); 0.35em → optically centred beside the ring.
    dy: (y < -0.35 ? 0 : y > 0.35 ? 0.72 : 0.35) * fontSize,
  };
}

/**
 * Part-to-whole ring. Hovering — or tabbing to — a slice lifts it out of the
 * ring and writes its figures into the hole, so the reader gets an exact
 * number without a floating tooltip; the legend and the ring highlight each
 * other, so a long name and its wedge are never hunted for separately.
 */
export function PieChart({
  slices: input,
  totalLabel,
  emptyText,
  otherLabel = "…",
  /** Narrow columns stack the legend under the ring instead of beside it. */
  stacked = false,
  size = 220,
}: {
  slices: PieSlice[];
  totalLabel: string;
  emptyText: string;
  otherLabel?: string;
  stacked?: boolean;
  size?: number;
}) {
  const [active, setActive] = useState<string | null>(null);

  // SVG text scales with the viewBox, so a chart rendered at a smaller `size`
  // would otherwise draw smaller labels. Multiplying by SIZE/size cancels that
  // out, so every chart's tags and values render at the same pixel size —
  // department, uyushma and team rings all match.
  const fontScale = SIZE / size;
  const valueFont = (13 * fontScale).toFixed(1);
  const tagFont = (12 * fontScale).toFixed(1);

  const slices = fold(input, otherLabel);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    // A bare sentence where a chart should be reads as a rendering failure.
    return <EmptyState bare text={emptyText} icon="chart" />;
  }

  const colorOf = (index: number) =>
    slices[index]?.key === "__other" ? OTHER_COLOR : SERIES[index];
  const inkOf = (index: number) =>
    slices[index]?.key === "__other" ? OTHER_INK : SERIES_INK[index];

  const drawn = slices
    .map((slice, index) => ({ slice, color: colorOf(index), ink: inkOf(index) }))
    .filter((entry) => entry.slice.value > 0);

  const spans = drawn.map((entry) => (entry.slice.value / total) * 360);
  const wedges = drawn.map((entry, index) => {
    const start = spans.slice(0, index).reduce((sum, span) => sum + span, 0);
    const share = entry.slice.value / total;
    return {
      ...entry.slice,
      color: entry.color,
      ink: entry.ink,
      start,
      end: start + spans[index],
      mid: start + spans[index] / 2,
      share,
      percent: Math.round(share * 100),
    };
  });

  const focused = wedges.find((wedge) => wedge.key === active) ?? null;

  return (
    <div
      className={`flex flex-col items-center gap-5 px-3 py-5 ${
        stacked ? "" : "lg:flex-row lg:items-start lg:gap-6"
      }`}
      onMouseLeave={() => setActive(null)}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-full overflow-visible"
          role="img"
          aria-label={`${totalLabel}: ${total}. ${wedges
            .map((w) => `${w.label} — ${w.value} (${w.percent}%)`)
            .join("; ")}`}
        >
          {wedges.map((wedge) => {
            const on = wedge.key === active;
            const value = point(wedge.mid, R_VALUE);
            const tag = point(wedge.mid, R_TAG);
            const placement = tagPlacement(wedge.mid, Number(tagFont));
            return (
              <g key={wedge.key} style={liftStyle(wedge.mid, on)}>
                <path
                  d={ringPath(wedge.start, wedge.end)}
                  fill={wedge.color}
                  stroke="var(--panel, #ffffff)"
                  strokeWidth={2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${wedge.label}: ${wedge.value} (${wedge.percent}%)`}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setActive(wedge.key)}
                  onFocus={() => setActive(wedge.key)}
                  onBlur={() => setActive(null)}
                />

                {/* The value rides the ring band; its ink flips to stay legible
                    on that shade — dark labels on light steps, light on dark. */}
                {wedge.share >= VALUE_MIN_SHARE && (
                  <text
                    x={value.x.toFixed(2)}
                    y={value.y.toFixed(2)}
                    dy="4"
                    textAnchor="middle"
                    fill={wedge.ink}
                    fontSize={valueFont}
                    fontWeight="700"
                    className="pointer-events-none select-none"
                  >
                    {wedge.value}
                  </text>
                )}

                {/* Tags sit outside the ring in text ink — three of the five
                    hues fall below 3:1 as text on the light surface, so colour
                    identity is carried by the legend swatch instead. */}
                {wedge.key !== "__other" && wedge.share >= TAG_MIN_SHARE && (
                  <text
                    x={tag.x.toFixed(2)}
                    y={tag.y.toFixed(2)}
                    dy={placement.dy.toFixed(2)}
                    textAnchor={placement.anchor}
                    fontSize={tagFont}
                    fontWeight={on ? "700" : "600"}
                    className="pointer-events-none select-none fill-[color:var(--ink)]"
                  >
                    {wedge.code}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* The hole is the readout: the whole by default, the slice on hover. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[31%] text-center">
          {focused ? (
            <>
              <span className="text-2xl font-bold leading-none tabular-nums">
                {focused.value}
              </span>
              <span className="muted mt-1 text-xs font-semibold tabular-nums">
                {focused.percent}%
              </span>
              <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight">
                {focused.code}
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold leading-none tabular-nums">
                {total}
              </span>
              <span className="muted mt-1 text-[9px] font-semibold uppercase leading-[1.15] tracking-wide">
                {totalLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1">
        {slices.map((slice, index) => {
          const on = slice.key === active;
          return (
            <li key={slice.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(slice.key)}
                onFocus={() => setActive(slice.key)}
                onBlur={() => setActive(null)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                  on ? "bg-[var(--surface)]" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`shrink-0 rounded-full transition-all ${
                    on ? "size-3" : "size-2.5"
                  }`}
                  style={{ background: colorOf(index) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {slice.label}
                  </span>
                  {slice.hint && (
                    <span className="muted block truncate text-[11px]">
                      {slice.hint}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-bold tabular-nums">
                    {slice.value}
                  </span>
                  <span className="muted block text-[11px] tabular-nums">
                    {Math.round((slice.value / total) * 100)}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
