import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  groupById,
  groupMembers,
  groupThread,
  isGroupMember,
  markGroupRead,
  THREAD_PAGE,
} from "@/lib/queries";
import { publish } from "@/lib/events";
import { Thread } from "../../chat-client";

export default async function GroupThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const groupId = Number((await params).id);

  const group = Number.isInteger(groupId) ? await groupById(groupId) : undefined;
  // A non-member is told nothing about whether the group exists.
  if (!group || !(await isGroupMember(groupId, user.id))) notFound();

  // Opening the group clears its badge for this member only.
  if (await markGroupRead(groupId, user.id)) publish(user.id);

  const initial = await groupThread(groupId);

  return (
    <Thread
      meId={user.id}
      endpoint={`/api/chat/group/${groupId}`}
      group={{
        id: group.id,
        title: group.title,
        members: (await groupMembers(groupId)).length,
      }}
      initial={initial}
      initialHasMore={initial.length === THREAD_PAGE}
    />
  );
}
