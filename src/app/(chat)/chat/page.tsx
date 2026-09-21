import { requireUser } from "@/lib/session";
import { isExternal } from "@/lib/types";
import { conversations, directory, rais, userGroups } from "@/lib/queries";
import { isOnline } from "@/lib/presence";
import { ChatPlaceholder, ConversationList } from "./chat-client";

export default async function ChatIndexPage() {
  const user = await requireUser();
  const list = await conversations(user.id);
  const people = await directory(user);
  const chairman = await rais();

  // Logins that are online right now, among everyone shown in the rail.
  const onlineLogins = [...list, ...people]
    .filter((person) => isOnline(person.id))
    .map((person) => person.login);

  return (
    <>
      {/* On phones this page *is* the conversation list; the rail is hidden. */}
      <div className="h-full min-h-0 lg:hidden">
        <ConversationList
          conversations={list}
          groups={await userGroups(user.id)}
          people={people}
          // Someone outside the Assembly writes to his contacts only (TZ 4.3).
          raisLogin={isExternal(user.role) ? null : (chairman?.login ?? null)}
          meLogin={user.login}
          onlineLogins={onlineLogins}
        />
      </div>
      <ChatPlaceholder />
    </>
  );
}
