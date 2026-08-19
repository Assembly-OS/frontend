import { currentLocale, requireUser } from "@/lib/session";
import { conversations, directory, rais, userGroups } from "@/lib/queries";
import { isOnline } from "@/lib/presence";
import { ConversationList } from "./chat-client";
import { ChatBar } from "./chat-bar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);
  const list = await conversations(user.id);
  const people = await directory(user.id);
  const groups = await userGroups(user.id);
  const chairman = await rais();

  const onlineLogins = [...list, ...people]
    .filter((person) => isOnline(person.id))
    .map((person) => person.login);

  return (
    // `dvh`, not `vh`: on a phone the URL bar slides away and back, and a
    // viewport unit that ignores it puts the message box under the browser
    // chrome exactly when someone is typing into it.
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--surface)]">
      <ChatBar locale={locale} />

      {/* The phone track is spelled out as minmax(0,1fr): a bare `grid` leaves
          one implicit `auto` column whose floor is the subtree's min-content,
          so a long name or message preview widened the column past the screen
          and cut the result off without so much as a scrollbar. A 0 minimum
          lets the column take the width it is given. */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-3 p-3 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-4 lg:p-4">
        <div className="hidden min-h-0 min-w-0 lg:block">
          <ConversationList
            conversations={list}
            groups={groups}
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
