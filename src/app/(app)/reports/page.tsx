import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { seesWorkOf } from "@/lib/oversight";
import { weeklyReport } from "@/lib/reports";
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
  const report = await weeklyReport(offset, period);

  // Decided here, on the server, where the rule lives: the client is told
  // which names to link, never why.
  const openable = report.rows
    .filter((row) => seesWorkOf(user, row))
    .map((row) => row.id);

  return <ReportClient report={report} period={period} openable={openable} />;
}
