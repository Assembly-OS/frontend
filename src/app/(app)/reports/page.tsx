import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { seesWorkOf } from "@/lib/oversight";
import { cachedWeeklyReport } from "@/lib/reports";
import { createTranslator } from "@/lib/i18n";
import { currentLocale } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { isManager } from "@/lib/types";
import { reportPeriod } from "./period";
import { ReportClient } from "./report-client";

// Counts move as people work; this page is always "as of now".
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; period?: string }>;
}) {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  const { period, offset } = reportPeriod(await searchParams);
  // TZ 8.5: computed in the background by the sweep; computed here only
  // when no fresh copy exists.
  const report = await cachedWeeklyReport(offset, period);
  const t = createTranslator(await currentLocale(user));

  // Decided here, on the server, where the rule lives: the client is told
  // which names to link, never why.
  const openable = report.rows
    .filter((row) => seesWorkOf(user, row))
    .map((row) => row.id);

  return (
    <>
      <ReportClient report={report} period={period} openable={openable} />
      {report.computedAt && (
        <p className="muted mt-4 text-[11px] tabular-nums">{t("reports.computedAt").replace("{time}", formatDateTime(report.computedAt))}</p>
      )}
    </>
  );
}
