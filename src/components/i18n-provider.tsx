"use client";

import { createContext, useCallback, useContext } from "react";
import type { Dictionary, MessageKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: I18nValue & { children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  const { dict, locale } = ctx;
  const t = useCallback((key: MessageKey) => dict[key] ?? key, [dict]);
  return { t, locale, dict };
}

export function useT() {
  return useI18n().t;
}
