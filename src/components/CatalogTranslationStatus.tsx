import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useLocale } from "../i18n/LocaleContext";
type Status = {
  running: boolean;
  scanned: number;
  translated: number;
  failed: number;
  lastError: string;
  completedAt: string | null;
};
export function CatalogTranslationStatus() {
  const { locale } = useLocale();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const copy = locale.startsWith("zh")
    ? [
        "商品标题翻译",
        "已检查",
        "已翻译",
        "失败",
        "重试缺失的翻译",
        "正在处理",
        "本轮检查完成",
        "等待处理",
      ]
    : locale === "ru"
      ? [
          "Перевод названий товаров",
          "Проверено",
          "Переведено",
          "Ошибок",
          "Повторить недостающие переводы",
          "В работе",
          "Проверка завершена",
          "Ожидание",
        ]
      : [
          "Product title translations",
          "Checked",
          "Translated",
          "Failed",
          "Retry missing translations",
          "Processing",
          "Pass completed",
          "Waiting",
        ];
  useEffect(() => {
    let active = true;
    const load = () =>
      apiRequest<Status>("/api/admin/dark-shopping/resale/translations")
        .then((s) => {
          if (active) {
            setStatus(s);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <section className="ys-translation-status">
      <strong>{copy[0]} · EN / 中文 / RU</strong>
      <p role="status">
        {status
          ? `${status.running ? copy[5] : status.completedAt ? copy[6] : copy[7]} · ${copy[1]}: ${status.scanned} · ${copy[2]}: ${status.translated} · ${copy[3]}: ${status.failed}`
          : "…"}
      </p>
      {error || status?.lastError ? (
        <p role="alert">{error || status?.lastError}</p>
      ) : null}
      <button
        type="button"
        disabled={status?.running}
        onClick={() => {
          void apiRequest<Status>(
            "/api/admin/dark-shopping/resale/translations/retry",
            { method: "POST" },
          )
            .then(setStatus)
            .catch((e) => setError(e.message));
        }}
      >
        {copy[4]}
      </button>
    </section>
  );
}
