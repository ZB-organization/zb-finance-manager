/**
 * ProgressBar — animated, reusable across the whole app.
 */
import { useEffect, useRef } from "react";

export function ProgressBar({
  value = 0,
  color = "#06b6d4",
  height = 6,
  striped = false,
  glow = true,
  label,
  labelRight,
  bg,
  style,
}) {
  const pct = Math.min(100, Math.max(0, value));
  const trackBg = bg || "rgba(255,255,255,0.06)";

  return (
    <div style={{ width: "100%", ...style }}>
      {(label || labelRight) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "inherit",
                opacity: 0.65,
              }}
            >
              {label}
            </span>
          )}
          {labelRight && (
            <span style={{ fontSize: 11, fontWeight: 700, color }}>
              {labelRight}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          height,
          borderRadius: height,
          background: trackBg,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className={striped ? "pb-striped" : "pb-fill"}
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: height,
            background: striped
              ? `repeating-linear-gradient(45deg,${color},${color} 6px,${color}bb 6px,${color}bb 12px)`
              : `linear-gradient(90deg,${color}bb,${color})`,
            boxShadow: glow ? `0 0 ${height * 3}px ${color}66` : "none",
            transition: "width 0.9s cubic-bezier(0.34,1.56,0.64,1)",
            position: "relative",
          }}
        >
          <div
            className="pb-shimmer"
            style={{ position: "absolute", inset: 0, borderRadius: height }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * CircleProgress (formerly RingProgress)
 */
export function CircleProgress({
  value = 0,
  size = 44,
  color = "#06b6d4",
  bg = "rgba(255,255,255,0.06)",
  strokeWidth = 4,
  children,
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={bg}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 0.9s cubic-bezier(0.34,1.56,0.64,1)",
            filter: `drop-shadow(0 0 3px ${color}88)`,
          }}
        />
      </svg>
      {children && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Alias for backwards compatibility if needed
export const RingProgress = CircleProgress;

/**
 * MiniStat — Small card-like stat for Dashboard
 */
export function MiniStat({ label, value, color = "#06b6d4", icon }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        padding: "12px 16px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.05)",
        minWidth: 120,
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 4,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: color,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {icon} {value}
      </div>
    </div>
  );
}

/**
 * DualBar — two-colored split bar
 */
export function DualBar({
  aVal = 0,
  bVal = 0,
  height = 12,
  aLabel = "Sumaiya",
  bLabel = "Rakib",
  style,
}) {
  const total = aVal + bVal || 1;
  const aPct = (aVal / total) * 100;
  const bPct = (bVal / total) * 100;

  return (
    <div style={{ width: "100%", ...style }}>
      <div
        style={{
          height,
          borderRadius: height,
          overflow: "hidden",
          display: "flex",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="pb-fill"
          style={{
            width: `${aPct}%`,
            height: "100%",
            background: "linear-gradient(90deg,#ec489999,#ec4899)",
            boxShadow: "0 0 12px #ec489966",
            transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
            borderRadius: `${height}px 0 0 ${height}px`,
            position: "relative",
          }}
        >
          <div
            className="pb-shimmer"
            style={{ position: "absolute", inset: 0, borderRadius: "inherit" }}
          />
        </div>
        <div
          className="pb-fill"
          style={{
            width: `${bPct}%`,
            height: "100%",
            background: "linear-gradient(90deg,#3b82f699,#3b82f6)",
            boxShadow: "0 0 12px #3b82f666",
            transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
            borderRadius: `0 ${height}px ${height}px 0`,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "#ec4899",
            }}
          />
          <span style={{ color: "#ec4899", fontWeight: 700 }}>{aLabel}</span>
          <span style={{ color: "rgba(150,170,200,0.6)" }}>
            {Math.round(aPct)}%
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <span style={{ color: "rgba(150,170,200,0.6)" }}>
            {Math.round(bPct)}%
          </span>
          <span style={{ color: "#3b82f6", fontWeight: 700 }}>{bLabel}</span>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "#3b82f6",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function StackedBar({ segments = [], height = 8, style }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div style={{ width: "100%", ...style }}>
      <div
        style={{
          height,
          borderRadius: height,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          return (
            <div
              key={i}
              className="pb-fill"
              style={{
                width: `${pct}%`,
                height: "100%",
                background: `linear-gradient(90deg,${seg.color}bb,${seg.color})`,
                boxShadow: `0 0 ${height * 3}px ${seg.color}55`,
                transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                borderRadius:
                  i === 0
                    ? `${height}px 0 0 ${height}px`
                    : i === segments.length - 1
                    ? `0 ${height}px ${height}px 0`
                    : 0,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: seg.color,
              }}
            />
            <span style={{ color: seg.color, fontWeight: 700 }}>
              {seg.label}
            </span>
            <span style={{ color: "rgba(180,200,220,0.6)" }}>
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
