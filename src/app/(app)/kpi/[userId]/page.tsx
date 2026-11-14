import { notFound } from "next/navigation";
import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { personKpi } from "@/lib/kpi";
import { kpiSettings } from "@/lib/settings";
import { id as parseId } from "@/lib/validate";
import { Button, PageHeader } from "@/components/ui";
import { readPeriod } from "../period";
import { PeriodSwitch } from "../kpi-ui";
import { KpiCard } from "./card";

export const dynamic = "force-dynamic";

/** One person's KPI card, for the people TZ 4.2 lets open it; 404 otherwise. */
export default async function KpiPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ period?: string; offset?: string }>;
}) {
  const user = await requireUser();
  const userId = parseId((await params).userId);
  const bounds = readPeriod(await searchParams);
  const card = userId ? await personKpi(user, userId, bounds) : null;
  if (!card) notFound();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const settings = await kpiSettings();

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" href="/kpi">
          {t("kpi.back")}
        </Button>
      </div>
      <PageHeader
        title={card.id === user.id ? t("kpi.mine") : card.full_name}
        description={t("kpi.desc")}
        action={<PeriodSwitch bounds={bounds} t={t} base={`/kpi/${card.id}`} />}
      />
      <KpiCard card={card} settings={settings} t={t} />
    </>
  );
}
