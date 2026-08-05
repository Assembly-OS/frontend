import { getDictionary, createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { counters, pulse } from "@/lib/queries";
import { I18nProvider } from "@/components/i18n-provider";
import { AppShell, type NavItem } from "@/components/app-shell";
import { LiveUpdates } from "@/components/live-updates";
import { isManager, receivesTasks } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const dict = getDictionary(locale);
  const t = createTranslator(locale);
  const c = counters(user.id);

  const manager = isManager(user.role);

  const nav: NavItem[] = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: "grid" },
  ];

  // Nobody assigns work to the Rais, so those two pages are not shown to them.
  if (receivesTasks(user.role)) {
    nav.push(
      {
        href: "/tasks/inbox",
        labelKey: "nav.inbox",
        icon: "inbox",
        badge: c.incoming,
        group: "nav.tasks",
      },
      {
        href: "/tasks/execute",
        labelKey: "nav.execute",
        icon: "play",
        badge: c.inWork,
        group: "nav.tasks",
      },
    );
  }

  if (manager) {
    nav.push(
      {
        href: "/tasks/assign",
        labelKey: "nav.assign",
        icon: "send",
        group: "nav.tasks",
      },
      {
        href: "/tasks/review",
        labelKey: "nav.review",
        icon: "check",
        badge: c.onReview,
        group: "nav.tasks",
      },
    );
  }

  nav.push({
    href: "/chat",
    labelKey: "nav.chat",
    icon: "chat",
    badge: c.unread,
  });

  if (manager) {
    nav.push({ href: "/team", labelKey: "nav.team", icon: "users" });
    nav.push({
      href: "/statistics",
      labelKey: "nav.statistics",
      icon: "chart",
    });
  }

  nav.push({ href: "/profile", labelKey: "nav.profile", icon: "user" });

  return (
    <I18nProvider locale={locale} dict={dict}>
      <AppShell
        nav={nav}
        locale={locale}
        user={{
          full_name: user.full_name,
          login: user.login,
          roleLabel: t(`role.${user.role}` as MessageKey),
          departmentLabel: user.department
            ? t(`dept.${user.department}` as MessageKey).split(" — ")[0]
            : null,
        }}
      >
        {children}
      </AppShell>
      <LiveUpdates initial={pulse(user)} />
    </I18nProvider>
  );
}
