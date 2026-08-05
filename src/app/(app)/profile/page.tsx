import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { counters, userById } from "@/lib/queries";
import { get } from "@/lib/db";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { initials } from "@/lib/format";
import { PasswordForm } from "./password-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const c = counters(user.id);

  const manager = user.manager_id ? userById(user.manager_id) : undefined;
  const uyushma = user.uyushma_id
    ? get<{ name: string }>(
        "SELECT name FROM uyushmalar WHERE id = ?",
        user.uyushma_id,
      )
    : undefined;

  const rows: [string, string][] = [
    [t("profile.fullName"), user.full_name],
    [t("profile.role"), t(`role.${user.role}` as MessageKey)],
    [
      t("profile.department"),
      user.department ? t(`dept.${user.department}` as MessageKey) : "—",
    ],
    [t("profile.position"), user.position ?? "—"],
    [t("profile.uyushma"), uyushma?.name ?? "—"],
    [
      t("profile.manager"),
      manager ? `${manager.full_name} (@${manager.login})` : "—",
    ],
    [t("profile.phone"), user.phone ?? "—"],
    [t("profile.email"), user.email ?? "—"],
  ];

  return (
    <>
      <PageHeader title={t("profile.title")} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="panel flex flex-wrap items-center gap-5 p-6">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-navy-900 text-lg font-bold text-white dark:bg-navy-700">
              {initials(user.full_name)}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{user.full_name}</h2>
              <p className="muted text-sm">
                {t(`role.${user.role}` as MessageKey)}
                {user.position ? ` · ${user.position}` : ""}
              </p>
            </div>
            <div className="ml-auto rounded-2xl border border-dashed px-4 py-3">
              <p className="muted text-[11px] font-medium uppercase tracking-wide">
                {t("profile.myLogin")}
              </p>
              <p className="font-mono text-lg font-bold">@{user.login}</p>
              <p className="muted mt-0.5 max-w-56 text-[11px]">
                {t("profile.loginHint")}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard
              label={t("dashboard.newTasks")}
              value={c.incoming}
              icon="inbox"
              tone="navy"
            />
            <StatCard
              label={t("dashboard.inWork")}
              value={c.inWork}
              icon="play"
              tone="gold"
            />
            <StatCard
              label={t("dashboard.completed")}
              value={c.completed}
              icon="check"
              tone="emerald"
            />
          </div>

          <Panel title={t("profile.personal")}>
            <dl className="divide-y">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-wrap items-baseline gap-2 px-5 py-3"
                >
                  <dt className="muted w-44 shrink-0 text-xs font-medium">
                    {label}
                  </dt>
                  <dd className="min-w-0 flex-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("profile.language")}>
            <div className="p-5">
              <LocaleSwitcher current={locale} />
              <p className="muted mt-3 text-xs">
                O&apos;zbekcha (lotin / kirill), Русский, English
              </p>
            </div>
          </Panel>

          <Panel title={t("profile.security")}>
            <PasswordForm />
          </Panel>
        </div>
      </div>
    </>
  );
}
