"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import {
  Badge,
  Button,
  EmptyState,
  FIELD,
  Panel,
  Select,
  Td,
  Th,
  TableWrap,
} from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { statusTone, TASK_STATUSES } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
// Type-only: `lib/admin` opens the database and must never reach the browser.
import type { AdminTaskRow } from "@/lib/admin";

export function TasksPanel({ tasks }: { tasks: AdminTaskRow[] }) {
  const t = useT();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (status !== "ALL" && task.status !== status) return false;
      if (!needle) return true;
      return [task.code, task.title, task.from_name, task.to_name, task.project]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [tasks, query, status]);

  async function remove(task: AdminTaskRow) {
    // The event count is in the question on purpose. Withdrawing something sent
    // by mistake and erasing what somebody actually did are the same gesture
    // here, and only this number tells them apart.
    const asked = t("admin.confirmDeleteTask")
      .replace("{code}", task.code)
      .replace("{events}", String(task.events));
    if (!confirm(asked)) return;

    setBusy(true);
    setNotice(null);
    const response = await fetch(`/api/admin/tasks/${task.id}`, {
      method: "DELETE",
    });
    setBusy(false);

    if (!response.ok) {
      setNotice({ ok: false, text: t("admin.errFailed") });
      return;
    }
    setNotice({ ok: true, text: t("admin.taskDeleted") });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">{t("common.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("admin.searchTasks")}
            className={FIELD}
          />
        </label>

        <label className="min-w-0">
          <span className="sr-only">{t("tasks.status")}</span>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">{t("common.all")}</option>
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}` as MessageKey)}
              </option>
            ))}
          </Select>
        </label>

        <span className="muted text-xs tabular-nums">
          {rows.length} / {tasks.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          text={
            tasks.length === 0 ? t("admin.noTasks") : t("crm.nothingFound")
          }
          hint={tasks.length === 0 ? t("admin.noTasksHint") : undefined}
          icon="inbox"
        />
      ) : (
        <Panel>
          <TableWrap>
            <thead>
              <tr>
                <Th>{t("admin.taskCode")}</Th>
                <Th>{t("form.title")}</Th>
                <Th>{t("admin.taskFrom")}</Th>
                <Th>{t("admin.taskTo")}</Th>
                <Th>{t("tasks.status")}</Th>
                <Th>{t("form.deadline")}</Th>
                <Th numeric>{t("admin.taskEvents")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => (
                <tr key={task.id}>
                  <Td className="font-mono text-xs">{task.code}</Td>

                  <Td>
                    <p className="font-medium">{task.title}</p>
                    <p className="muted text-xs">
                      {task.project ?? t("admin.noProjectShort")}
                      {" · "}
                      {formatDateTime(task.created_at)}
                    </p>
                  </Td>

                  <Td className="text-xs">
                    {task.from_name}
                    <span className="muted block font-mono">
                      @{task.from_login}
                    </span>
                  </Td>

                  <Td className="text-xs">
                    {task.to_name}
                    <span className="muted block font-mono">
                      @{task.to_login}
                    </span>
                    {/* Only worth showing when there is a chain to be at a
                        point in; a plain task is stage 1 of 1. */}
                    {task.stage_count > 1 && (
                      <span className="muted block tabular-nums">
                        {t("admin.taskStage")
                          .replace("{n}", String(task.current_stage))
                          .replace("{of}", String(task.stage_count))}
                      </span>
                    )}
                  </Td>

                  <Td>
                    <Badge className={statusTone(task.status)}>
                      {t(`status.${task.status}` as MessageKey)}
                    </Badge>
                  </Td>

                  <Td className="text-xs tabular-nums">
                    {task.deadline ? formatDate(task.deadline) : "—"}
                  </Td>

                  <Td numeric className="text-xs">
                    {task.events}
                  </Td>

                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void remove(task)}
                      className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                    >
                      {t("admin.delete")}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Panel>
      )}
    </div>
  );
}
