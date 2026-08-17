"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import {
  Button,
  DateField,
  FIELD,
  IconButton,
  Panel,
  Select,
} from "@/components/ui";

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  is_head: number;
}

/**
 * The interactive half of the company card: contacts and new agreements.
 *
 * Both are add-in-place rather than separate pages. Someone reading a company
 * has the phone number in front of them; sending them to a form on another
 * route to type it is how contact lists stay empty.
 */
export function CompanyPanels({
  companyId,
  contacts,
  staff,
  writable,
}: {
  companyId: number;
  contacts: Contact[];
  staff: { id: number; full_name: string }[];
  writable: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openAgreement, setOpenAgreement] = useState(false);

  async function post(url: string, body: unknown) {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setOpenContact(false);
        setOpenAgreement(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    setBusy(true);
    try {
      await fetch(url, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        title={t("crm.tab.contacts")}
        action={
          writable ? (
            <button
              type="button"
              onClick={() => setOpenContact((open) => !open)}
              className="muted text-xs font-medium hover:underline"
            >
              {t("crm.newContact")}
            </button>
          ) : undefined
        }
      >
        {openContact && (
          <form
            className="space-y-2 border-b p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void post("/api/crm/contacts", {
                company_id: companyId,
                first_name: form.get("first_name"),
                last_name: form.get("last_name"),
                position: form.get("position"),
                phone: form.get("phone"),
                email: form.get("email"),
                telegram: form.get("telegram"),
                is_head: form.get("is_head") === "on",
              });
            }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              <input name="first_name" required placeholder={t("profile.fullName")} className={FIELD} />
              <input name="last_name" placeholder="—" className={FIELD} />
            </div>
            <input name="position" placeholder={t("profile.position")} className={FIELD} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              <input name="phone" placeholder={t("crm.field.phone")} className={FIELD} />
              <input name="email" type="email" placeholder={t("crm.field.email")} className={FIELD} />
            </div>
            <input name="telegram" placeholder="Telegram" className={FIELD} />
            <label className="flex items-center gap-2 text-xs">
              <input name="is_head" type="checkbox" className="size-4" />
              {t("crm.isHead")}
            </label>
            <Button type="submit" size="sm" disabled={busy} block>
              {t("common.save")}
            </Button>
          </form>
        )}

        {contacts.length === 0 ? (
          <p className="muted px-5 py-6 text-center text-sm">{t("common.noData")}</p>
        ) : (
          <ul className="divide-y">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {contact.first_name} {contact.last_name}
                    {contact.is_head === 1 && (
                      <span className="muted ml-2 text-[11px]">
                        · {t("crm.isHead")}
                      </span>
                    )}
                  </p>
                  <p className="muted truncate text-xs">{contact.position ?? "—"}</p>
                  <p className="muted truncate text-xs">
                    {[contact.phone, contact.email, contact.telegram]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                {writable && (
                  <IconButton
                    icon="trash"
                    label={t("common.delete")}
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void remove(`/api/crm/contacts/${contact.id}`)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {writable && (
        <Panel
          title={t("crm.newAgreement")}
          action={
            <button
              type="button"
              onClick={() => setOpenAgreement((open) => !open)}
              className="muted text-xs font-medium hover:underline"
            >
              {openAgreement ? t("ai.cancelEdit") : t("common.add")}
            </button>
          }
        >
          {openAgreement ? (
            <form
              className="space-y-2 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void post("/api/crm/agreements", {
                  company_id: companyId,
                  description: form.get("description"),
                  owner_user_id: form.get("owner_user_id") || null,
                  deadline: form.get("deadline") || null,
                  priority: form.get("priority"),
                });
              }}
            >
              <textarea
                name="description"
                required
                rows={2}
                placeholder={t("crm.newAgreement")}
                className={`${FIELD} resize-y`}
              />
              <Select name="owner_user_id" defaultValue="">
                <option value="">{t("form.selectExecutor")}</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                <DateField name="deadline" />
                <Select name="priority" defaultValue="ORTA">
                  {["PAST", "ORTA", "YUQORI", "KRITIK"].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" size="sm" disabled={busy} block>
                {t("common.save")}
              </Button>
            </form>
          ) : (
            <p className="muted px-5 py-4 text-xs">{t("crm.agreementsDesc")}</p>
          )}
        </Panel>
      )}
    </>
  );
}
