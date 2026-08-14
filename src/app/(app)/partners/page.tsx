import { redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { canSubmitToAi } from "@/lib/agents/access";
import { partnersFor } from "@/lib/agents/partners";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { formatDate } from "@/lib/format";

/**
 * What the Assembly knows about each company it talks to — and what to put to
 * them next.
 *
 * This is the answer to "why record meetings at all". A chairman sits in four
 * a week; by the fourth he cannot recall what was already offered to the first
 * company, what the second said they needed, or that the two happen to fit.
 * Each meeting's analysis writes that down here, and reads it back before the
 * next one, so the suggestion column is built from the history rather than
 * from whatever was said in the last hour.
 */

const KIND_TONE: Record<string, string> = {
  taklif:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30",
  ehtiyoj:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  kelishuv:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  xavf:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
  muhokama:
    "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30",
};

export default async function PartnersPage() {
  const user = await requireUser();
  if (!canSubmitToAi(user)) redirect("/dashboard");

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  // Cyrillic Uzbek reads the latin text — same language, other script.
  const lang = locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";
  const partners = partnersFor(lang);

  return (
    <>
      <PageHeader
        title={t("partners.title")}
        description={t("partners.subtitle")}
      />

      {partners.length === 0 ? (
        <Panel title={t("partners.title")}>
          <p className="muted px-5 py-8 text-sm">{t("partners.empty")}</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {partners.map((partner) => (
            <Panel key={partner.id} title={partner.name}>
              <div className="space-y-4 p-5">
                <p className="muted flex flex-wrap gap-x-3 text-xs">
                  {partner.sector ? <span>{partner.sector}</span> : null}
                  <span>
                    {t("partners.lastTalk")}: {formatDate(partner.last_seen)}
                  </span>
                </p>

                {/* The suggestion first: it is what the reader came for. */}
                {partner.ideas.length > 0 && (
                  <div className="rounded-xl bg-emerald-500/5 p-3.5 ring-1 ring-emerald-600/15 dark:bg-emerald-400/5 dark:ring-emerald-400/20">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      {t("partners.propose")}
                    </p>
                    <ul className="space-y-2.5">
                      {partner.ideas.map((idea) => (
                        <li key={idea.id} className="text-sm">
                          <p className="font-medium">{idea.proposal}</p>
                          {idea.why && (
                            <p className="muted mt-0.5 text-xs">{idea.why}</p>
                          )}
                          {idea.match && (
                            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              ↔ {idea.match}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {partner.notes.length > 0 && (
                  <div>
                    <p className="muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                      {t("partners.history")}
                    </p>
                    <ul className="space-y-1.5">
                      {partner.notes.map((note, index) => (
                        <li
                          key={`${note.created_at}-${index}`}
                          className="flex flex-wrap items-baseline gap-2 text-sm"
                        >
                          <Badge
                            className={KIND_TONE[note.kind] ?? KIND_TONE.muhokama}
                          >
                            {t(`partners.kind.${note.kind}` as MessageKey)}
                          </Badge>
                          <span className="min-w-0 flex-1">{note.text}</span>
                          <span className="muted text-[11px]">
                            {formatDate(note.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
