import { createTranslator } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { conversations, directory, rais } from "@/lib/queries";
import { isOnline } from "@/lib/presence";
import { PageHeader } from "@/components/ui";
import { ConversationList } from "./chat-client";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const list = conversations(user.id);
  const people = directory(user.id);
  const chairman = rais();

  const onlineLogins = [...list, ...people]
    .filter((person) => isOnline(person.id))
    .map((person) => person.login);

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[520px] flex-col">
      <PageHeader title={t("chat.title")} description={t("chat.searchHint")} />
      {/* The phone track is spelled out as minmax(0,1fr): a bare `grid` leaves
          one implicit `auto` column whose floor is the subtree's min-content,
          so a long name or message preview widened the column past the screen
          and `overflow-x-clip` on <main> cut the result off without so much as
          a scrollbar. A 0 minimum lets the column take the width it is given. */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden min-h-0 min-w-0 lg:block">
          <ConversationList
            conversations={list}
            people={people}
            raisLogin={chairman?.login ?? null}
            meLogin={user.login}
            onlineLogins={onlineLogins}
          />
        </div>
        <div className="min-h-0 min-w-0">{children}</div>
      </div>
    </div>
  );
}
