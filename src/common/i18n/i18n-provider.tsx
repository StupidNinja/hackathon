import { useMemo, useState, type ReactNode } from "react";
import { translations, type Locale } from "@/common/i18n/translations";
import { I18nContext, type TranslationParams } from "@/common/i18n/use-i18n";

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    if (token in params) {
      return String(params[token]);
    }
    return `{{${token}}}`;
  });
}

type I18nProviderProps = {
  children: ReactNode;
  defaultLocale?: Locale;
};

export function I18nProvider({ children, defaultLocale = "ru" }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  const value = useMemo(() => {
    const dictionary = translations[locale];

    return {
      locale,
      setLocale,
      t: (key: keyof typeof dictionary, params?: TranslationParams) =>
        interpolate(dictionary[key] ?? key, params),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
