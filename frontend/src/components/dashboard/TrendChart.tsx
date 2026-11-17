"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CAMPAIGNS, DAILY, DAILY_ACCOUNT_COST, DAILY_CLICKS, DAILY_IMPRESSIONS, DATES, inr } from "@/lib/dashboard-data";
import { AnimatedNumber, REDUCE, formatNum } from "./motion";

/**
 * Daily trend. Defaults to CPA (lead-generation account). Values are an ILLUSTRATIVE
 * allocation that reconciles to the supplied totals, never presented as Google Ads data.
 * Missing values stay gaps. Scales always start at zero; animation never alters them.
 */
type Metric = "cost" | "conversions" | "cpa" | "cpc" | "impressions" | "clicks";
const METRICS: { id: Metric; label: string; format: string }[] = [
  { id: "cost", label: "Cost", format: "inr" },
  { id: "conversions", label: "Conversions", format: "int" },
  { id: "cpa", label: "CPA", format: "inr2" },
  { id: "cpc", label: "CPC", format: "inr2" },
  { id: "impressions", label: "Impressions", format: "int" },
  { id: "clicks", label: "Clicks", format: "int" },
];
const ACCOUNT_ONLY: Metric[] = ["cpc", "impressions", "clicks"];

function series(metric: Metric, campaign: string): (number | null)[] {
  const all = campaign === "all";
  if (!all && ACCOUNT_ONLY.includes(metric)) return DATES.map(() => null); // not supplied per campaign
  const cost = all ? DAILY_ACCOUNT_COST : DAILY[campaign].cost;
  const conv = all ? DATES.map((_, i) => Object.values(DAILY).reduce((a, c) => a + c.conversions[i], 0)) : DAILY[campaign].conversions;
  switch (metric) {
    case "cost":
      return cost;
    case "conversions":
      return conv;
    case "cpa":
      return cost.map((c, i) => (conv[i] ? c / conv[i] : null)); // daily SUM(cost)/SUM(conversions)
    case "cpc":
      return cost.map((c, i) => c / DAILY_CLICKS[i]);
    case "impressions":
      return DAILY_IMPRESSIONS;
    case "clicks":
      return DAILY_CLICKS;
  }
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((n) => n >= v * 1.08) ?? v;
}
const axis = (m: Metric, v: number) => (["conversions", "impressions", "clicks"].includes(m) ? Math.round(v).toLocaleString("en-IN") : inr(v));

export function TrendChart() {
  const [metric, setMetric] = useState<Metric>("cpa");
  const [campaign, setCampaign] = useState("all");
  const [hover, setHover] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 640, h: 240 });
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const gid = useId();
  const w = size.w;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.max(240, Math.round(e.contentRect.height)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = METRICS.find((x) => x.id === metric)!;
  const data = series(metric, campaign);
  const vals = data.filter((v): v is number => v !== null);
  const H = size.h;
  const pad = { l: 56, r: 24, t: 16, b: 32 };
  const max = vals.length ? niceMax(Math.max(...vals)) : 1;
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (DATES.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  const segs: string[] = [];
  let cur = "";
  data.forEach((v, i) => {
    if (v === null) {
      if (cur) segs.push(cur);
      cur = "";
    } else cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) segs.push(cur);
  const area = segs.length === 1 && vals.length === data.length ? `${segs[0]}L${x(data.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z` : null;

  // Series change: line draws left to right, area and points fade in after it. Width/height
  // changes (resize) are not in the dependencies, so resizing never replays the draw.
  useGSAP(
    () => {
      if (window.matchMedia(REDUCE).matches || !svg.current) return;
      const tl = gsap.timeline();
      svg.current.querySelectorAll<SVGPathElement>("[data-line]").forEach((p) => {
        const len = p.getTotalLength();
        tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" }, 0);
      });
      tl.fromTo("[data-area]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power1.out" }, 0.3);
      tl.fromTo("[data-dot]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.04 }, 0.35);
      tl.fromTo("[data-grid]", { autoAlpha: 0.4 }, { autoAlpha: 1, duration: 0.4 }, 0);
    },
    { dependencies: [metric, campaign, vals.length > 0], scope: svg },
  );

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (DATES.length - 1));
    setHover(Math.max(0, Math.min(DATES.length - 1, i)));
  };

  const additive = metric === "cost" || metric === "conversions" || metric === "impressions" || metric === "clicks";
  const total = additive && vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  const hv = hover !== null ? data[hover] : null;
  const tip = hover !== null && hv !== null ? { left: x(hover), top: y(hv) } : null;

  return (
    <div data-reveal className="dcard flex min-w-0 flex-col p-6 sm:p-8 lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-small font-medium">Daily trend</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
            {DATES.length} dates
            <span className="badge badge-attention" title="Constructed to reconcile to supplied totals. Not Google Ads daily records.">
              Illustrative · not source data
            </span>
          </p>
        </div>
        <label className="sr-only" htmlFor={`${gid}-camp`}>
          Campaign
        </label>
        <select
          id={`${gid}-camp`}
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          className="dtab cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path d=%22m4 6 4 4 4-4%22 fill=%22none%22 stroke=%22%2323242e%22 stroke-width=%221.5%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
        >
          <option value="all">All campaigns</option>
          {CAMPAIGNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.campaign_name}
            </option>
          ))}
        </select>
      </div>

      <div role="group" aria-label="Metric" className="mt-6 flex flex-wrap gap-2">
        {METRICS.map((x) => (
          <button key={x.id} type="button" aria-pressed={metric === x.id} onClick={() => setMetric(x.id)} className="dtab h-8 px-3 text-caption">
            {x.label}
          </button>
        ))}
      </div>

      <p className="mt-6 flex h-10 items-baseline gap-2 text-[32px] leading-10" aria-live="polite">
        {hv !== null ? (
          <>
            <span className="num-light">
              <AnimatedNumber value={hv} format={m.format} />
            </span>
            <span className="text-small text-ink-muted">{DATES[hover!]}</span>
          </>
        ) : total !== null ? (
          <>
            <span className="num-light">
              <AnimatedNumber value={total} format={m.format} />
            </span>
            <span className="text-small text-ink-muted">period total</span>
          </>
        ) : (
          <span className="text-small text-ink-muted">{vals.length ? "Hover the chart for daily values" : ""}</span>
        )}
      </p>

      <div ref={box} className="relative mt-4 min-h-60 flex-1">
        {vals.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-surface/60 px-6 text-center text-small text-ink-muted">
            {m.label} by campaign was not supplied. Choose All campaigns.
          </div>
        ) : (
          <>
            <svg
              ref={svg}
              width={w}
              height={H}
              role="img"
              aria-label={`${m.label} by day, illustrative allocation`}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              className="absolute inset-0 block touch-none select-none"
            >
              <defs>
                <linearGradient id={`${gid}-a`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#373b8b" stopOpacity="0.16" />
                  <stop offset="1" stopColor="#373b8b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g data-grid>
                {[0, 0.25, 0.5, 0.75, 1].map((k) => (
                  <g key={k}>
                    <line x1={pad.l} x2={w - pad.r} y1={y(max * k)} y2={y(max * k)} stroke="rgb(35 36 46 / 0.07)" />
                    <text x={pad.l - 12} y={y(max * k) + 4} textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
                      {axis(metric, max * k)}
                    </text>
                  </g>
                ))}
              </g>
              {DATES.map((d, i) => (
                <text key={d} x={x(i)} y={H - 8} textAnchor="middle" className={`text-[11px] transition-colors ${hover === i ? "fill-ink" : "fill-ink-muted"}`}>
                  {d}
                </text>
              ))}
              {area && <path data-area d={area} fill={`url(#${gid}-a)`} />}
              {segs.map((d) => (
                <path key={d} data-line d={d} fill="none" stroke="#373b8b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgb(35 36 46 / 0.2)" strokeDasharray="3 3" />}
              {data.map((v, i) =>
                v === null ? (
                  <circle key={i} data-dot cx={x(i)} cy={H - pad.b} r="3" fill="none" stroke="rgb(35 36 46 / 0.3)" strokeDasharray="2 2" />
                ) : (
                  <circle
                    key={i}
                    data-dot
                    cx={x(i)}
                    cy={y(v)}
                    r={hover === i ? 5 : 3}
                    fill={hover === i ? "#d0ae3e" : "#fdfdfe"}
                    stroke="#373b8b"
                    strokeWidth="1.5"
                    style={{ transition: "r 200ms" }}
                  />
                ),
              )}
            </svg>
            {/* Tooltip fades and glides between points */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md bg-ink px-2 py-1 text-caption tabular-nums text-raised shadow-ui transition-[opacity,left,top] duration-200 ease-out"
              style={{ left: tip?.left ?? 0, top: tip?.top ?? 0, opacity: tip ? 1 : 0 }}
            >
              {hover !== null && hv !== null ? `${DATES[hover]} · ${formatNum(hv, m.format)}` : ""}
            </div>
          </>
        )}
      </div>
      <p className="mt-4 text-caption text-ink-muted">
        Constructed to reconcile to the supplied totals; not Google Ads daily records.
        {data.some((v) => v === null) && vals.length > 0 && " Hollow markers: no conversions that day, so no CPA."}
      </p>
    </div>
  );
}
