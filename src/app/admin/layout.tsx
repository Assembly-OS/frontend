import { getDictionary } from "@/lib/i18n";
import { currentLocale } from "@/lib/session";
import { I18nProvider } from "@/components/i18n-provider";

/**
 * The panel's own shell. Deliberately not the platform's `AppShell`: no staff
 * navigation, no task counters, no presence stream — this is a separate
 * application that happens to share a database. Authentication is checked by
 * each page, not here, so `/admin/login` can render inside the same chrome.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await currentLocale();
  return (
    <I18nProvider locale={locale} dict={getDictionary(locale)}>
      {children}
    </I18nProvider>
  );
}
