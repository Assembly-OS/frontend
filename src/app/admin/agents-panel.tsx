"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Badge, Panel } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { AgentSpec } from "@/lib/agents/registry";
import type { ProposalView, RunRow } from "@/lib/agents/orchestrator";

/** Severity colours mirror the notification policy of TZ §11.1. */
const SEVERITY: Record<string, string> = {
  P1: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
  P2: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  P3: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30",
  P4: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30",
};

const STATUS_TONE: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  executed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  auto: "bg-navy-50 text-navy-700 ring-navy-600/20 dark:bg-navy-500/10 dark:text-navy-200 dark:ring-navy-400/30",
  rejected:
    "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30",
  failed:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
};

export function AgentsPanel({
  agents,
  runs,
  proposals,
  llmConfigured,
}: {
  agents: AgentSpec[];
  runs: RunRow[];
  proposals: ProposalView[];
  llmConfigured: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);

  async function start(agentId: string) {
    setBusy(agentId);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentId }),
      });
      const data = (await response.json()) as {
        status?: string;
        detail?: string;
        proposals?: number;
        pending?: number;
        summary?: string;
      };
      setNotice(
        data.status === "blocked"
          ? `${t("agent.blocked")}: ${data.detail ?? ""}`
          : data.summary ||
              `${t("agent.proposals")}: ${data.proposals ?? 0} · ${t("agent.pendingOnly")}: ${data.pending ?? 0}`,
      );
      router.refresh();
    } catch {
      setNotice(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  async function decide(id: number, decision: "approve" | "reject") {
    setBusy(`p${id}`);
    try {
      await fetch(`/api/admin/agents/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const shown = pendingOnly
    ? proposals.filter((item) => item.status === "pending")
    : proposals;

  return (
    <div className="space-y-5">
      {!llmConfigured && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t("agent.llmOff")}
        </p>
      )}
      {notice && (
        <p className="rounded-xl bg-[var(--surface)] px-4 py-3 text-sm">
          {notice}
        </p>
      )}

      <Panel title={t("agent.title")}>
        <ul className="divide-y">
          {agents.map((agent) => (
            <li key={agent.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {agent.title}
                    <Badge
                      className={
                        agent.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30"
                          : "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30"
                      }
                    >
                      {agent.status === "active"
                        ? t("agent.active")
                        : t("agent.planned")}
                    </Badge>
                  </p>
                  <p className="muted mt-0.5 text-xs">{agent.task}</p>
                  <p className="muted mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <span>
                      {t("agent.dataScope")}:{" "}
                      <span className="font-mono">
                        {agent.dataScope.join(", ") || "—"}
                      </span>
                    </span>
                    <span>
                      {t("agent.actionScope")}:{" "}
                      <span className="font-mono">
                        {agent.actionScope.join(", ")}
                      </span>
                    </span>
                    <span>
                      {t("agent.approval")}:{" "}
                      {agent.approval === "always"
                        ? t("agent.approvalAlways")
                        : t("agent.approvalSide")}
                    </span>
                    <span>
                      {t("agent.budget")}:{" "}
                      {agent.tokenBudget.toLocaleString("ru-RU")}
                    </span>
                  </p>
                  {agent.blockedBy && (
                    <p className="muted mt-1 text-[11px] italic">
                      {agent.blockedBy}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void start(agent.id)}
                  disabled={busy !== null || agent.status !== "active"}
                  className="shrink-0 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-40 dark:bg-navy-600"
                >
                  {busy === agent.id ? t("agent.running") : t("agent.run")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title={`${t("agent.proposals")}: ${shown.length}`}
        action={
          <button
            type="button"
            onClick={() => setPendingOnly((value) => !value)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              pendingOnly ? "bg-navy-900 text-white dark:bg-navy-600" : "muted"
            }`}
          >
            {t("agent.pendingOnly")}
          </button>
        }
      >
        {shown.length === 0 ? (
          <p className="muted px-5 py-8 text-sm">{t("agent.noProposals")}</p>
        ) : (
          <ul className="scroll-thin max-h-[30rem] divide-y overflow-y-auto">
            {shown.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <div className="flex flex-wrap items-start gap-2">
                  <Badge className={SEVERITY[item.severity] ?? SEVERITY.P3}>
                    {item.severity}
                  </Badge>
                  <span className="muted font-mono text-[11px]">
                    {item.action}
                  </span>
                  <Badge
                    className={STATUS_TONE[item.status] ?? STATUS_TONE.auto}
                  >
                    {item.status}
                  </Badge>
                  <span className="muted ml-auto text-[11px]">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium">{item.title}</p>
                <p className="muted mt-0.5 whitespace-pre-wrap text-xs">
                  {item.body}
                </p>
                {item.decided_by && (
                  <p className="muted mt-1 text-[11px]">
                    {t("agent.decidedBy")}: {item.decided_by}
                    {item.result ? ` · ${item.result}` : ""}
                  </p>
                )}
                {item.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void decide(item.id, "approve")}
                      disabled={busy !== null}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {t("agent.approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void decide(item.id, "reject")}
                      disabled={busy !== null}
                      className="muted rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:text-rose-600 disabled:opacity-40"
                    >
                      {t("agent.reject")}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("agent.runs")}>
        {runs.length === 0 ? (
          <p className="muted px-5 py-8 text-sm">{t("agent.noRuns")}</p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="muted border-b text-left text-xs">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Agent</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t("agent.contextRows")}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t("agent.proposals")}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t("agent.tokens")}
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {t("agent.duration")}
                  </th>
                  <th className="px-5 py-2.5 font-semibold">
                    {t("admin.lastSeen")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="px-5 py-2.5 font-mono text-xs">
                      {entry.agent}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        className={
                          entry.status === "ok"
                            ? STATUS_TONE.executed
                            : STATUS_TONE.failed
                        }
                      >
                        {entry.status}
                      </Badge>
                      {entry.detail && (
                        <span className="muted ml-2 text-[11px]">
                          {entry.detail}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {entry.context_rows}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {entry.proposals}
                    </td>
                    <td className="muted px-3 py-2.5 text-right tabular-nums">
                      {entry.tokens_in + entry.tokens_out || "—"}
                    </td>
                    <td className="muted px-3 py-2.5 text-right tabular-nums">
                      {entry.duration_ms} ms
                    </td>
                    <td className="muted px-5 py-2.5 text-xs">
                      {formatDateTime(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
