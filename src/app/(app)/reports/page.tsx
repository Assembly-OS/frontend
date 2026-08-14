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
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  if (!isManager(user.role)) redirect("/dashboard");

  // `?week=-1` is last week. Clamped: a year back is as far as it goes.
  const raw = Number((await searchParams).week);
  const offset = Number.isInteger(raw) ? Math.min(0, Math.max(-52, raw)) : 0;

  return <ReportClient report={weeklyReport(offset)} />;
}
