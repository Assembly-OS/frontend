import { all } from "@/lib/db";
import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canSubmitToAi } from "@/lib/agents/access";
import { PageHeader, Panel } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { redirect } from "next/navigation";

/**
 * Everything the meetings concluded, newest first.
 *
 * The conclusion outlives the meeting. A transcript is read once, if ever; the
 * three or four sentences that say what was settled are what somebody looks up
 * a month later, and until now they existed only as a Telegram message that
 * scrolled away. This is where they live.
 *
 * Each conclusion was written in Uzbek, Russian and English by the analysis
 * that produced it, so switching the interface language switches the text
 * itself — not a translation of it.
 */

interface Row {
  id: number;
  title: string;
  created_at: string;
  duration: number | null;
  lang: string;
  owner: string;
  summary: string | null;
  key_points: string | null;
  decisions: string | null;
}

function list(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => !!x) : [];
  } catch {
    return [];
  }
}

export default async function MeetingsPage() {
  const user = await requireUser();
  // The same people who may submit a meeting may read what meetings concluded.
  if (!canSubmitToAi(user)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  // Cyrillic Uzbek reads the latin text — same language, other script.
  const textLang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";

  const rows = all<Row>(
    `SELECT m.id, m.title, m.created_at, m.duration, m.lang,
            u.full_name AS owner,
            c.summary, c.key_points, c.decisions
       FROM meetings m
       JOIN users u ON u.id = m.owner_id
       LEFT JOIN meeting_conclusions c
              ON c.meeting_id = m.id AND c.lang = ?
      ORDER BY m.id DESC
      LIMIT 100`,
    textLang,
  );

  return (
    <>
      <PageHeader
        title={t("meetings.title")}
        description={t("meetings.subtitle")}
      />

      {rows.length === 0 ? (
        <Panel title={t("meetings.title")}>
          <p className="muted px-5 py-8 text-sm">{t("meetings.empty")}</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const points = list(row.key_points);
            const decisions = list(row.decisions);
            return (
              <Panel key={row.id} title={row.title}>
                <div className="space-y-4 p-5">
                  <p className="muted flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>{formatDateTime(row.created_at)}</span>
                    <span>{row.owner}</span>
                    {row.duration ? (
                      <span>{formatDuration(row.duration)}</span>
                    ) : null}
                    <span className="font-mono">{row.lang}</span>
                  </p>

                  {row.summary ? (
                    <p className="text-sm leading-relaxed">{row.summary}</p>
                  ) : (
                    /* An older meeting, analysed before conclusions were
                       stored per language. Its transcript is still on file. */
                    <p className="muted text-sm">{t("meetings.noConclusion")}</p>
                  )}

                  {points.length > 0 && (
                    <div>
                      <p className="muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                        {t("ai.keyPoints")}
                      </p>
                      <ul className="space-y-1 text-sm">
                        {points.map((point) => (
                          <li key={point} className="flex gap-2">
                            <span className="muted">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {decisions.length > 0 && (
                    <div>
                      <p className="muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                        {t("ai.liveDecisions")}
                      </p>
                      <ul className="space-y-1 text-sm">
                        {decisions.map((decision) => (
                          <li key={decision} className="flex gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ✓
                            </span>
                            <span>{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
