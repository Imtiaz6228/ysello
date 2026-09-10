type Point = { label: string; value: number };

export function MiniBars({
  data,
  color = "#7c3aed",
}: {
  data: Point[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div
      style={{ display: "flex", alignItems: "end", gap: 6, height: 90 }}
      aria-label="Earnings bar chart"
    >
      {data.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          title={`${item.label}: ${item.value}`}
          style={{
            flex: 1,
            minWidth: 5,
            maxWidth: 28,
            height: `${Math.max(4, (item.value / max) * 100)}%`,
            borderRadius: "4px 4px 1px 1px",
            background: color,
            opacity: 0.45 + (index / Math.max(1, data.length)) * 0.55,
          }}
        />
      ))}
    </div>
  );
}

export function EarningsChart({
  points,
  color = "#7c3aed",
  label,
}: {
  points: Point[];
  color?: string;
  label: string;
}) {
  const width = 720,
    height = 220,
    pad = 24;
  const max = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => ({
    x: pad + index * ((width - pad * 2) / Math.max(1, points.length - 1)),
    y: height - pad - (point.value / max) * (height - pad * 2),
    ...point,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = coords.length
    ? `${pad},${height - pad} ${line} ${coords[coords.length - 1].x},${height - pad}`
    : "";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${label} earnings chart`}
    >
      <defs>
        <linearGradient id="earnings-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((row) => (
        <line
          key={row}
          x1={pad}
          x2={width - pad}
          y1={pad + row * ((height - pad * 2) / 3)}
          y2={pad + row * ((height - pad * 2) / 3)}
          stroke="#3f3f46"
          strokeWidth="1"
        />
      ))}
      {area && <polygon points={area} fill="url(#earnings-fill)" />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3" fill={color}>
          <title>
            {point.label}: ${(point.value / 100).toFixed(2)}
          </title>
        </circle>
      ))}
    </svg>
  );
}
