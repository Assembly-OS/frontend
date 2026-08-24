import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { weeklyReport } from "@/lib/reports";
import { isManager } from "@/lib/types";
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

  const filters = await searchParams;
  const period = filters.period === "month" ? "month" : "week";

  // `?week=-1` is the previous stretch, whichever kind is selected. Clamped to
  // a year back either way: fifty-two weeks, twelve months.
  const raw = Number(filters.week);
  const limit = period === "month" ? -12 : -52;
  const offset = Number.isInteger(raw) ? Math.min(0, Math.max(limit, raw)) : 0;

  return (
    <ReportClient report={await weeklyReport(offset, period)} period={period} />
  );
}
