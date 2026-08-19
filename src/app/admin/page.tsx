import { redirect } from "next/navigation";
import Link from "next/link";
import { hasAdminSession, ADMIN_LOGIN } from "@/lib/admin-auth";
import {
  allConversations,
  allGroups,
  adminTasks,
  managerOptions,
  projects,
  staff,
} from "@/lib/admin";
import { dbStats, onlineUsers, recentEvents, systemInfo } from "@/lib/dev";
import { Icon } from "@/components/icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { currentLocale } from "@/lib/session";
import { AGENTS } from "@/lib/agents/registry";
import { isConfigured } from "@/lib/agents/claude";
import { proposals, recentRuns } from "@/lib/agents/orchestrator";
import { AdminClient } from "./admin-client";

// Staff lists, presence and uptime are all "as of this request" — never cached.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  const locale = await currentLocale();

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <header className="sticky top-0 z-30 border-b bg-[var(--panel)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-white dark:bg-navy-600">
            <Icon name="shield" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-[0.14em]">
              ADMIN
            </p>
            <p className="muted truncate text-xs font-mono">{ADMIN_LOGIN}</p>
          </div>

          {/* A way back to the platform, which is a separate login entirely. */}
          <Link
            href="/dashboard"
            className="muted hidden rounded-xl border px-3 py-2 text-xs font-medium transition hover:bg-[var(--surface)] sm:block"
          >
            Platforma
          </Link>
          <LocaleSwitcher current={locale} />
          <form action="/api/admin/auth/logout" method="post">
            <button
              type="submit"
              className="muted grid size-9 place-items-center rounded-xl border transition hover:text-rose-600"
              aria-label="Logout"
            >
              <Icon name="logout" className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <AdminClient
          staff={await staff()}
          projects={await projects()}
          tasks={await adminTasks()}
          managers={await managerOptions()}
          stats={await dbStats()}
          online={await onlineUsers()}
          events={await recentEvents(20)}
          system={systemInfo()}
          chats={await allConversations()}
          groups={await allGroups()}
          agents={AGENTS}
          agentRuns={await recentRuns(25)}
          agentProposals={await proposals(null, 60)}
          llmConfigured={isConfigured()}
        />
      </main>
    </div>
  );
}
