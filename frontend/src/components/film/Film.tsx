"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Dashboard } from "../dashboard/Dashboard";
import { FilmMode } from "../dashboard/motion";
import { FINDINGS } from "@/lib/dashboard-data";

gsap.registerPlugin(useGSAP);

/**
 * Product film: one continuous camera move through the product, no titles.
 * World = three app windows side by side under one app nav (Dashboard → Agents → AI Assistant).
 * Agents and Assistant screens are built for the film from the design system; the dashboard is
 * the real component. ?record=1 pauses the timeline and exposes window.__tl for frame export.
 */
const SW = 1920;
const SH = 1080;
const WIN = 1440; // window width
const GAP = 240;
const AX = WIN + GAP; // agents window x
const SX = AX + WIN + GAP; // assistant window x
const PH = 860; // agents / assistant window height (fits the frame at 1.2x)
const lead = FINDINGS[0];

/* ---------- glyphs for agent badges ---------- */
const G = {
  report: <polyline points="3,15 8,10 12,12 17,6 21,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  diag: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 5 5" />
    </g>
  ),
  night: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  chat: <path d="M4 6.5a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16h0a2.5 2.5 0 0 1-2-2.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
};
function Badge({ g, size = 44, tone = "indigo" }: { g: keyof typeof G; size?: number; tone?: "indigo" | "gold" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[30%] ${tone === "indigo" ? "bg-indigo text-raised" : "bg-butter text-gold-text"} shadow-[0_8px_20px_-8px_rgb(43_46_112/0.6)]`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true">
        {G[g]}
      </svg>
    </span>
  );
}

/* ---------- shared app frame ---------- */
function AppWindow({ active, children, className = "", style }: { active: number; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`absolute top-0 overflow-hidden rounded-[28px] bg-[#f5f6f8] shadow-[0_0_0_1px_rgb(255_255_255/0.7),0_60px_140px_-50px_rgb(43_46_112/0.45)] ${className}`} style={{ width: WIN, ...style }}>
      <div className="flex h-14 items-center gap-4 border-b border-line bg-raised px-6">
        <span className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-caption font-medium">
          <span className="size-2 rounded-full bg-mint-text" />
          SMS Lucknow
        </span>
        <div className="mx-auto flex gap-1 rounded-full bg-surface p-1">
          {["Dashboard", "Agents", "AI Assistant"].map((t, i) => (
            <span key={t} className={`rounded-full px-4 py-1.5 text-caption font-medium ${i === active ? "bg-ink text-raised" : "text-ink/60"}`}>
              {t}
            </span>
          ))}
        </div>
        <span className="text-caption text-ink-muted">Example data</span>
      </div>
      {children}
    </div>
  );
}

/* ---------- Agents screen ---------- */
const REPORT_ROWS = [
  { check: "Trend", level: "Campaign", result: "CPC ₹16.63 → ₹31.07 · Campaign A", sev: "watch" },
  { check: "Threshold", level: "Campaign", result: "Search budget lost IS 86.7%", sev: "attention" },
  { check: "Comparison", level: "Campaign", result: "MBA Ads 2026 CPA 62% above Campaign A", sev: "watch" },
  { check: "State change", level: "Campaign", result: "Campaign A → LIMITED · Budget limited", sev: "attention" },
  { check: "Concentration", level: "Account", result: "83.3% of spend in one campaign", sev: null },
];
const DIAG_ROWS = [
  { lever: "Budget & Bidding", result: "Budget runs out daily · CPC up 87%", sev: "attention" },
  { lever: "Targeting", result: "No findings", sev: null },
  { lever: "Creative", result: "No findings", sev: null },
  { lever: "Measurement", result: "Duplicate PRIMARY lead actions", sev: "attention" },
];
const NIGHT_STEPS = [
  ["Monitoring", "Account reviewed across levels"],
  ["Development surfaced", "via Reporting Agent"],
  ["Investigation coordinated", "via Diagnosis Agent"],
  ["Update prepared", "Sent to WhatsApp"],
];
const WA_TEXT =
  "SMS Lucknow · 31 Aug – 7 Sep\n2 issues need attention.\n\n1. Campaign A is missing 86.7% of eligible searches because the budget runs out.\n2. Two PRIMARY actions track the same lead form.\n\nEvidence is on your dashboard.";

function Sev({ s }: { s: string | null }) {
  if (!s) return <span className="text-caption text-ink-muted">Noted</span>;
  return <span className={`badge ${s === "attention" ? "badge-attention" : "badge-watch"}`}>{s === "attention" ? "Attention" : "Watch"}</span>;
}

function AgentsScreen() {
  const agents = [
    { g: "report" as const, name: "Reporting Agent", role: "Sees what is moving" },
    { g: "diag" as const, name: "Diagnosis Agent", role: "Finds out why it moved" },
    { g: "night" as const, name: "Night Agent", role: "Updates you on WhatsApp" },
  ];
  return (
    <AppWindow active={1} style={{ left: AX, height: PH }} className="f-win-agents">
      <div className="grid h-[calc(100%-56px)] grid-cols-[360px_1fr]">
        {/* rail */}
        <aside className="relative border-r border-line bg-raised/60 p-6">
          <p className="px-2 text-caption font-medium text-ink-muted">Agents</p>
          <span className="f-rail-hl absolute left-4 right-4 top-[56px] h-[88px] rounded-2xl bg-raised shadow-[0_0_0_1px_var(--color-line),0_12px_30px_-18px_rgb(43_46_112/0.4)]" />
          <div className="relative mt-3 flex flex-col gap-2">
            {agents.map((a, i) => (
              <div key={a.name} className="flex h-[88px] items-center gap-4 rounded-2xl px-4">
                <Badge g={a.g} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-small font-medium">{a.name}</p>
                  <p className="text-caption text-ink-muted">{a.role}</p>
                </div>
                <span className="grid text-caption [&>*]:col-start-1 [&>*]:row-start-1">
                  <span className={`f-st-q${i} rounded-full bg-surface px-2 py-0.5 text-ink-muted`}>Queued</span>
                  <span className={`f-st-r${i} flex items-center gap-1 rounded-full bg-indigo/10 px-2 py-0.5 text-indigo-deep`}>
                    <span className="size-1.5 rounded-full bg-indigo" />
                    Running
                  </span>
                  <span className={`f-st-d${i} rounded-full bg-mint px-2 py-0.5 text-mint-text`}>{i === 2 ? "Sent" : "Done"}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-surface p-4 text-caption text-ink-muted">
            Agents hand work to each other. Findings land on the dashboard with their evidence.
          </div>
        </aside>

        {/* views */}
        <div className="relative">
          {/* Reporting */}
          <section className="f-view f-view-0 absolute inset-0 p-10">
            <div className="flex items-center gap-4">
              <Badge g="report" size={52} />
              <div>
                <p className="text-h3 font-medium">Reporting Agent</p>
                <p className="text-small text-ink-muted">Trends, thresholds, comparisons, state changes and concentration · 31 Aug – 7 Sep 2026</p>
              </div>
            </div>
            <div className="f-report dcard mt-8 p-8">
              <div className="grid grid-cols-[180px_120px_1fr_120px] gap-4 pb-3 text-caption text-ink-muted">
                <span>Check</span>
                <span>Level</span>
                <span>Result</span>
                <span className="text-right">Severity</span>
              </div>
              {REPORT_ROWS.map((r, i) => (
                <div key={r.check} className="grid grid-cols-[180px_120px_1fr_120px] items-center gap-4 border-t border-line py-4 text-small">
                  <span className="font-medium">{r.check}</span>
                  <span className="text-ink-muted">{r.level}</span>
                  <span className="grid [&>*]:col-start-1 [&>*]:row-start-1">
                    <span className={`f-rw${i} flex items-center gap-2 text-ink-muted`}>
                      <span className="f-pulse size-1.5 rounded-full bg-indigo" /> Checking…
                    </span>
                    <span className={`f-rd${i} font-medium`}>{r.result}</span>
                  </span>
                  <span className={`f-rs${i} text-right`}>
                    <Sev s={r.sev} />
                  </span>
                </div>
              ))}
            </div>
            <div className="f-handoff mt-6 flex items-center gap-3 text-small">
              <span className="h-px w-16 bg-gradient-to-r from-indigo/50 to-gold/70" />
              <span className="text-ink-muted">4 developments handed to</span>
              <span className="font-medium">Diagnosis Agent</span>
            </div>
          </section>

          {/* Diagnosis */}
          <section className="f-view f-view-1 absolute inset-0 p-10">
            <div className="flex items-center gap-4">
              <Badge g="diag" size={52} />
              <div>
                <p className="text-h3 font-medium">Diagnosis Agent</p>
                <p className="text-small text-ink-muted">Investigating {lead.entity} · structured checks across levers</p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-[1.15fr_1fr] gap-6">
              <div className="dcard p-8">
                {DIAG_ROWS.map((r, i) => (
                  <div key={r.lever} className="border-t border-line py-4 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between text-small">
                      <span className="font-medium">{r.lever}</span>
                      <span className={`f-ds${i}`}>
                        <Sev s={r.sev} />
                      </span>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
                      <span className={`f-dbar${i} block h-full origin-left rounded-full ${r.sev ? "bg-gold" : "bg-indigo/40"}`} />
                    </div>
                    <p className={`f-dr${i} mt-2 text-small ${r.sev ? "" : "text-ink-muted"}`}>{r.result}</p>
                  </div>
                ))}
              </div>
              <div className="f-cause dcard dcard-lead flex flex-col p-8">
                <span className="badge badge-attention self-start">Likely cause</span>
                <p className="mt-6 text-[28px] leading-tight tracking-tight">The daily budget runs out, so {lead.entity} misses 86.7% of eligible searches.</p>
                <div className="mt-6 text-small">
                  {lead.evidence.map((e, i) => (
                    <div key={i} className="flex justify-between border-t border-ink/10 py-2">
                      <span className="text-ink-muted">{e.metric}</span>
                      <span className="font-medium">{e.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-auto pt-6 text-small">
                  <span className="text-ink-muted">Recommended · </span>
                  <span className="font-medium">{lead.action}</span>
                </p>
              </div>
            </div>
          </section>

          {/* Night */}
          <section className="f-view f-view-2 absolute inset-0 p-10">
            <div className="flex items-center gap-4">
              <Badge g="night" size={52} />
              <div>
                <p className="text-h3 font-medium">Night Agent</p>
                <p className="text-small text-ink-muted">Keeps watch on a schedule · updates go to WhatsApp</p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-[1fr_440px] gap-10">
              <div className="dcard p-8">
                {NIGHT_STEPS.map(([t, d], i) => (
                  <div key={t} className="relative flex gap-4 pb-8 last:pb-0">
                    {i < NIGHT_STEPS.length - 1 && <span className={`f-nline${i} absolute left-[13px] top-8 h-[calc(100%-24px)] w-px origin-top bg-gradient-to-b from-indigo/50 to-gold/60`} />}
                    <span className={`f-ndot${i} grid size-7 shrink-0 place-items-center rounded-full bg-indigo text-raised`}>
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3.5 8.5 3 3 6-7" />
                      </svg>
                    </span>
                    <div className={`f-ntext${i}`}>
                      <p className="text-small font-medium">{t}</p>
                      <p className="text-caption text-ink-muted">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* WhatsApp-style chat */}
              <div className="f-phone overflow-hidden rounded-[36px] bg-[#efeae2] shadow-[0_0_0_10px_#23242e,0_40px_80px_-30px_rgb(43_46_112/0.6)]">
                <div className="flex items-center gap-3 bg-[#f0f2f5] px-5 py-4">
                  <Badge g="night" size={36} />
                  <div>
                    <p className="text-small font-medium">Night Agent</p>
                    <p className="text-caption text-ink-muted">DigitalMantra · WhatsApp</p>
                  </div>
                </div>
                <div className="h-[420px] p-5">
                  <div className="f-wa relative max-w-[340px] whitespace-pre-line rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-snug shadow-sm">
                    <span className="f-wa-text" />
                    <span className="f-wa-tick mt-1 block text-right text-[11px] text-[#53bdeb]">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppWindow>
  );
}

/* ---------- AI Assistant screen ---------- */
const QUESTION = "Why is Campaign A losing searches, and what should I check first?";
const ANSWER = [
  "Campaign A is limited by budget. It lost 86.7% of eligible searches because the daily budget runs out, and its CPC rose from ₹16.63 to ₹31.07 week over week.",
  "First, check whether the daily budget was cut, then raise it.",
  "Before moving budget to MBA Ads 2026, note that its CPA is 62% higher (₹197.47 vs ₹121.65).",
];
function AssistantScreen() {
  return (
    <AppWindow active={2} style={{ left: SX, height: PH }} className="f-win-assist">
      <div className="grid h-[calc(100%-56px)] grid-cols-[400px_1fr]">
        <aside className="border-r border-line bg-raised/60 p-8">
          <p className="text-caption font-medium text-ink-muted">Context attached</p>
          <div className="f-ctx mt-4 rounded-2xl bg-raised p-5 shadow-[0_0_0_1px_var(--color-line)]">
            <div className="flex items-center gap-2">
              <span className="badge badge-attention">Attention</span>
              <span className="text-caption text-ink-muted">Budget &amp; Bidding</span>
            </div>
            <p className="mt-3 text-small font-medium">{lead.entity}</p>
            <p className="mt-1 text-caption text-ink-muted">{lead.summary}</p>
            {lead.evidence.map((e, i) => (
              <div key={i} className="mt-2 flex justify-between border-t border-line pt-2 text-caption">
                <span className="text-ink-muted">{e.metric}</span>
                <span className="font-medium">{e.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-caption font-medium text-ink-muted">From the agents</p>
          <div className="mt-3 flex flex-col gap-2">
            {(["report", "diag", "night"] as const).map((g, i) => (
              <div key={g} className="flex items-center gap-3 rounded-xl bg-raised px-3 py-2 text-caption shadow-[0_0_0_1px_var(--color-line)]">
                <Badge g={g} size={28} />
                {["4 developments surfaced", "Likely cause identified", "Update sent on WhatsApp"][i]}
              </div>
            ))}
          </div>
        </aside>
        <div className="relative flex flex-col p-10">
          <div className="flex items-center gap-3">
            <Badge g="chat" size={44} />
            <div>
              <p className="text-small font-medium">AI Assistant</p>
              <p className="text-caption text-ink-muted">SMS Lucknow · 31 Aug – 7 Sep 2026</p>
            </div>
          </div>
          <div className="mt-8 flex flex-1 flex-col gap-6">
            <div className="f-qbubble ml-auto max-w-[70%] rounded-2xl rounded-br-md bg-indigo px-5 py-3 text-[17px] text-raised">{QUESTION}</div>
            <div className="f-think flex gap-1.5 self-start rounded-2xl bg-surface px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`f-tdot size-2 rounded-full bg-ink/40`} />
              ))}
            </div>
            <div className="f-answer max-w-[88%] rounded-2xl rounded-bl-md bg-raised p-6 text-[17px] leading-relaxed shadow-[0_0_0_1px_var(--color-line)]">
              {ANSWER.map((p, i) => (
                <p key={i} className={`f-ans${i} ${i ? "mt-3" : ""} ${i === 1 ? "font-medium" : ""}`} />
              ))}
              <div className="f-sources mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-caption">
                <span className="text-ink-muted">3 sources used</span>
                {["Findings", "Campaigns", "Daily trend"].map((s) => (
                  <span key={s} className="f-src rounded-full bg-surface px-3 py-1 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="f-follow flex gap-2">
              {["Show the CPC trend", "Compare with MBA Ads 2026", "Check conversion tracking"].map((s) => (
                <span key={s} className="rounded-full bg-raised px-4 py-2 text-caption shadow-[0_0_0_1px_var(--color-line)]">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-raised px-5 py-4 shadow-[0_0_0_1px_var(--color-line)]">
            <span className="f-input flex-1 text-[17px] text-ink" />
            <span className="f-caret h-5 w-px bg-indigo" />
            <span className="btn btn-primary btn-sm">Send</span>
          </div>
        </div>
      </div>
    </AppWindow>
  );
}

/* ---------- Film ---------- */
export function Film() {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const rec = new URLSearchParams(location.search).has("record");
    const fit = () => setScale(rec ? 1 : Math.min(innerWidth / SW, innerHeight / SH));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useGSAP(
    (_, contextSafe) => {
      const build = contextSafe!(() => {
        const root = stage.current!;
        const q = gsap.utils.selector(root);
        const world = q(".f-world")[0] as HTMLElement;
        gsap.set(world, { x: 0, y: 0, scale: 1 });
        const wr = world.getBoundingClientRect();
        const k = wr.width / world.offsetWidth; // preview stage scale
        const rect = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { x: (r.left - wr.left) / k, y: (r.top - wr.top) / k, w: r.width / k, h: r.height / k };
        };
        const dashWin = q(".f-win-dash")[0] as HTMLElement;
        const DH = dashWin.offsetHeight;
        const find = (sel: string) => rect(dashWin.querySelector(sel)!);

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
        const cam = (cx: number, cy: number, s: number, at: number, dur: number, ease = "power3.inOut") =>
          tl.to(world, { x: SW / 2 - cx * s, y: SH / 2 - cy * s, scale: s, duration: dur, ease }, at);
        const camSet = (cx: number, cy: number, s: number) => tl.set(world, { x: SW / 2 - cx * s, y: SH / 2 - cy * s, scale: s }, 0);
        const type = (el: Element, text: string, at: number, dur: number) => {
          el.textContent = "";
          const o = { n: 0 };
          tl.set(el, { textContent: "" }, 0); // empty again whenever the film restarts
          tl.fromTo(o, { n: 0 }, { n: text.length, duration: dur, ease: "none", immediateRender: false, onUpdate: () => (el.textContent = text.slice(0, Math.round(o.n))) }, at);
        };
        const ring = q(".f-ring")[0];
        const pin = q(".f-pin")[0];
        const pinText = q(".f-pin-text")[0];
        const callout = (r: { x: number; y: number; w: number; h: number }, text: string, at: number, side: "right" | "left" | "top" = "right") => {
          const pad = 12;
          tl.set(pinText, { textContent: text }, at);
          tl.fromTo(ring, { left: r.x - pad, top: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2, autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out" }, at);
          // "top" pins sit on the ring's top edge, right-aligned, clear of section titles
          const px = side === "right" ? r.x + r.w + 28 : side === "left" ? r.x - 28 : r.x + r.w - 8;
          const py = side === "top" ? r.y - pad - 24 : r.y + 8;
          tl.fromTo(
            pin,
            { left: px, top: py, xPercent: side === "right" ? 0 : -100, autoAlpha: 0, x: side === "right" ? -16 : 16 },
            { autoAlpha: 1, x: 0, duration: 0.55, ease: "power3.out" },
            at + 0.15,
          );
        };
        const calloutOut = (at: number) => tl.to([ring, pin], { autoAlpha: 0, duration: 0.35, ease: "power2.in" }, at);

        // ---------- initial states ----------
        tl.set([ring, pin, q(".f-badge-fly")], { autoAlpha: 0 }, 0);
        tl.set(q(".f-view"), { autoAlpha: 0 }, 0);
        tl.set(q(".f-view-0"), { autoAlpha: 1 }, 0);
        q(".f-wa-text").forEach((e) => (e.textContent = ""));

        // ambient
        tl.fromTo(q(".f-blob-a"), { x: -100, y: -40 }, { x: 180, y: 90, duration: 52, ease: "sine.inOut" }, 0);
        tl.fromTo(q(".f-blob-b"), { x: 120, y: 60 }, { x: -220, y: -40, duration: 52, ease: "sine.inOut" }, 0);
        tl.fromTo(q(".f-blob-c"), { x: 0, y: 0 }, { x: 260, y: -120, duration: 52, ease: "sine.inOut" }, 0);

        // ===== 1 · the whole dashboard, then dive in =====
        const s0 = 960 / DH;
        camSet(WIN / 2, DH / 2, s0);
        tl.fromTo(dashWin, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" }, 0);
        tl.fromTo(q(".f-win-agents, .f-win-assist"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.5);
        const S = 1.22; // reading zoom on the dashboard
        const top = (y: number, h: number) => y + h / 2; // centre of a region
        cam(WIN / 2, SH / 2 / S + 4, S, 1.6, 1.8);

        // overview: lead finding
        const ov = find("#overview");
        const leadR = find(".dcard-lead");
        cam(WIN / 2, top(ov.y, Math.min(ov.h, 820)) + 20, S, 3.5, 1.0);
        callout(leadR, "Highest-priority finding, with its evidence", 4.2, "top");
        calloutOut(6.1);

        // levers
        const lev = find("#levers");
        cam(WIN / 2, top(lev.y, lev.h) + 40, S, 6.2, 1.2);
        callout(find("#levers .dcard"), "Filter findings by lever", 7.2, "top");
        calloutOut(8.7);

        // performance: trend chart
        const perf = find("#performance");
        cam(WIN / 2, top(perf.y, perf.h), S, 8.8, 1.2);
        const chartR = rect(dashWin.querySelectorAll("#performance .dcard")[1]);
        callout(chartR, "Daily trend by metric and campaign", 9.8, "top");
        calloutOut(11.3);

        // campaigns: Campaign A row
        const camp = find("#campaigns");
        cam(WIN / 2, top(camp.y, Math.min(camp.h, 700)), S, 11.4, 1.2);
        callout(find("#campaigns tbody tr"), "Open a campaign for its full record and ad groups", 12.4, "top");
        calloutOut(13.9);

        // tracking
        const trk = find("#tracking");
        cam(WIN / 2, top(trk.y, trk.h), S, 14.0, 1.2);
        callout(rect(dashWin.querySelectorAll("#tracking .dcard")[0]), "Duplicate PRIMARY actions flagged", 15.0, "right");
        calloutOut(16.5);

        // ===== 2 · into the agents (badge carries the move) =====
        const fly = q(".f-badge-fly")[0];
        cam(AX / 2 + WIN / 2, 700, 0.42, 16.6, 1.3);
        tl.fromTo(fly, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 16.9);
        tl.set(q(".f-fly-g"), { autoAlpha: 0 }, 0);
        tl.set(q(".f-fly-g0"), { autoAlpha: 1 }, 16.9);
        cam(AX + WIN / 2, PH / 2, 1.2, 17.9, 1.3);
        tl.to(fly, { autoAlpha: 0, scale: 0.6, duration: 0.4, ease: "power2.in" }, 18.6);

        // rail statuses
        const st = (i: number, from: "q" | "r", to: "r" | "d", at: number) => {
          tl.to(q(`.f-st-${from}${i}`), { autoAlpha: 0, duration: 0.2 }, at);
          tl.fromTo(q(`.f-st-${to}${i}`), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, at);
        };
        [0, 1, 2].forEach((i) => tl.set([q(`.f-st-r${i}`), q(`.f-st-d${i}`)], { autoAlpha: 0 }, 0));
        st(0, "q", "r", 19.0);

        // Reporting: rows resolve
        REPORT_ROWS.forEach((_, i) => {
          tl.set([q(`.f-rd${i}`), q(`.f-rs${i}`)], { autoAlpha: 0 }, 0);
          const at = 19.4 + i * 0.6;
          tl.to(q(`.f-rw${i}`), { autoAlpha: 0, duration: 0.2 }, at);
          tl.fromTo(q(`.f-rd${i}`), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power3.out" }, at);
          tl.fromTo(q(`.f-rs${i}`), { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, at + 0.15);
        });
        tl.to(q(".f-pulse"), { opacity: 0.2, duration: 0.4, repeat: 7, yoyo: true, ease: "sine.inOut" }, 19.0);
        tl.fromTo(q(".f-handoff"), { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.5 }, 22.6);
        st(0, "r", "d", 22.8);
        callout(rect(q(".f-report")[0]), "Five checks across the account", 20.0, "top");
        calloutOut(23.0);

        // → Diagnosis
        tl.to(q(".f-rail-hl"), { y: 96, duration: 0.6 }, 23.3);
        tl.to(q(".f-view-0"), { autoAlpha: 0, x: -30, duration: 0.35, ease: "power2.in" }, 23.3);
        tl.fromTo(q(".f-view-1"), { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, 23.55);
        st(1, "q", "r", 23.4);
        DIAG_ROWS.forEach((_, i) => {
          const at = 24.0 + i * 0.75;
          tl.set([q(`.f-ds${i}`), q(`.f-dr${i}`)], { autoAlpha: 0 }, 0);
          tl.fromTo(q(`.f-dbar${i}`), { scaleX: 0 }, { scaleX: 1, duration: 0.65, ease: "power2.inOut" }, at);
          tl.fromTo(q(`.f-dr${i}`), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3 }, at + 0.55);
          tl.fromTo(q(`.f-ds${i}`), { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, at + 0.6);
        });
        tl.set(q(".f-cause"), { autoAlpha: 0 }, 0);
        tl.fromTo(q(".f-cause"), { autoAlpha: 0, y: 40, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power3.out" }, 27.1);
        st(1, "r", "d", 27.4);
        callout(rect(q(".f-cause")[0]), "Likely cause, backed by evidence", 27.6, "top");
        calloutOut(29.4);

        // → Night
        tl.to(q(".f-rail-hl"), { y: 192, duration: 0.6 }, 29.6);
        tl.to(q(".f-view-1"), { autoAlpha: 0, x: -30, duration: 0.35, ease: "power2.in" }, 29.6);
        tl.fromTo(q(".f-view-2"), { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, 29.85);
        st(2, "q", "r", 29.7);
        NIGHT_STEPS.forEach((_, i) => {
          const at = 30.3 + i * 0.55;
          tl.set([q(`.f-ndot${i}`), q(`.f-ntext${i}`)], { autoAlpha: 0 }, 0);
          tl.fromTo(q(`.f-ndot${i}`), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, at);
          tl.fromTo(q(`.f-ntext${i}`), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.35 }, at + 0.1);
          if (i < NIGHT_STEPS.length - 1) tl.fromTo(q(`.f-nline${i}`), { scaleY: 0 }, { scaleY: 1, duration: 0.45 }, at + 0.2);
        });
        tl.set(q(".f-wa"), { autoAlpha: 0 }, 0);
        tl.set(q(".f-wa-tick"), { autoAlpha: 0 }, 0);
        tl.fromTo(q(".f-wa"), { autoAlpha: 0, y: 20, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" }, 32.3);
        type(q(".f-wa-text")[0], WA_TEXT, 32.4, 2.6);
        tl.fromTo(q(".f-wa-tick"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 35.0);
        st(2, "r", "d", 35.0);
        callout(rect(q(".f-phone")[0]), "Updates arrive on WhatsApp", 33.0, "left");
        calloutOut(35.9);

        // ===== 3 · into the AI Assistant =====
        cam((AX + WIN / 2 + SX + WIN / 2) / 2, PH / 2, 0.55, 36.0, 1.1);
        tl.set(q(".f-fly-g"), { autoAlpha: 0 }, 36.3);
        tl.set(q(".f-fly-g1"), { autoAlpha: 1 }, 36.3);
        tl.fromTo(fly, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, 36.3);
        cam(SX + WIN / 2, PH / 2, 1.2, 37.1, 1.1);
        tl.to(fly, { autoAlpha: 0, scale: 0.6, duration: 0.35, ease: "power2.in" }, 37.6);

        ["f-qbubble", "f-think", "f-answer", "f-follow"].forEach((c) => tl.set(q(`.${c}`), { autoAlpha: 0 }, 0));
        tl.set(q(".f-src"), { autoAlpha: 0 }, 0);
        tl.set(q(".f-sources"), { autoAlpha: 0 }, 0);
        tl.to(q(".f-caret"), { opacity: 0, duration: 0.4, repeat: 5, yoyo: true, ease: "steps(1)" }, 37.4);
        type(q(".f-input")[0], QUESTION, 38.1, 1.8);
        tl.set(q(".f-input"), { textContent: "" }, 40.15);
        tl.fromTo(q(".f-qbubble"), { autoAlpha: 0, y: 20, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" }, 40.15);
        tl.fromTo(q(".f-think"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 40.5);
        tl.to(q(".f-tdot"), { y: -5, duration: 0.25, repeat: 3, yoyo: true, stagger: 0.1, ease: "sine.inOut" }, 40.5);
        tl.to(q(".f-think"), { autoAlpha: 0, duration: 0.2 }, 41.5);
        tl.fromTo(q(".f-answer"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, 41.5);
        let at = 41.7;
        ANSWER.forEach((p, i) => {
          const d = p.length / 95;
          type(q(`.f-ans${i}`)[0], p, at, d);
          at += d + 0.15;
        });
        tl.fromTo(q(".f-sources"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at);
        tl.fromTo(q(".f-src"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.12, ease: "back.out(2)" }, at + 0.1);
        tl.fromTo(q(".f-follow"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at + 0.6);
        callout(rect(q(".f-answer")[0]), "Answers cite their sources", at + 0.3, "left");
        calloutOut(at + 2.0);

        // ===== 4 · pull back: one product =====
        const end = at + 2.2;
        cam((SX + WIN) / 2, 560, 0.385, end, 1.8);
        tl.fromTo(q(".f-link"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.2, ease: "power2.inOut" }, end + 1.2);
        tl.to({}, { duration: 1.6 }, end + 2.0);

        (window as unknown as { __tl: gsap.core.Timeline }).__tl = tl;
        if (!new URLSearchParams(location.search).has("record")) tl.repeat(-1).play();
        else tl.seek(0);
      });
      const id = setTimeout(build, 1200);
      return () => clearTimeout(id);
    },
    { scope: stage },
  );

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#edf1f7]">
      <div ref={stage} className="relative overflow-hidden" style={{ width: SW, height: SH, transform: `scale(${scale})`, flex: "none" }}>
        {/* ambient ground */}
        <div className="absolute inset-0 bg-[#edf1f7]" />
        <div className="f-blob-a absolute -left-72 -top-72 size-[1200px] rounded-full bg-[radial-gradient(closest-side,rgb(243_229_174/0.8),transparent)]" />
        <div className="f-blob-b absolute -right-72 top-20 size-[1300px] rounded-full bg-[radial-gradient(closest-side,rgb(185_207_240/0.95),transparent)]" />
        <div className="f-blob-c absolute bottom-[-500px] left-1/3 size-[1100px] rounded-full bg-[radial-gradient(closest-side,rgb(211_232_222/0.7),transparent)]" />

        {/* world: three windows, camera-driven */}
        <div className="f-world absolute left-0 top-0 origin-top-left" style={{ width: SX + WIN }}>
          <FilmMode.Provider value={true}>
            <AppWindow active={0} className="f-win-dash" style={{ left: 0 }}>
              <div className="pointer-events-none">
                <Dashboard />
              </div>
            </AppWindow>
          </FilmMode.Provider>
          <AgentsScreen />
          <AssistantScreen />

          {/* connectors between windows (final pull-back) */}
          {[WIN, AX + WIN].map((x) => (
            <span key={x} className="f-link absolute top-[430px] h-[2px] origin-left rounded-full bg-gradient-to-r from-indigo/60 via-gold/80 to-indigo/60" style={{ left: x + 24, width: GAP - 48 }} />
          ))}

          {/* callout: ring + tethered pin */}
          <span className="f-ring pointer-events-none absolute rounded-[30px] border-2 border-indigo/70 shadow-[0_0_0_6px_rgb(55_59_139/0.10),0_0_40px_rgb(55_59_139/0.18)]" />
          <span className="f-pin pointer-events-none absolute flex items-center gap-3 whitespace-nowrap rounded-full bg-ink py-2.5 pl-3 pr-5 text-[18px] font-medium text-raised shadow-[0_16px_40px_-12px_rgb(35_36_46/0.6)]">
            <span className="relative grid size-6 place-items-center">
              <span className="absolute inset-0 rounded-full bg-gold/40" />
              <span className="size-2.5 rounded-full bg-gold" />
            </span>
            <span className="f-pin-text" />
          </span>
        </div>

        {/* agent badge that carries the camera between screens */}
        <div className="f-badge-fly absolute left-1/2 top-1/2 -ml-12 -mt-12 grid size-24 place-items-center rounded-[30%] bg-indigo text-raised shadow-[0_30px_60px_-20px_rgb(43_46_112/0.7)]">
          <svg viewBox="0 0 24 24" className="f-fly-g f-fly-g0 absolute size-11">
            {G.report}
          </svg>
          <svg viewBox="0 0 24 24" className="f-fly-g f-fly-g1 absolute size-11">
            {G.chat}
          </svg>
        </div>

        {/* soft edge fade, as in the reference */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#edf1f7] to-transparent" />
      </div>
    </div>
  );
}
