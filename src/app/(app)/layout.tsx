import { getDictionary, createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { counters, pulse } from "@/lib/queries";
import { I18nProvider } from "@/components/i18n-provider";
import { AppShell, type NavItem } from "@/components/app-shell";
import { LiveUpdates } from "@/components/live-updates";
import { isManager, receivesTasks } from "@/lib/types";
import { canSubmitToAi } from "@/lib/agents/access";

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

  /**
   * Four labelled groups, not thirteen flat rows.
   *
   * The sidebar had grown one entry per feature until it was a list nobody
   * scanned — three of them beginning with "AI" and two of those doing quite
   * different things. Grouping by *what the person came to do* costs nothing
   * and makes the column readable at a glance. The order is deliberate: your
   * own work first, the outside world second, the machine third, the
   * management view last.
   */
  const nav: NavItem[] = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: "grid" },
  ];

  /* --- Ish: your own queue ------------------------------------------ */

  // Nobody assigns work to the Rais, so those two pages are not shown to them.
  if (receivesTasks(user.role)) {
    nav.push(
      {
        href: "/tasks/inbox",
        labelKey: "nav.inbox",
        icon: "inbox",
        badge: c.incoming,
        group: "nav.group.work",
      },
      {
        href: "/tasks/execute",
        labelKey: "nav.execute",
        icon: "play",
        badge: c.inWork,
        group: "nav.group.work",
      },
    );
  }

  if (manager) {
    nav.push(
      {
        href: "/tasks/assign",
        labelKey: "nav.assign",
        icon: "send",
        group: "nav.group.work",
      },
      {
        href: "/tasks/review",
        labelKey: "nav.review",
        icon: "check",
        badge: c.onReview,
        group: "nav.group.work",
      },
    );
  }

  nav.push({
    href: "/chat",
    labelKey: "nav.chat",
    icon: "chat",
    badge: c.unread,
    group: "nav.group.work",
  });

  /* --- Hamkorlar: the outside world --------------------------------- */

  nav.push({
    href: "/companies",
    labelKey: "nav.companies",
    icon: "users",
    group: "nav.group.partners",
  });
  nav.push({
    href: "/agreements",
    labelKey: "nav.agreements",
    icon: "check",
    group: "nav.group.partners",
  });
  if (canSubmitToAi(user)) {
    nav.push({
      href: "/meetings",
      labelKey: "nav.meetings",
      icon: "file",
      group: "nav.group.partners",
    });
  }

  /* --- AI ------------------------------------------------------------ */

  nav.push({
    href: "/assistant",
    labelKey: "nav.assistant",
    icon: "chat",
    group: "nav.group.ai",
  });
  if (canSubmitToAi(user)) {
    nav.push({
      href: "/ai",
      labelKey: "nav.ai",
      icon: "shield",
      group: "nav.group.ai",
    });
    // `/partners` is gone from the menu, not from the app: its suggestions and
    // history now sit on the company card, where the reader is already looking.
    // The route still answers for anyone holding a link to it.
  }

  /* --- Boshqaruv: the management view -------------------------------- */

  if (manager) {
    nav.push({
      href: "/team",
      labelKey: "nav.team",
      icon: "users",
      group: "nav.group.manage",
    });
    nav.push({
      href: "/statistics",
      labelKey: "nav.statistics",
      icon: "chart",
      group: "nav.group.manage",
    });
    // Weekly review — who did what, Monday to Sunday.
    nav.push({
      href: "/reports",
      labelKey: "nav.reports",
      icon: "calendar",
      group: "nav.group.manage",
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
