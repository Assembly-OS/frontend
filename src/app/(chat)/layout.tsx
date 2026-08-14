import { getDictionary } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { pulse } from "@/lib/queries";
import { I18nProvider } from "@/components/i18n-provider";
import { LiveUpdates } from "@/components/live-updates";

/**
 * The full-screen shell.
 *
 * Messaging is the one part of the platform people sit inside rather than
 * visit, and reading a conversation through a 900-pixel window with a
 * navigation column beside it wastes the half of the screen the messages
 * actually want. So this route group keeps the providers — language, live
 * updates, presence — and drops the sidebar and the app header entirely.
 *
 * The way back is a button in the chat's own bar, not a menu column standing
 * there for the whole conversation. Same routes, same URLs: only the frame
 * around them is different.
 */
export default async function ChatShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const locale = await currentLocale(user);

  return (
    <I18nProvider locale={locale} dict={getDictionary(locale)}>
      {children}
      <LiveUpdates initial={pulse(user)} />
    </I18nProvider>
  );
}
