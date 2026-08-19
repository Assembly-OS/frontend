"use client";

import { useT } from "./i18n-provider";
import { FIELD, IconButton } from "./ui";

/** One person's turn while the author is still arranging the queue. */
export interface ChainStage {
  /** Stable across reordering, so React keeps the open textarea with its row. */
  key: number;
  userId: number;
  name: string;
  instruction: string;
  reviewNext: boolean;
}

/**
 * A row of the queue being built.
 *
 * Split out of the form because assembling it inline needed seven props and a
 * third level of nesting. Order is the whole point of the feature, so the
 * position number is the first thing in the row and the arrows sit at the end
 * of it — arrows, not drag-and-drop, because dragging with a thumb in a 360px
 * webview does not work.
 */
export function ChainRow({
  stage,
  index,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  stage: ChainStage;
  index: number;
  isLast: boolean;
  onChange: (patch: Partial<ChainStage>) => void;
  /** -1 up, +1 down. Absent at the ends. */
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useT();

  return (
    <li className="rounded-xl border p-2.5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold tabular-nums text-white dark:bg-navy-600">
          {index + 1}
        </span>
        {/* Wraps rather than truncates: an Uzbek patronymic is long, and half
            a name in a list whose whole job is "who, in what order" is worse
            than a row two lines tall. */}
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {stage.name}
        </span>
        <IconButton
          icon="chevron"
          label={t("chain.moveUp")}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="rotate-180"
        />
        <IconButton
          icon="chevron"
          label={t("chain.moveDown")}
          disabled={isLast}
          onClick={() => onMove(1)}
        />
        <IconButton
          icon="close"
          label={t("chain.remove")}
          variant="ghost"
          onClick={onRemove}
        />
      </div>

      <textarea
        value={stage.instruction}
        onChange={(event) => onChange({ instruction: event.target.value })}
        rows={2}
        placeholder={t("chain.instruction")}
        className={`${FIELD} mt-2 resize-y`}
      />

      {/* No next person to check the last turn, so the author always does. */}
      {!isLast && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={stage.reviewNext}
            onChange={(event) => onChange({ reviewNext: event.target.checked })}
            className="size-4 shrink-0 accent-navy-700"
          />
          <span className={stage.reviewNext ? "" : "muted"}>
            {stage.reviewNext ? t("chain.reviewNext") : t("chain.reviewAuthor")}
          </span>
        </label>
      )}
    </li>
  );
}
