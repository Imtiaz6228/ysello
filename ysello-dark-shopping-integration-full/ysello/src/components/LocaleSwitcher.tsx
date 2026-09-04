import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Coins, Globe2, X } from "lucide-react";
import {
  currencies,
  languages,
  useLocale,
  type CurrencyCode,
  type LocaleCode,
} from "../i18n/LocaleContext";

type Panel = "language" | "currency" | null;

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, currency, setLocale, setCurrency, t } = useLocale();
  const [panel, setPanel] = useState<Panel>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeLanguage =
    languages.find((item) => item.code === locale) ?? languages[0];
  const activeCurrency =
    currencies.find((item) => item.code === currency) ?? currencies[0];

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div
      className={`locale-controls ${compact ? "compact" : ""}`}
      ref={rootRef}
    >
      <button
        className={`locale-control-button ${panel === "language" ? "active" : ""}`}
        type="button"
        onClick={() =>
          setPanel((current) => (current === "language" ? null : "language"))
        }
        aria-expanded={panel === "language"}
        aria-label={t("language")}
      >
        <Globe2 size={16} />
        <span className="locale-flag">{activeLanguage.flag}</span>
        <span className="locale-control-copy">
          <small>{t("language")}</small>
          <b>
            {compact
              ? activeLanguage.code.split("-")[0].toUpperCase()
              : activeLanguage.native}
          </b>
        </span>
        <ChevronDown size={14} />
      </button>

      <button
        className={`locale-control-button ${panel === "currency" ? "active" : ""}`}
        type="button"
        onClick={() =>
          setPanel((current) => (current === "currency" ? null : "currency"))
        }
        aria-expanded={panel === "currency"}
        aria-label={t("currency")}
      >
        <Coins size={16} />
        <span className="locale-currency-symbol">{activeCurrency.symbol}</span>
        <span className="locale-control-copy">
          <small>{t("currency")}</small>
          <b>{activeCurrency.code}</b>
        </span>
        <ChevronDown size={14} />
      </button>

      {panel ? (
        <div
          className={`locale-popover ${panel}`}
          role="dialog"
          aria-label={panel === "language" ? t("language") : t("currency")}
        >
          <header>
            <div>
              <span className="section-index">GLOBAL MARKETPLACE</span>
              <h3>{panel === "language" ? t("language") : t("currency")}</h3>
            </div>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </header>
          <div className="locale-popover-grid">
            {panel === "language"
              ? languages.map((item) => (
                  <button
                    type="button"
                    className={locale === item.code ? "active" : ""}
                    key={item.code}
                    onClick={() => {
                      setLocale(item.code as LocaleCode);
                      setPanel(null);
                    }}
                  >
                    <span>{item.flag}</span>
                    <div>
                      <strong>{item.native}</strong>
                      <small>{item.label}</small>
                    </div>
                    {locale === item.code ? <Check size={17} /> : null}
                  </button>
                ))
              : currencies.map((item) => (
                  <button
                    type="button"
                    className={currency === item.code ? "active" : ""}
                    key={item.code}
                    onClick={() => {
                      setCurrency(item.code as CurrencyCode);
                      setPanel(null);
                    }}
                  >
                    <span>{item.symbol}</span>
                    <div>
                      <strong>{item.code}</strong>
                      <small>{item.label}</small>
                    </div>
                    {currency === item.code ? <Check size={17} /> : null}
                  </button>
                ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
