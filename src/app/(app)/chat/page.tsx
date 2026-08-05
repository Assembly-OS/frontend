import { requireUser } from "@/lib/session";
import { conversations, directory, rais } from "@/lib/queries";
import { isOnline } from "@/lib/presence";
import { ChatPlaceholder, ConversationList } from "./chat-client";

export default async function ChatIndexPage() {
  const user = await requireUser();
  const list = conversations(user.id);
  const people = directory(user.id);
  const chairman = rais();

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
          people={people}
          raisLogin={chairman?.login ?? null}
          meLogin={user.login}
          onlineLogins={onlineLogins}
        />
      </div>
      <ChatPlaceholder />
    </>
  );
}
