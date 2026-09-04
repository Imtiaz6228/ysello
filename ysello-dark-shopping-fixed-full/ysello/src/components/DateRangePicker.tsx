import { useState } from "react";

export type Granularity = "daily" | "weekly" | "monthly";

type DateRangePickerProps = {
  from: string;
  to: string;
  granularity: Granularity;
  onApply: (from: string, to: string, granularity: Granularity) => void;
};

export function DateRangePicker({
  from,
  to,
  granularity,
  onApply,
}: DateRangePickerProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [localGranularity, setLocalGranularity] =
    useState<Granularity>(granularity);
  const invalidRange = Boolean(localFrom && localTo && localFrom > localTo);

  const quickRanges = [
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
  ];

  function applyQuickRange(days: number) {
    const newTo = new Date();
    const newFrom = new Date();
    newFrom.setDate(newFrom.getDate() - days);
    const fromStr = newFrom.toISOString().slice(0, 10);
    const toStr = newTo.toISOString().slice(0, 10);
    setLocalFrom(fromStr);
    setLocalTo(toStr);
    onApply(fromStr, toStr, localGranularity);
  }

  return (
    <section
      aria-label="Report date range"
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
        padding: "12px",
        background: "#18181b",
        borderRadius: "12px",
        border: "1px solid #27272a",
      }}
    >
      <div
        role="group"
        aria-label="Report interval"
        style={{ display: "flex", gap: "4px" }}
      >
        {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
          <button
            type="button"
            aria-pressed={localGranularity === g}
            key={g}
            onClick={() => setLocalGranularity(g)}
            style={{
              height: "32px",
              padding: "0 16px",
              borderRadius: "9999px",
              border: "none",
              background: localGranularity === g ? "#0A0A0B" : "transparent",
              color: localGranularity === g ? "#fafafa" : "#a1a1aa",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <label className="sr-only" htmlFor="report-date-from">
          Start date
        </label>
        <input
          id="report-date-from"
          aria-invalid={invalidRange}
          type="date"
          max={localTo || undefined}
          value={localFrom}
          onChange={(e) => setLocalFrom(e.target.value)}
          style={{
            background: "#0A0A0B",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            padding: "6px 10px",
            color: "#fafafa",
            fontSize: "13px",
          }}
        />
        <span style={{ color: "#71717a" }}>→</span>
        <label className="sr-only" htmlFor="report-date-to">
          End date
        </label>
        <input
          id="report-date-to"
          aria-invalid={invalidRange}
          type="date"
          min={localFrom || undefined}
          value={localTo}
          onChange={(e) => setLocalTo(e.target.value)}
          style={{
            background: "#0A0A0B",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            padding: "6px 10px",
            color: "#fafafa",
            fontSize: "13px",
          }}
        />
      </div>
      <button
        type="button"
        disabled={invalidRange}
        onClick={() => onApply(localFrom, localTo, localGranularity)}
        style={{
          background: "#7c3aed",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "6px 16px",
          cursor: invalidRange ? "not-allowed" : "pointer",
          fontSize: "13px",
          fontWeight: 500,
        }}
      >
        Apply
      </button>
      <div
        role="group"
        aria-label="Quick date ranges"
        style={{ display: "flex", gap: "4px" }}
      >
        {quickRanges.map((r) => (
          <button
            type="button"
            key={r.label}
            onClick={() => applyQuickRange(r.days)}
            style={{
              background: "#27272a",
              color: "#d4d4d8",
              border: "none",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      {invalidRange ? (
        <span role="alert" style={{ color: "#fca5a5", fontSize: "12px" }}>
          Start date must be before the end date.
        </span>
      ) : null}
    </section>
  );
}

export function toCSV(
  rows: Array<Record<string, unknown>>,
  headers?: string[],
): string {
  if (rows.length === 0) return "";
  const keys = headers ?? Object.keys(rows[0]);
  const headerLine = keys.map((k) => csvCell(k)).join(",");
  const dataLines = rows.map((row) =>
    keys.map((k) => csvCell(row[k])).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

function csvCell(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
