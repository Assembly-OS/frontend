import { Icon } from "@/components/icons";
import { Badge, Panel, TableWrap, Td, Th } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import {
  CAPABILITIES,
  COLUMNS,
  PERMISSIONS,
  type Column,
  type Reach,
} from "@/lib/permissions";
import { NEUTRAL_TONE } from "@/lib/types";

/**
 * TZ 4.2's table, "working and visible in settings".
 *
 * Rendered from `PERMISSIONS`, the object every check reads, so what this
 * shows is what the platform does — there is no second copy to fall out of
 * step. Read-only on purpose: the table is the customer's, signed in the TZ;
 * the one thing the chairman switches per person is the global AI view.
 *
 * A tick is an icon with a spoken label, a limited reach is a word, and "no"
 * is a dash: none of the three depends on colour. The spoken labels are
 * anchored in their cell (`relative`): an `sr-only` span positioned against
 * anything outside the table's scroll box escapes it and scrolls the page. The reader's own column is
 * marked, because the first question anyone brings here is "what can I do".
 */
export function PermissionsTable({
  own,
  t,
}: {
  own: Column;
  t: (key: MessageKey) => string;
}) {
  const cell = (value: Reach) => {
    if (value === "yes")
      return (
        <span className="relative inline-flex" title={t("perm.reach.yes")}>
          <Icon name="check" className="size-4" />
          <span className="sr-only">{t("perm.reach.yes")}</span>
        </span>
      );
    if (value === "no")
      return (
        <span className="muted relative" title={t("perm.reach.no")}>
          —<span className="sr-only">{t("perm.reach.no")}</span>
        </span>
      );
    return <span className="text-xs">{t(`perm.reach.${value}` as MessageKey)}</span>;
  };

  return (
    <Panel title={t("perm.title")}>
      <TableWrap>
        <thead>
          <tr>
            <Th className="sticky left-0 bg-[var(--panel)]">{t("perm.action")}</Th>
            {COLUMNS.map((column) => (
              <Th key={column} className={column === own ? "bg-[var(--surface)]" : ""}>
                <span className="block">{t(`perm.col.${column}` as MessageKey)}</span>
                {column === own && (
                  <Badge className={`${NEUTRAL_TONE} mt-1 normal-case tracking-normal`}>
                    {t("perm.you")}
                  </Badge>
                )}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((capability) => (
            <tr key={capability}>
              <Td className="sticky left-0 bg-[var(--panel)] text-sm">
                {t(`perm.cap.${capability}` as MessageKey)}
              </Td>
              {COLUMNS.map((column) => (
                <Td key={column} className={column === own ? "bg-[var(--surface)]" : ""}>
                  {cell(PERMISSIONS[capability][column])}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="muted border-t px-5 py-3 text-[11px]">{t("perm.caption")}</p>
    </Panel>
  );
}
