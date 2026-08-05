import { redirect } from "next/navigation";
import { all } from "@/lib/db";
import { createTranslator } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { currentLocale, currentUser } from "@/lib/session";
import { I18nProvider } from "@/components/i18n-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Icon } from "@/components/icons";
import type { MessageKey } from "@/lib/i18n";
import type { Role } from "@/lib/types";
import { LoginForm, type DemoAccount } from "./login-form";

const DEMO_PASSWORD = "12345678";

const SCALE = [
  { value: "50+", key: "stats.uyushma" },
  { value: "1000+", key: "stats.members" },
  { value: "20+", key: "dashboard.projects" },
] as const;

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");

  const locale = await currentLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(locale);

  const rows = all<{ login: string; full_name: string; role: Role }>(
    `SELECT login, full_name, role FROM users
     WHERE is_active = 1
     ORDER BY CASE role
       WHEN 'RAIS' THEN 0 WHEN 'BOLIM_RAHBARI' THEN 1 WHEN 'AI_LAB' THEN 2
       WHEN 'UYUSHMA_RAISI' THEN 3 WHEN 'LOYIHA_RAHBARI' THEN 4 ELSE 5 END, login`,
  );
  const demo: DemoAccount[] = rows.map((row) => ({
    ...row,
    roleLabel: t(`role.${row.role}` as MessageKey),
  }));

  return (
    <I18nProvider locale={locale} dict={dict}>
      <main className="flex min-h-dvh flex-col lg:flex-row">
        {/* Brand panel */}
        <section className="relative isolate flex overflow-hidden bg-gradient-to-br from-navy-900 via-navy-950 to-navy-950 px-8 py-12 text-white lg:w-1/2 lg:px-16 lg:py-20">
          <div
            aria-hidden
            className="grid-dots pointer-events-none absolute inset-0 text-white/[0.045]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-navy-600/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"
          />
          <div className="relative flex h-full w-full flex-col justify-between gap-12">
            <div>
              <div className="animate-rise flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-gold-500 text-lg font-black text-navy-950 shadow-[0_10px_30px_-8px_rgba(231,167,22,0.55)] ring-1 ring-white/20">
                  A
                </span>
                <div>
                  <p className="text-sm font-bold tracking-[0.2em]">
                    {t("app.name")}
                  </p>
                  <p className="text-xs text-white/60">{t("app.org")}</p>
                </div>
              </div>

              <div
                className="animate-rise mt-12"
                style={{ animationDelay: "70ms" }}
              >
                <span className="block h-1 w-12 rounded-full bg-gold-500" />
                <h1 className="mt-5 max-w-md text-3xl font-bold leading-tight lg:text-4xl">
                  {t("app.tagline")}
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                  {t("app.subtitle")} — Davlat • Jamoatchilik • Xususiy sheriklik
                  platformasi
                </p>
              </div>
            </div>

            <dl
              className="animate-rise grid grid-cols-3 gap-4 border-t border-white/10 pt-8"
              style={{ animationDelay: "140ms" }}
            >
              {SCALE.map((item) => (
                <div key={item.value}>
                  <dt className="text-2xl font-bold text-gold-400">
                    {item.value}
                  </dt>
                  <dd className="mt-1 text-xs text-white/50">
                    {t(item.key as MessageKey)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Form panel */}
        <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
          <div
            className="animate-rise w-full max-w-sm"
            style={{ animationDelay: "90ms" }}
          >
            <div className="mb-8">
              <div className="flex justify-end">
                <LocaleSwitcher current={locale} />
              </div>
              <h2 className="mt-5 text-2xl font-bold">{t("login.title")}</h2>
              <p className="muted mt-1 text-sm">{t("login.hint")}</p>
            </div>

            <LoginForm demo={demo} password={DEMO_PASSWORD} />

            <p className="muted mt-6 flex items-center gap-2 text-xs">
              <Icon
                name="shield"
                className="size-4 text-emerald-600 dark:text-emerald-400"
              />
              {t("login.secure")}
            </p>
          </div>
        </section>
      </main>
    </I18nProvider>
  );
}
