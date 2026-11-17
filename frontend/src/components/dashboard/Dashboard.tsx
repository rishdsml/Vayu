"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import {
  ACCOUNT,
  FINDINGS,
  LEVERS,
  LEVER_STATE_LABEL,
  TOTALS,
  DATA_CHECKS,
  inr,
  metrics,
  type Finding,
  type LeverId,
  type Severity,
} from "@/lib/dashboard-data";
import { TrendChart } from "./TrendChart";
import { Campaigns } from "./Campaigns";
import { ConversionHealth } from "./ConversionHealth";
import { useDashMotion, REDUCE, FilmMode } from "./motion";

gsap.registerPlugin(useGSAP, ScrollToPlugin);

/**
 * Google Ads intelligence dashboard. First screen answers, in order: does anything need
 * attention, where, and how much money is involved. Reading order below the fold:
 * findings → levers → performance → campaigns → conversion tracking.
 */
const TABS = [
  { id: "findings", label: "Findings" },
  { id: "levers", label: "Levers" },
  { id: "performance", label: "Performance" },
  { id: "campaigns", label: "Campaigns" },
  { id: "tracking", label: "Tracking" },
];
const SEV_LABEL: Record<Severity, string> = { attention: "Attention", watch: "Watch", stable: "Stable" };
const leverLabel = (id: LeverId) => LEVERS.find((l) => l.id === id)!.label;
const M = metrics(TOTALS.current);

export function Dashboard() {
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [lever, setLever] = useState<LeverId | null>(null);
  const [assistant, setAssistant] = useState<{ open: boolean; finding: Finding | null }>({ open: false, finding: null });
  const [active, setActive] = useState("overview");
  useDashMotion(root);
  const film = useContext(FilmMode);

  // Active tab follows the section in view
  useEffect(() => {
    const els = ["overview", ...TABS.map((t) => t.id)].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-35% 0px -60% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Filtering re-deals the visible findings with a quick stagger (immediate, no delay to use)
  useGSAP(
    () => {
      if (window.matchMedia(REDUCE).matches) return;
      gsap.fromTo("[data-finding]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out", clearProps: "transform" });
    },
    { dependencies: [lever], scope: grid, revertOnUpdate: false },
  );

  const shown = lever ? FINDINGS.filter((f) => f.lever === lever) : FINDINGS;
  const open = (finding: Finding | null) => setAssistant({ open: true, finding });
  const filterBy = (id: LeverId | null) => {
    setLever(id);
    if (id) scrollToId("findings");
  };

  return (
    <div ref={root} className="dash">
      {/* The nav pill belongs to the real dashboard; recordings for the film leave it out */}
      {!film && <TopBar active={active} onAssistant={() => open(null)} />}

      <main id="main" className="dash-wrap pb-section">
        <Overview onOpen={open} />

        {/* Findings: the complete set, filterable by lever */}
        <section id="findings" aria-labelledby="findings-title" className="scroll-mt-28 pt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead id="findings-title" title="All findings" sub={`${FINDINGS.length} from the Night Agent, most urgent first. Select a card to investigate it.`} />
            {lever && <FilterChip label={leverLabel(lever)} onClear={() => setLever(null)} />}
          </div>
          <div ref={grid} className="mt-6 grid gap-4 lg:grid-cols-3" aria-live="polite">
            {shown.map((f) => (
              <FindingCard key={f.id} f={f} index={FINDINGS.indexOf(f) + 1} onOpen={() => open(f)} />
            ))}
          </div>
        </section>

        <Levers lever={lever} onSelect={filterBy} />

        <section id="performance" aria-labelledby="performance-title" className="scroll-mt-28 pt-16">
          <SectionHead id="performance-title" title="Performance" sub={`${ACCOUNT.range.label} vs ${ACCOUNT.comparison.label}. Rates are total ÷ total.`} />
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <AccountSummary />
            <TrendChart />
          </div>
        </section>

        <section id="campaigns" aria-labelledby="campaigns-title" className="scroll-mt-28 pt-16">
          <SectionHead id="campaigns-title" title="Campaigns" sub="Aggregated period. Open a campaign for full metrics, then its ad groups." />
          <Campaigns />
        </section>

        <section id="tracking" aria-labelledby="tracking-title" className="scroll-mt-28 pt-16">
          <SectionHead id="tracking-title" title="Conversion tracking health" sub="Are the numbers above reliable?" />
          <ConversionHealth />
        </section>

        <DataNotes />
      </main>

      <AssistantDrawer state={assistant} onClose={() => setAssistant((s) => ({ ...s, open: false }))} />
    </div>
  );
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const header = document.querySelector<HTMLElement>("[data-dash-header]")?.offsetHeight ?? 72;
  const y = el.getBoundingClientRect().top + window.scrollY - header - 16;
  const d = window.matchMedia(REDUCE).matches ? 0 : gsap.utils.clamp(0.5, 1.1, Math.abs(y - window.scrollY) / 3000);
  gsap.to(window, { scrollTo: { y, autoKill: true }, duration: d, ease: "power3.inOut", overwrite: true });
}

/* ---------------- Top bar: segmented nav with a sliding active pill ---------------- */
function TopBar({ active, onAssistant }: { active: string; onAssistant: () => void }) {
  const nav = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const btn = nav.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
      if (!pill.current) return;
      if (!btn) return void gsap.to(pill.current, { autoAlpha: 0, duration: 0.2 });
      const d = window.matchMedia(REDUCE).matches ? 0 : 0.45;
      gsap.to(pill.current, { x: btn.offsetLeft, width: btn.offsetWidth, autoAlpha: 1, duration: d, ease: "power3.out" });
    },
    { dependencies: [active], scope: nav },
  );

  return (
    // The landing page's floating glass nav pill (.nav-bar), sized to the dashboard's content width
    <header data-dash-header className="sticky top-0 z-40 px-gutter pt-4">
      <div data-scrolled="true" className="nav-bar flex items-center gap-6" style={{ maxWidth: 1280 }}>
        <Link href="/" aria-label="DigitalMantra, home" className="shrink-0">
          <Image src="/digitalmantra-logo.webp" alt="DigitalMantra" width={968} height={258} priority className="h-8 w-auto" />
        </Link>
        <nav aria-label="Dashboard sections" className="mx-auto hidden lg:block">
          <div ref={nav} className="relative flex rounded-full bg-surface/70 p-1 shadow-[0_0_0_1px_var(--color-line)]">
            <span ref={pill} aria-hidden="true" className="absolute inset-y-1 left-0 rounded-full bg-ink opacity-0" />
            {TABS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                data-tab={t.id}
                aria-current={active === t.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(t.id);
                  history.replaceState(null, "", `#${t.id}`);
                }}
                className={`relative z-10 rounded-full px-4 py-2 text-small font-medium transition-colors duration-300 ${active === t.id ? "text-raised" : "text-ink/75 hover:text-ink"}`}
              >
                {t.label}
              </a>
            ))}
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <span className="badge hidden bg-surface/80 text-ink-muted xl:inline-flex">Prototype · example data</span>
          <button type="button" onClick={onAssistant} className="btn btn-primary btn-sm">
            <ChatIcon />
            AI Assistant
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------- First screen ---------------- */
function Overview({ onOpen }: { onOpen: (f: Finding) => void }) {
  const [lead, ...rest] = FINDINGS;
  const att = FINDINGS.filter((f) => f.severity === "attention").length;
  const watch = FINDINGS.filter((f) => f.severity === "watch").length;
  const where = [...new Set(FINDINGS.filter((f) => f.severity === "attention").map((f) => leverLabel(f.lever)))];
  const cpa = M.CPA!.toFixed(2).split(".");

  return (
    <section id="overview" aria-labelledby="account-title" className="pt-8">
      {/* 1 · Compact account header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 id="account-title" className="text-h3 font-medium">
          {ACCOUNT.name}
        </h1>
        <span className="badge badge-stable">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-mint-text" />
          Connected
        </span>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small">
          <Meta label="Customer ID" value={ACCOUNT.customer_id} />
          <Meta label="Last synced" value={ACCOUNT.last_synced} />
        </dl>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span className="dtab pointer-events-none h-9">
            <CalendarIcon />
            {ACCOUNT.range.label}
          </span>
          <span className="dtab pointer-events-none h-9 text-ink-muted">vs {ACCOUNT.comparison.label}</span>
          {ACCOUNT.range.days !== ACCOUNT.comparison.days && (
            <a href="#data-notes" className="badge badge-attention" title={DATA_CHECKS[0].body}>
              {ACCOUNT.range.days} vs {ACCOUNT.comparison.days} days · confirm window
            </a>
          )}
        </div>
      </div>

      {/* 2 · Account-health statement */}
      <p className="mt-8 max-w-headline text-balance text-[24px] leading-tight tracking-tight sm:text-[32px]">
        <span className="text-gold-text">Attention needed.</span>{" "}
        <span className="text-ink-muted">
          {att} issues need attention and {watch} to watch, in {where.join(" and ")}.
        </span>
      </p>

      {/* 3 + 4 · Highest-priority finding, then two compact ones */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <LeadFinding f={lead} onOpen={() => onOpen(lead)} />
        <div className="grid gap-4 lg:col-span-5">
          {rest.map((f) => (
            <CompactFinding key={f.id} f={f} index={FINDINGS.indexOf(f) + 1} onOpen={() => onOpen(f)} />
          ))}
        </div>
      </div>

      {/* 5 · CPA and supporting metrics */}
      <div data-reveal className="dcard mt-4 grid grid-cols-2 gap-6 p-6 sm:grid-cols-3 sm:p-8 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:items-end">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <p className="text-small text-ink-muted">Cost per lead (CPA)</p>
          <p className="mt-2 text-[56px] leading-none">
            <span className="num-light">
              ₹{cpa[0]}
              <span className="text-ink/30">.{cpa[1]}</span>
            </span>
          </p>
        </div>
        {[
          ["Cost", M.cost!, "inr", "Spend −51% vs previous · approx."],
          ["Conversions", M.conversions!, "int", null],
          ["Clicks", M.clicks!, "int", null],
          ["Impressions", M.impressions!, "int", null],
        ].map(([k, v, f, note]) => (
          <div key={k as string} className="lg:border-l lg:border-line lg:pl-6">
            <p className="text-caption text-ink-muted">{k}</p>
            <p className="num-light mt-2 text-[28px] leading-none" data-count={v as number} data-format={f as string}>
              {f === "inr" ? inr(v as number) : (v as number).toLocaleString("en-IN")}
            </p>
            {note && <p className="mt-2 text-caption text-ink-muted">{note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={value ? "font-medium" : "italic text-ink-muted/80"}>{value ?? "Not supplied"}</dd>
    </div>
  );
}

/** The highest-priority finding: problem, entity, evidence, action at a glance. */
function LeadFinding({ f, onOpen }: { f: Finding; onOpen: () => void }) {
  return (
    <article data-reveal className="dcard dcard-lead finding-card relative flex flex-col p-6 sm:p-8 lg:col-span-7">
      <div className="flex flex-wrap items-center gap-2">
        <SevBadge s={f.severity} />
        <span className="text-caption text-ink-muted">
          {leverLabel(f.lever)} · {f.entityType}
        </span>
        <span className="ml-auto text-caption text-ink-muted">Highest priority</span>
      </div>
      <h2 className="mt-6 text-h2">{f.entity}</h2>
      <p className="mt-2 max-w-prose text-lede text-ink/80">{f.summary}</p>
      <div className="mt-8 grid gap-8 sm:grid-cols-[1.3fr_1fr]">
        <EvidenceList items={f.evidence} tone="lead" />
        <MoneyBlock f={f} big />
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small">
          <span className="text-ink-muted">Recommended action · </span>
          <span className="font-medium">{f.action}</span>
        </p>
        <OpenButton onOpen={onOpen} entity={f.entity} primary />
      </div>
    </article>
  );
}

function CompactFinding({ f, index, onOpen }: { f: Finding; index: number; onOpen: () => void }) {
  const e = f.evidence[0];
  return (
    <article data-reveal className="dcard finding-card relative flex flex-col p-6">
      <div className="flex items-center gap-2">
        <SevBadge s={f.severity} />
        <span className="text-caption text-ink-muted">{leverLabel(f.lever)}</span>
        <span className="ml-auto text-caption tabular-nums text-ink-muted">0{index}</span>
      </div>
      <h3 className="mt-4 text-small font-medium">{f.entity}</h3>
      <p className="mt-1 text-small text-ink-muted">{f.summary}</p>
      <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 text-small">
        <span className="text-ink-muted">
          {e.metric} <span className="text-caption">· {e.context}</span>
        </span>
        <span className="font-medium tabular-nums">{e.value}</span>
      </p>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
        <p className="text-caption">
          <span className="text-ink-muted">Recommended · </span>
          {f.action}
        </p>
        <OpenButton onOpen={onOpen} entity={f.entity} compact />
      </div>
    </article>
  );
}

/** Full finding card (three-column grid). The whole card opens the assistant. */
function FindingCard({ f, index, onOpen }: { f: Finding; index: number; onOpen: () => void }) {
  return (
    <article data-finding className="dcard finding-card relative flex flex-col p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <SevBadge s={f.severity} />
        <span className="text-caption text-ink-muted">{leverLabel(f.lever)}</span>
        <span className="ml-auto text-caption tabular-nums text-ink-muted">0{index}</span>
      </div>
      <h3 className="mt-6 text-h3 font-medium">{f.entity}</h3>
      <p className="mt-2 text-small text-ink-muted">{f.summary}</p>
      <div className="mt-6">
        <EvidenceList items={f.evidence} />
      </div>
      <div className="mt-auto pt-8">
        <MoneyBlock f={f} />
        <p className="mt-6 text-small">
          <span className="text-ink-muted">Recommended · </span>
          {f.action}
        </p>
        <OpenButton onOpen={onOpen} entity={f.entity} wide />
      </div>
    </article>
  );
}

function EvidenceList({ items, tone }: { items: Finding["evidence"]; tone?: "lead" }) {
  const line = tone === "lead" ? "border-ink/10" : "border-line";
  return (
    <div>
      <p className="text-caption text-ink-muted">Evidence</p>
      <dl className="mt-2 text-small">
        {items.map((e, i) => (
          <div key={i} className={`grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-t py-2 ${line}`}>
            <dt>
              {e.metric}
              <span className="block text-caption text-ink-muted">{e.context}</span>
            </dt>
            <dd className="text-right font-medium tabular-nums">{e.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Spend (a fact) and money at stake (a calculation) are always shown apart. */
function MoneyBlock({ f, big }: { f: Finding; big?: boolean }) {
  return (
    <dl className={`grid gap-4 ${big ? "grid-cols-2 sm:grid-cols-1 sm:gap-6" : "grid-cols-2"}`}>
      <div>
        <dt className="text-caption text-ink-muted">Campaign spend · period</dt>
        <dd className={`num-light mt-1 leading-none ${big ? "text-[40px]" : "text-[28px]"} ${f.spend === null ? "text-ink/30" : ""}`}>
          {f.spend !== null ? inr(f.spend) : "—"}
        </dd>
        {f.spend === null && <dd className="mt-1 text-caption text-ink-muted">Not applicable</dd>}
      </div>
      <div>
        <dt className="text-caption text-ink-muted">Money at stake</dt>
        <dd className={`num-light mt-1 leading-none text-ink/30 ${big ? "text-[40px]" : "text-[28px]"}`}>{f.moneyAtStake !== null ? inr(f.moneyAtStake) : "—"}</dd>
        {f.moneyAtStake === null && <dd className="mt-1 text-caption text-ink-muted">Not calculated</dd>}
      </div>
    </dl>
  );
}

/** Stretched button: its ::after covers the card, so the whole card is one target. */
function OpenButton({ onOpen, entity, primary, compact, wide }: { onOpen: () => void; entity: string; primary?: boolean; compact?: boolean; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Investigate ${entity} in AI Assistant`}
      className={`btn btn-sm shrink-0 after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] ${primary ? "btn-primary" : "btn-secondary"} ${wide ? "mt-6 w-full" : ""} ${compact ? "size-10 !min-h-10 !px-0" : ""}`}
    >
      {!compact && "Investigate in AI Assistant"}
      <Arrow className="card-arrow size-4" />
    </button>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-ink py-1 pl-4 pr-1 text-small text-raised">
      Filtered by {label}
      <button type="button" onClick={onClear} className="rounded-full bg-raised/15 px-3 py-1 text-caption hover:bg-raised/25">
        Reset
      </button>
    </span>
  );
}

/* ---------------- Lever status ---------------- */
function Levers({ lever, onSelect }: { lever: LeverId | null; onSelect: (id: LeverId | null) => void }) {
  return (
    <section id="levers" aria-labelledby="levers-title" className="scroll-mt-28 pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead id="levers-title" title="Lever status" sub="Worst severity and number of findings. Select a lever to filter the findings." />
        {lever && <FilterChip label={leverLabel(lever)} onClear={() => onSelect(null)} />}
      </div>
      <div data-reveal className="dcard mt-6 grid grid-cols-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-5">
        {LEVERS.map((l) => {
          const fs = FINDINGS.filter((f) => f.lever === l.id);
          const worst: Severity | null = fs.some((f) => f.severity === "attention") ? "attention" : fs.length ? "watch" : null;
          const selected = lever === l.id;
          return (
            <button
              key={l.id}
              type="button"
              disabled={!fs.length}
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : l.id)}
              className={`lever-tile group flex flex-col items-start gap-6 p-6 text-left ${selected ? "is-active" : ""}`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-small font-medium">{l.label}</span>
                {fs.length > 0 && <Arrow className="size-4 text-ink-muted transition-transform duration-300 group-hover:translate-x-0.5" />}
              </span>
              <span className="flex w-full items-end justify-between gap-2">
                <span className={`num-light text-[48px] leading-none ${fs.length ? "" : "text-ink/25"}`}>{fs.length}</span>
                {worst ? <SevBadge s={worst} /> : <span className="text-right text-caption text-ink-muted">{LEVER_STATE_LABEL[l.state]}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-caption text-ink-muted">
        &ldquo;No findings reported&rdquo; means the Night Agent reported none. It does not confirm the lever is healthy. Levers can also be
        &ldquo;Not evaluated&rdquo; or &ldquo;Data unavailable&rdquo;.
      </p>
    </section>
  );
}

/* ---------------- Account summary ---------------- */
function AccountSummary() {
  const P = metrics(TOTALS.previous as Parameters<typeof metrics>[0]);
  const rows: { k: string; formula: string; cur: number | null; prev: number | null; f: "inr" | "inr2" | "int" | "pct"; approx?: boolean }[] = [
    { k: "CPA", formula: "SUM(cost) / SUM(conversions)", cur: M.CPA, prev: P.CPA, f: "inr2" },
    { k: "Cost", formula: "SUM(cost)", cur: M.cost, prev: P.cost, f: "inr", approx: true },
    { k: "Conversions", formula: "SUM(conversions)", cur: M.conversions, prev: P.conversions, f: "int" },
    { k: "Impressions", formula: "SUM(impressions)", cur: M.impressions, prev: P.impressions, f: "int" },
    { k: "Clicks", formula: "SUM(clicks)", cur: M.clicks, prev: P.clicks, f: "int" },
    { k: "CTR", formula: "SUM(clicks) / SUM(impressions)", cur: M.CTR && M.CTR * 100, prev: P.CTR && P.CTR * 100, f: "pct" },
    { k: "CPC", formula: "SUM(cost) / SUM(clicks)", cur: M.CPC, prev: P.CPC, f: "inr2" },
    { k: "CVR", formula: "SUM(conversions) / SUM(clicks)", cur: M.CVR && M.CVR * 100, prev: P.CVR && P.CVR * 100, f: "pct" },
  ];
  const fmt = (v: number, f: string) =>
    f === "inr" ? inr(v) : f === "inr2" ? inr(v, 2) : f === "pct" ? `${v.toFixed(1)}%` : v.toLocaleString("en-IN");
  return (
    <div data-reveal className="dcard min-w-0 p-6 sm:p-8 lg:col-span-5">
      <h3 className="text-small font-medium">Account summary</h3>
      <div className="relative -mx-6 overflow-x-auto px-6 sm:-mx-8 sm:px-8">
        <table className="dtable dtable-compact mt-6 min-w-[360px]">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" className="num">
                Current
              </th>
              <th scope="col" className="num">
                Previous
              </th>
              <th scope="col" className="num">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ch = r.cur !== null && r.prev !== null ? (r.cur - r.prev) / r.prev : null;
              return (
                <tr key={r.k} className="transition-colors hover:bg-surface/50">
                  <th scope="row" title={r.formula} className={i === 0 ? "font-medium !text-ink" : ""}>
                    {r.k}
                  </th>
                  <td className={`num ${i === 0 ? "font-medium text-indigo-deep" : ""}`} data-count={r.f === "pct" ? undefined : (r.cur ?? undefined)} data-format={r.f}>
                    {r.cur !== null ? fmt(r.cur, r.f) : "—"}
                  </td>
                  <td className="num text-ink-muted">{r.prev !== null ? `${r.approx ? "~" : ""}${fmt(r.prev, r.f)}` : "—"}</td>
                  <td className="num">
                    {ch !== null ? (
                      <span className="badge bg-surface text-ink">
                        {r.approx ? "≈ " : ""}
                        {ch > 0 ? "+" : "−"}
                        {Math.abs(ch * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <th scope="row" title="SUM(conversion_value) / SUM(cost)">
                ROAS
              </th>
              <td className="num text-ink-muted" colSpan={3}>
                {M.ROAS !== null ? M.ROAS.toFixed(2) : "Unavailable — conversion value not tracked."}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-caption text-ink-muted">
        Change only where both periods are supplied. Previous cost is approximate, and the periods differ in length (8 vs 7 days).
      </p>
    </div>
  );
}

/* ---------------- Data notes ---------------- */
function DataNotes() {
  return (
    <details id="data-notes" className="group mt-16 scroll-mt-28 border-t border-line pt-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-small font-medium [&::-webkit-details-marker]:hidden">
        <span>
          Data integrity <span className="font-normal text-ink-muted">· {DATA_CHECKS.length} items flagged, none corrected</span>
        </span>
        <span aria-hidden="true" className="text-ink-muted transition-transform duration-300 group-open:rotate-180">
          <Chevron />
        </span>
      </summary>
      <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {DATA_CHECKS.map((c) => (
          <div key={c.id}>
            <dt className="text-small font-medium">{c.title}</dt>
            <dd className="mt-1 text-small text-ink-muted">{c.body}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/* ---------------- AI Assistant: opens with the finding in the conversation ---------------- */
function AssistantDrawer({ state, onClose }: { state: { open: boolean; finding: Finding | null }; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const f = state.finding;

  useEffect(() => {
    if (!state.open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [state.open, onClose]);

  // Context messages settle in one after another when the panel opens
  useGSAP(
    () => {
      if (!state.open || window.matchMedia(REDUCE).matches) return;
      gsap.from("[data-msg]", { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.08, delay: 0.15, ease: "power3.out" });
    },
    { dependencies: [state.open, f?.id], scope: panel },
  );

  const question = f
    ? `Why is this happening on ${f.entity}, and what should I check first?`
    : `What needs my attention in ${ACCOUNT.name} for ${ACCOUNT.range.label}?`;

  return (
    <div aria-hidden={!state.open} className={`fixed inset-0 z-50 overflow-hidden ${state.open ? "" : "pointer-events-none"}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-ink/20 transition-opacity duration-300 ${state.open ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        tabIndex={-1}
        data-open={state.open}
        inert={!state.open}
        className="drawer absolute inset-y-2 right-2 flex w-[min(460px,calc(100vw-16px))] flex-col rounded-xl bg-raised shadow-ui outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="assistant-title" className="text-small font-medium">
              AI Assistant
            </h2>
            <p className="text-caption text-ink-muted">
              {ACCOUNT.name} · {ACCOUNT.range.label}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="grid size-10 place-items-center rounded-full transition-colors hover:bg-surface">
            <span aria-hidden="true" className="text-h3 leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          <p data-msg className="text-caption text-ink-muted">
            Context attached to this conversation
          </p>
          {f ? (
            <div data-msg className="rounded-lg bg-surface p-4">
              <div className="flex items-center gap-2">
                <SevBadge s={f.severity} />
                <span className="text-caption text-ink-muted">
                  {leverLabel(f.lever)} · {f.entityType}
                </span>
              </div>
              <p className="mt-2 text-small font-medium">{f.entity}</p>
              <p className="mt-1 text-caption text-ink-muted">{f.summary}</p>
              <dl className="mt-4 text-caption">
                {f.evidence.map((e, i) => (
                  <div key={i} className="flex justify-between gap-4 border-t border-line py-1">
                    <dt className="text-ink-muted">
                      {e.metric} · {e.context}
                    </dt>
                    <dd className="font-medium tabular-nums">{e.value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-line py-1">
                  <dt className="text-ink-muted">Campaign spend · period</dt>
                  <dd className="font-medium">{f.spend !== null ? inr(f.spend) : "Not applicable"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line py-1">
                  <dt className="text-ink-muted">Money at stake</dt>
                  <dd>Not calculated</dd>
                </div>
              </dl>
              <p className="mt-2 text-caption">
                <span className="text-ink-muted">Recommended · </span>
                {f.action}
              </p>
            </div>
          ) : (
            <div data-msg className="rounded-lg bg-surface p-4 text-caption">
              <p className="text-small font-medium">Account overview</p>
              <ul className="mt-2 flex flex-col gap-1">
                {FINDINGS.map((x) => (
                  <li key={x.id} className="flex items-center gap-2">
                    <SevBadge s={x.severity} /> {x.entity}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div data-msg className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-indigo px-4 py-2 text-small text-raised">
            {question}
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="border-t border-line p-4">
          <label htmlFor="assistant-q" className="sr-only">
            Follow-up question
          </label>
          <input id="assistant-q" className="field" placeholder="Ask a follow-up" />
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-caption text-ink-muted">The assistant connects in the next phase.</p>
            <button type="submit" disabled className="btn btn-primary btn-sm">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */
function SectionHead({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <div>
      <h2 id={id} className="text-h3 font-medium">
        {title}
      </h2>
      <p className="mt-2 text-small text-ink-muted">{sub}</p>
    </div>
  );
}

export function SevBadge({ s }: { s: Severity }) {
  return (
    <span data-sev className={`badge ${s === "attention" ? "badge-attention" : s === "watch" ? "badge-watch" : "badge-stable"}`}>
      {SEV_LABEL[s]}
    </span>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
export function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 2.5v-2.5h0a2 2 0 0 1-1.5-2z" />
    </svg>
  );
}
