"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { NoiseGradient, fallbackGradient } from "@/components/NoiseGradient";
import { CARD_GRADIENT, HERO_GRADIENT } from "@/lib/site";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Copy follows the product documentation's landing-page addendum (Reporting, Diagnosis, Night). */
const AGENTS = [
  {
    n: "01",
    label: "Reporting",
    title: "See what is moving.",
    body: "Reads your account through trends, thresholds, comparisons, state changes and concentration, then flags the shifts and emerging issues worth a closer look.",
    View: ReportingView,
  },
  {
    n: "02",
    label: "Diagnosis",
    title: "Find out why it moved.",
    body: "Takes a change and follows the evidence. Structured diagnostic checks work across bidding, targeting, creatives and measurement until the likely cause is clear.",
    View: DiagnosisView,
  },
  {
    n: "03",
    label: "Night",
    title: "Hear about it on WhatsApp.",
    body: "Keeps watch on a schedule. When a problem or opportunity turns up, a short update lands on WhatsApp, so you hear about it without opening a dashboard.",
    View: NightView,
  },
] as const;

// Below 1200px the split stage is too narrow for a readable screen: stacked layout instead.
const PIN_MEDIA = "(min-width: 1200px) and (prefers-reduced-motion: no-preference)";

/**
 * Scroll progress → position. Position j means agent j is settled: its text centred,
 * its screen flat in the panel. Starts at −0.5: as the stage pins, the first screen
 * is already rising into the panel.
 * [share of scroll, distance moved]
 */
const START = -0.5;
const SEG: [share: number, move: number][] = [
  [0.12, 0.5],
  [0.12, 0],
  [0.22, 1],
  [0.12, 0],
  [0.22, 1],
  [0.2, 0],
];

/** Arc and entrance geometry (one place, so it stays consistent). */
const ARC = {
  angle: 24, // degrees between neighbouring screens on the wheel
  radius: 1.6, // wheel radius in panel heights; centre sits far to the right
  lag: 0.3, // incoming screen waits this share of the move before it starts
  blurIn: 12, // px blur on an incoming screen at the start of its move
  blurOut: 6, // px blur on an outgoing screen at the end of its move
  textShift: 120, // px the texts travel between states
  textDrift: 40, // px of continuous drift per agent, so texts keep moving through holds
};
const RANGE = 2 - START; // position span, for the linear (unheld) drift

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Incoming items (d > 0) start late and decelerate into place; outgoing ones follow scroll. */
function effective(d: number) {
  if (d <= 0 || d >= 1) return d;
  const t = clamp01((1 - d - ARC.lag) / (1 - ARC.lag));
  return 1 - easeOutCubic(t);
}
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
function toPos(p: number) {
  let acc = 0;
  let pos = START;
  for (const [share, move] of SEG) {
    if (p <= acc + share) return pos + move * easeInOut((p - acc) / share);
    acc += share;
    pos += move;
  }
  return pos;
}

export function Agents() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(PIN_MEDIA, () => {
        const q = gsap.utils.selector(root);
        const panel = q<HTMLElement>("[data-agents-panel]")[0];
        const items = q<HTMLElement>("[data-agents-item]");
        const cards = q<HTMLElement>("[data-agents-card]");
        if (!panel) return;

        // Measured once per refresh, never during scroll.
        let R = 1000;
        const measure = () => {
          R = panel.offsetHeight * ARC.radius;
        };

        // Last written values: skip DOM writes when nothing changed (held states cost nothing).
        const lastT: string[] = [];
        const lastO: string[] = [];
        const lastF: string[] = [];
        const lastA: string[] = [];
        const write = (el: HTMLElement, i: number, store: string[][], t: string, o: string, f?: string) => {
          if (store[0][i] !== t) el.style.transform = store[0][i] = t;
          if (store[1][i] !== o) el.style.opacity = store[1][i] = o;
          if (f !== undefined && store[2][i] !== f) el.style.filter = store[2][i] = f;
        };
        const cardStore = [lastT, lastO, lastF];
        const textStore: string[][] = [[], [], []];

        const apply = (pos: number, p: number) => {
          // Linear position (no holds): drives a slow, continuous drift so the copy travels
          // through the section like Outcrowd's column instead of parking at one coordinate.
          const lin = START + p * RANGE;
          items.forEach((it, j) => {
            const d = effective(j - pos);
            // Outgoing copy clears out before the midpoint; incoming copy arrives after it.
            const o = d < 0 ? clamp01(1 + d * 2.4) : 1 - smooth(0.1, 0.7, d);
            const y = d * ARC.textShift + (j - lin) * ARC.textDrift;
            write(it, j, textStore, `translate3d(0, ${y.toFixed(1)}px, 0)`, o.toFixed(3));
            const hidden = String(Math.abs(d) > 0.5);
            if (it.getAttribute("aria-hidden") !== hidden) it.setAttribute("aria-hidden", hidden);
          });
          cards.forEach((c, j) => {
            const raw = j - pos;
            const d = effective(raw);
            const a = Math.max(-1.4, Math.min(1.4, d));
            // Rigid rotation about a hub R to the right of the panel centre. Moving down the
            // arc (y > 0) is a counter-clockwise turn on screen, so the screen tilts by −θ:
            // its top edge leans toward the hub, as on a wheel (the old +θ folded against it).
            const th = (a * ARC.angle * Math.PI) / 180;
            const x = R * (1 - Math.cos(th));
            const y = R * Math.sin(th);
            const m = Math.min(1, Math.abs(d));
            const incoming = d > 0;
            const scale = incoming ? 0.86 + 0.14 * (1 - m) : 1 - 0.06 * m;
            const blur = incoming ? ARC.blurIn * m : ARC.blurOut * m;
            // Only one screen reads at a time: the outgoing one is gone by the midpoint,
            // the incoming one fades in late, still blurred, and sharpens as it settles.
            const opacity = incoming ? 1 - smooth(0.1, 0.7, d) : clamp01(1 - m * 2);
            write(
              c,
              j,
              cardStore,
              `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) rotate(${(-a * ARC.angle).toFixed(2)}deg) scale(${scale.toFixed(4)})`,
              opacity.toFixed(3),
              blur < 0.05 ? "none" : `blur(${blur.toFixed(2)}px)`,
            );
            const active = String(Math.abs(raw) < 0.5);
            if (lastA[j] !== active) c.dataset.active = lastA[j] = active;
          });
        };

        measure();
        apply(toPos(0), 0);
        const state = { p: 0 };
        gsap.to(state, {
          p: 1,
          ease: "none",
          scrollTrigger: {
            trigger: q("[data-agent-track]")[0],
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            invalidateOnRefresh: true,
            onRefresh: () => {
              measure();
              lastT.length = 0; // geometry changed: force a full write
            },
          },
          onUpdate: () => apply(toPos(state.p), state.p),
        });

        // The gradient frame rises out of the lavender ground as the stage arrives.
        gsap.fromTo(
          panel,
          { opacity: 0, y: 64, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: q("[data-agent-track]")[0], start: "top 90%", end: "top top", scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="agents" aria-labelledby="agents-title" className="agents-wash">
      {/* The intro above introduces the agents; this heading is for assistive tech */}
      <h2 id="agents-title" className="sr-only">
        The three agents
      </h2>

      {/* Desktop: pinned split stage */}
      <div data-agent-track className="agents-pinned">
        <div className="agents-stage isolate">
          {/* Full-bleed ground gradient (calm on the left keeps the copy readable) */}
          <div className="wrap grid w-full grid-cols-12 items-center gap-8">
            {/* Left (5/12 ≈ 42%): texts swap in place, outgoing up, incoming from below */}
            <div className="agents-copy col-span-5">
              {AGENTS.map((a) => (
                <div key={a.n} data-agents-item className="agents-item">
                  <AgentText agent={a} />
                </div>
              ))}
            </div>

            {/* Right (7/12 ≈ 58%): the gradient frame; screens ride an arc inside it */}
            <div data-agents-panel className="agents-panel col-span-7" aria-hidden="true">
              <NoiseGradient
                palette={CARD_GRADIENT.palette}
                scale={CARD_GRADIENT.scale}
                distortion={CARD_GRADIENT.distortion}
                deepAmount={CARD_GRADIENT.deepAmount}
                accentAmount={CARD_GRADIENT.accentAmount}
                calm={{ x: 0.5, y: 0.5, radius: 0.6, amount: 0.4 }}
                pointer={0.4}
                grain={0.85}
                seed={3}
                className="absolute inset-0"
              />
              {AGENTS.map(({ n, View }) => (
                <div key={n} data-agents-card className="agents-card" style={{ opacity: 0 }}>
                  <View />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phones, tablets and reduced motion: a stacked list */}
      <div className="agents-list wrap pb-section">
        {AGENTS.map(({ n, View, ...a }) => (
          <article key={n} className="grid gap-6">
            <AgentText agent={a} />
            <div className="rounded-xl p-4 sm:p-8" style={{ background: fallbackGradient(HERO_GRADIENT) }} aria-hidden="true">
              {/* same width the screen has in the desktop panel, so diagrams keep their proportions */}
              <div className="mx-auto max-w-screen">
                <View />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgentText({ agent }: { agent: { label: string; title: string; body: string } }) {
  return (
    <article className="max-w-md">
      <p className="eyebrow text-indigo">{agent.label}</p>
      <h3 className="mt-4 text-h2">{agent.title}</h3>
      <p className="mt-4 text-lede text-ink-muted">{agent.body}</p>
    </article>
  );
}

/* ---------- Illustrative product views ---------- */

const SHAPES = [
  { name: "Trend", level: "Account", hot: false, spark: <polyline points="2,18 14,15 26,17 38,12 50,13 62,9" className="stroke-indigo" /> },
  {
    name: "Threshold",
    level: "Campaign",
    hot: true,
    spark: (
      <>
        <line x1="0" y1="17" x2="64" y2="17" className="stroke-ink/20" strokeDasharray="2 3" />
        <polyline points="2,8 18,9 32,11 44,12 52,21 62,25" className="stroke-gold" />
      </>
    ),
  },
  {
    name: "Comparison",
    level: "Campaign",
    hot: false,
    spark: (
      <>
        <rect x="8" y="6" width="9" height="18" rx="2" className="fill-ink/15 stroke-none" />
        <rect x="19" y="8" width="9" height="16" rx="2" className="fill-indigo stroke-none" />
        <rect x="36" y="9" width="9" height="15" rx="2" className="fill-ink/15 stroke-none" />
        <rect x="47" y="10" width="9" height="14" rx="2" className="fill-indigo stroke-none" />
      </>
    ),
  },
  {
    name: "State change",
    level: "Campaign",
    hot: false,
    spark: (
      <>
        <line x1="12" y1="14" x2="50" y2="14" className="stroke-ink/20" />
        <circle cx="12" cy="14" r="4" className="fill-raised stroke-indigo" />
        <circle cx="50" cy="14" r="4" className="fill-gold stroke-gold" />
      </>
    ),
  },
  {
    name: "Concentration",
    level: "Ad group",
    hot: false,
    spark: (
      <>
        <rect x="2" y="8" width="32" height="12" rx="2" className="fill-indigo stroke-none" />
        <rect x="37" y="8" width="11" height="12" rx="2" className="fill-indigo/25 stroke-none" />
        <rect x="51" y="8" width="6" height="12" rx="2" className="fill-indigo/25 stroke-none" />
      </>
    ),
  },
];

/** Five analytical signals converge into one account view. */
function ReportingView() {
  return (
    <div className="ui-window p-4 sm:p-6">
      <p className="eyebrow text-ink-muted">Five analytical signals</p>
      {/* Phones: three plus two tiles, no converging lines (they need five columns) */}
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SHAPES.map((s) => (
          <li key={s.name} className={`flex flex-col items-center gap-2 rounded-md bg-raised p-2 text-center ${s.hot ? "ring-2 ring-gold ring-inset" : ""}`}>
            <svg viewBox="0 0 64 28" className="h-6 w-full max-w-14" fill="none" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              {s.spark}
            </svg>
            <span className="text-micro font-semibold sm:text-caption">{s.name}</span>
            <span className="hidden text-micro text-ink-muted sm:block">{s.level}</span>
          </li>
        ))}
      </ul>
      <svg viewBox="0 0 500 48" preserveAspectRatio="none" aria-hidden="true" className="draw hidden h-12 w-full sm:block" fill="none">
        {[50, 150, 250, 350, 450].map((x) => (
          <path key={x} d={`M${x} 0 C${x} 30 250 18 250 48`} className={`${x === 150 ? "stroke-gold" : "stroke-indigo/40"}`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-4 rounded-md bg-raised p-4 sm:mt-0">
        <p className="text-small font-semibold">Where attention is needed</p>
        <ul className="mt-2 grid gap-2 text-small">
          <li className="flex items-center gap-2">
            <span className="badge badge-attention">Attention</span>Conversion rate in one campaign
          </li>
          <li className="flex items-center gap-2">
            <span className="badge badge-watch">Watch</span>Budget status and spend concentration
          </li>
          <li className="flex items-center gap-2">
            <span className="badge badge-stable">Stable</span>Overall account direction
          </li>
        </ul>
      </div>
    </div>
  );
}

/** A diagnostic decision path: evidence decides which branch is investigated. */
function DiagnosisView() {
  return (
    <div className="ui-window p-4 sm:p-6">
      <p className="eyebrow text-ink-muted">Question</p>
      <p className="mt-2 text-small font-semibold">Why did ROAS decline in Campaign A?</p>
      <div className="mx-auto mt-4 max-w-64 rounded-md bg-butter/70 p-2 text-center">
        <p className="text-micro font-medium text-gold-text">Identified change</p>
        <p className="text-small">ROAS declined in Campaign A</p>
      </div>
      <svg viewBox="0 0 400 32" preserveAspectRatio="none" aria-hidden="true" className="draw h-8 w-full" fill="none">
        <path d="M200 0 C200 22 100 10 100 32" className="stroke-ink/25" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M200 0 C200 22 300 10 300 32" className="stroke-indigo" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="grid grid-cols-2 gap-4 text-small">
        <div className="flex flex-col gap-2 opacity-60">
          <div className="rounded-md bg-raised p-2">
            <p className="text-micro font-medium text-ink-muted">Did CPC change?</p>
            <p>No, CPC is stable</p>
          </div>
          <p className="rounded-md bg-surface p-2 text-caption text-ink-muted">Bidding less likely</p>
        </div>
        <div className="flex flex-col">
          <div className="rounded-md bg-raised p-2 ring-2 ring-indigo ring-inset">
            <p className="text-micro font-medium text-indigo">Did conversion rate change?</p>
            <p>Yes, it declined</p>
          </div>
          <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true" className="draw h-6 w-full" fill="none">
            {[50, 150, 250].map((x) => (
              <path key={x} d={`M150 0 C150 16 ${x} 8 ${x} 24`} className={`${x === 50 ? "stroke-indigo" : "stroke-ink/25"}`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div className="grid grid-cols-3 gap-1 text-center text-micro">
            <p className="rounded-sm bg-indigo p-1 text-raised">Creatives<br />evidence found</p>
            <p className="rounded-sm bg-raised p-1 text-ink-muted">Targeting<br />no change</p>
            <p className="rounded-sm bg-raised p-1 text-ink-muted">Measurement<br />no change</p>
          </div>
        </div>
      </div>
      <p className="mt-4 rounded-md bg-mint/70 p-4 text-small">
        <span className="font-medium">Reasoned conclusion:</span> review creative performance in the affected ad groups.
        Evidence attached.
      </p>
    </div>
  );
}

const WATCH = [
  { title: "Monitoring", text: "Account reviewed across levels" },
  { title: "Development surfaced", text: "Conversion rate below expected range", via: "Reporting", hot: true },
  { title: "Investigation coordinated", text: "Likely cause and evidence identified", via: "Diagnosis" },
  { title: "Update prepared", text: "Added to the next scheduled update" },
];

/** Overnight monitoring coordinates the other agents and prepares a scheduled update. */
function NightView() {
  return (
    <div className="ui-window grid gap-6 p-4 sm:grid-cols-2 sm:p-6">
      <ol className="relative grid gap-4 border-l border-line pl-6">
        {WATCH.map((w) => (
          <li key={w.title} className="relative">
            <span className={`absolute -left-8 top-1 size-4 rounded-full border-2 border-raised ${w.hot ? "pulse-gold bg-gold" : "bg-indigo/40"}`} />
            <p className="text-small font-semibold">{w.title}</p>
            <p className="text-caption text-ink-muted">{w.text}</p>
            {w.via && <span className="badge mt-1 bg-surface text-ink-muted">via {w.via}</span>}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 rounded-lg bg-surface/70 p-4">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-small font-semibold">Account intelligence</span>
          <span className="text-micro text-ink-muted">Scheduled update</span>
        </p>
        <div className="rounded-md bg-raised p-4 text-small">
          <p className="eyebrow text-ink-muted">Observed</p>
          <p className="mt-1">Conversion rate in one campaign fell below its expected range. CPC stayed relatively stable.</p>
          <p className="eyebrow mt-2 text-indigo">Suggested action</p>
          <p className="mt-1">Review creative performance in the affected ad groups.</p>
        </div>
        <div className="rounded-md bg-butter/60 p-4 text-small">
          <p className="eyebrow text-gold-text">Opportunity</p>
          <p className="mt-1">One ad group is outperforming the rest of its campaign.</p>
        </div>
      </div>
    </div>
  );
}
