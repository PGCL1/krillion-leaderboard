"use client";

import { useState } from "react";
import { ordinal } from "@/lib/stats";

/** One game on the chart. `date` is the game's YYYY-MM-DD. */
export type ChartDay = {
  game: number;
  date: string;
  score: number | null;
  rank: number | null;
  field: number | null;
  avg: number;
};

const W = 720;
const H = 290;
const L = 56;
const R = 10;
const T = 14;
const B = 72;
const STRIP_H = 22;

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Average depth over time, upside down: the surface is at the top and a deeper (better) average sits lower.
 * Under it, one block per game on the same timeline: every dive gets a block (brighter = deeper), podium days in
 * the leaderboard's rank colours, missed days a thin line.
 */
export function DiveChart({ days }: { days: ChartDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = days.length;
  const avgs = days.map((d) => d.avg);
  const pad = 4;
  let lo = Math.floor((Math.min(...avgs) - pad) / 10) * 10;
  let hi = Math.ceil((Math.max(...avgs) + pad) / 10) * 10;
  if (hi - lo < 20) {
    lo -= 10;
    hi += 10;
  }
  lo = Math.max(0, lo);
  const step = hi - lo > 60 ? 20 : 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

  // Each game owns an equal slot; the line and its block sit at the slot's centre.
  const band = (W - L - R) / n;
  const x = (i: number) => L + (i + 0.5) * band;
  const y = (v: number) => T + ((v - lo) / (hi - lo)) * (H - T - B);
  const cw = Math.min(band, 28);
  // The last game is today (or later) until it's played: leave its slot empty rather than calling it missed.
  const pending = (i: number) => i === n - 1 && days[i].score === null;
  const stripY = H - B + 16;
  const deepest = Math.max(1, ...days.map((d) => d.score ?? 0));

  // Up to 6 evenly spaced date labels.
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const labels = days.map((d, i) => ({ i, d })).filter(({ i }) => i % labelEvery === 0 || i === n - 1);
  if (labels.length > 1 && labels.at(-1)!.i - labels.at(-2)!.i < labelEvery / 2) labels.splice(-2, 1);

  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.avg).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1)},${T}L${x(0)},${T}Z`;
  const last = days[n - 1];
  const h = hover === null ? null : days[hover];

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - L) / band))));
  }

  return (
    <div>
      <p className="kr-readout" aria-live="polite">
        {h ? (
          <>
            #{h.game} · {shortDate(h.date)} ·{" "}
            {h.score === null ? (
              hover === n - 1 ? "not played yet" : "missed"
            ) : (
              <>
                <b>{h.score}</b> deep ·{" "}
                <b className="kr-readout__rank" data-rank={h.rank}>
                  {ordinal(h.rank!)}
                </b>{" "}
                of {h.field}
              </>
            )}{" "}
            · avg <b>{h.avg.toFixed(1)}</b>
          </>
        ) : (
          " "
        )}
      </p>
      <svg className="kr-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="average depth over time, with each day's finish below">
        <defs>
          <linearGradient id="kr-chart-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="kr-chart__stop" stopOpacity="0" />
            <stop offset="1" className="kr-chart__stop" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="kr-chart__grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text x={L - 8} y={y(t) + 5} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <line className="kr-chart__surface" x1={L} x2={W - R} y1={T} y2={T} />

        <text x={L - 8} y={stripY + 16} textAnchor="end" className="kr-chart__small">
          finish
        </text>
        {labels.map(({ i, d }) => (
          <text key={d.game} x={x(i)} y={H - 8} textAnchor="middle">
            {shortDate(d.date)}
          </text>
        ))}
        {days.map((d, i) => {
          const cx = x(i) - cw / 2 + 0.5;
          const w = Math.max(1, cw - 1);
          if (pending(i)) return null;
          return d.score === null ? (
            <rect key={d.game} className="kr-cell kr-cell--miss" x={cx} y={stripY + STRIP_H / 2 - 1} width={w} height={2} />
          ) : (
            <rect
              key={d.game}
              className="kr-cell"
              data-rank={d.rank! <= 3 ? d.rank! : undefined}
              x={cx}
              y={stripY}
              width={w}
              height={STRIP_H}
              opacity={d.rank! <= 3 ? 1 : 0.35 + 0.65 * (d.score / deepest)}
            />
          );
        })}

        {n > 1 && <path className="kr-chart__area" d={area} />}
        {n > 1 && <path className="kr-chart__line" d={line} />}
        <rect className="kr-chart__now" x={x(n - 1) - 4} y={y(last.avg) - 4} width={8} height={8} />

        {h && hover !== null && (
          <g pointerEvents="none">
            <line className="kr-chart__cross" x1={x(hover)} x2={x(hover)} y1={T} y2={stripY + STRIP_H + 2} />
            <rect className="kr-chart__now" x={x(hover) - 4} y={y(h.avg) - 4} width={8} height={8} />
            <rect className="kr-chart__pick" x={x(hover) - cw / 2 - 1} y={stripY - 3} width={cw + 2} height={STRIP_H + 6} />
          </g>
        )}
        <rect
          x={L}
          y={0}
          width={W - L - R}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
    </div>
  );
}
