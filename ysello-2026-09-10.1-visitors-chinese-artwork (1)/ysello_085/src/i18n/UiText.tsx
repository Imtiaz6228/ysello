import { type ReactNode } from "react";
import { useLocale } from "./LocaleContext";
import { uiText } from "./marketplaceCopy";
export function UiText({ value }: { value: ReactNode }) {
  const { locale } = useLocale();
  return typeof value === "string" ? uiText(value, locale) : value;
}
