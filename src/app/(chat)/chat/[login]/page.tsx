import { notFound, redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { thread, THREAD_PAGE, userByLogin } from "@/lib/queries";
import { isOnline } from "@/lib/presence";
import { now, run } from "@/lib/db";
import { Thread } from "../chat-client";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ login: string }>;
}) {
  const { login } = await params;
  const user = await requireUser();
  const partner = userByLogin(decodeURIComponent(login));

  if (!partner) notFound();
  if (partner.id === user.id) redirect("/chat");

  // Opening the thread clears its unread badge.
  run(
    "UPDATE messages SET read_at = ? WHERE to_user_id = ? AND from_user_id = ? AND read_at IS NULL",
    now(),
    user.id,
    partner.id,
  );

  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const initial = thread(user.id, partner.id);

  return (
    <Thread
      meId={user.id}
      endpoint={`/api/chat/${encodeURIComponent(partner.login)}`}
      partner={{
        login: partner.login,
        full_name: partner.full_name,
        position: partner.position,
        roleLabel: t(`role.${partner.role}` as MessageKey),
        online: isOnline(partner.id),
        lastSeen: partner.last_seen,
      }}
      initial={initial}
      initialHasMore={initial.length === THREAD_PAGE}
    />
  );
}
