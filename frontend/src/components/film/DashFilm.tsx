"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Dashboard } from "../dashboard/Dashboard";
import { FilmMode } from "../dashboard/motion";
import { FINDINGS } from "@/lib/dashboard-data";

gsap.registerPlugin(useGSAP);

/**
 * Dashboard walkthrough film (loop, ~32s). Micro-interactions only, in the style of the
 * bento loops: no titles, no annotations. The real dashboard, read close up; the camera
 * scrolls top to bottom while a cursor uses the actual UI, then scrolls back up to loop.
 * ?record=1 pauses the timeline and exposes window.__tl for frame export.
 */
const SW = 1920;
const SH = 1080;
const WIN = 1440;
const S = 1.15; // reading zoom
const lead = FINDINGS[0];

type R = { x: number; y: number; w: number; h: number };

export function DashFilm() {
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
        const world = q(".d-world")[0] as HTMLElement;
        const win = q(".d-win")[0] as HTMLElement;
        gsap.set(world, { x: 0, y: 0, scale: 1 });
        const wr = world.getBoundingClientRect();
        const k = wr.width / world.offsetWidth;
        const sr0 = root.getBoundingClientRect();
        const rect = (el: Element): R => {
          const r = el.getBoundingClientRect();
          return { x: (r.left - wr.left) / k, y: (r.top - wr.top) / k, w: r.width / k, h: r.height / k };
        };
        const $ = (sel: string, i = 0) => win.querySelectorAll(sel)[i] as HTMLElement;
        const btn = (scope: string, text: string) => [...win.querySelectorAll<HTMLElement>(`${scope} button`)].find((b) => b.textContent?.trim() === text)!;
        const DH = win.offsetHeight;

        const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
        const clampY = (cy: number, s = S) => Math.min(Math.max(cy, SH / 2 / s), DH - SH / 2 / s);
        const camAt = (cy: number, s = S, cx = WIN / 2) => ({ x: SW / 2 - cx * s, y: SH / 2 - clampY(cy, s) * s });
        let camY = 0; // current camera centre (world y), for screen ↔ world conversion
        // travel at the reading zoom; push in (s > S, centred on cx) on the feature in use
        const cam = (cy: number, at: number, dur: number, s = S, cx = WIN / 2) => {
          camY = clampY(cy, s);
          return tl.to(world, { ...camAt(cy, s, cx), scale: s, duration: dur }, at);
        };

        /* cursor (world space) */
        const cursor = q(".d-cursor")[0];
        let last = { x: 0, y: 0 };
        const moveTo = (p: { x: number; y: number }, at: number, dur = 0.6) => {
          last = p;
          return tl.to(cursor, { left: p.x, top: p.y, duration: dur, ease: "power2.inOut" }, at);
        };
        const press = (at: number) => {
          tl.to(cursor, { scale: 0.86, duration: 0.08, ease: "power2.in" }, at);
          tl.to(cursor, { scale: 1, duration: 0.22, ease: "back.out(3)" }, at + 0.08);
          tl.fromTo(q(".d-ripple"), { left: last.x, top: last.y, scale: 0.3, autoAlpha: 0.6 }, { scale: 1.6, autoAlpha: 0, duration: 0.5, ease: "power2.out" }, at);
        };
        const centre = (r: R, fx = 0.5, fy = 0.5) => ({ x: r.x + r.w * fx, y: r.y + r.h * fy });
        // a screen-space element (the assistant panel) as a world point, for the current camera
        const screenToWorld = (el: Element) => {
          const r = el.getBoundingClientRect();
          const sx = (r.left + r.width / 2 - sr0.left) / k;
          const sy = (r.top + r.height / 2 - sr0.top) / k;
          const c = camAt(camY);
          return { x: (sx - c.x) / S, y: (sy - c.y) / S };
        };
        const hoverOn = (el: HTMLElement, at: number, dur: number) => {
          tl.to(el, { y: -3, boxShadow: "0 0 0 1px rgb(55 59 139 / 0.14), 0 32px 56px -36px rgb(43 46 112 / 0.32)", duration: 0.3, ease: "power2.out" }, at);
          tl.to(el, { y: 0, clearProps: "boxShadow,transform", duration: 0.3, ease: "power2.inOut" }, at + dur);
        };

        /* targets (measured in the default state) */
        const leadCard = $("#overview .dcard-lead");
        const leadBtn = $("#overview .dcard-lead button");
        const compact = $("#overview article", 1);
        const kpi = $("#overview > .dcard");
        const leversCard = $("#levers .dcard");
        const budgetTile = $("#levers .lever-tile", 2);
        const chartCard = $("#performance .dcard", 1);
        const costBtn = btn("#performance [aria-label='Metric']", "Cost");
        const cpaBtn = btn("#performance [aria-label='Metric']", "CPA");
        const chartSvg = $("#performance svg[role='img']");
        const campChevron = $("[aria-controls='camp-btech']");
        const campCard = $("#campaigns .dcard");
        const trackRows = [...win.querySelectorAll<HTMLElement>("#tracking tbody tr")];
        const trackCard = $("#tracking .dcard", 1);
        const notes = $("#data-notes") as HTMLDetailsElement;
        const notesSummary = $("#data-notes summary");
        const y = (el: HTMLElement) => rect(el).y;

        /* reset (also runs when the loop restarts) */
        const resetUI = () => {
          [...win.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent === "Reset")?.click();
          if (campChevron.getAttribute("aria-expanded") === "true") campChevron.click();
          if (cpaBtn.getAttribute("aria-pressed") !== "true") cpaBtn.click();
          notes.open = false;
        };
        tl.call(resetUI, [], 0);
        tl.set([q(".d-panel"), q(".d-scrim"), q(".d-ripple"), q(".d-msg")], { autoAlpha: 0 }, 0);
        tl.set(world, { ...camAt(0), scale: S }, 0);
        tl.set(cursor, { left: WIN - 180, top: 640, scale: 1, autoAlpha: 1 }, 0);
        tl.fromTo(q(".d-blob-a"), { x: -100, y: -40 }, { x: 160, y: 80, duration: 31.4, ease: "sine.inOut" }, 0);
        tl.fromTo(q(".d-blob-b"), { x: 120, y: 60 }, { x: -200, y: -40, duration: 31.4, ease: "sine.inOut" }, 0);

        // ===== 1 · top: hover the lead finding, investigate, assistant opens and closes =====
        camY = clampY(0);
        moveTo(centre(rect(leadCard), 0.5, 0.42), 0.3, 0.8);
        hoverOn(leadCard, 0.9, 1.6);
        moveTo(centre(rect(leadBtn)), 1.4, 0.55);
        const lb = centre(rect(leadBtn));
        cam(lb.y - 60, 1.2, 0.85, 1.6, lb.x - 160); // push in on Investigate
        press(2.05);
        tl.to(leadBtn, { scale: 0.95, duration: 0.08 }, 2.05).to(leadBtn, { scale: 1, duration: 0.2, ease: "back.out(3)" }, 2.13);
        cam(0, 2.2, 0.7); // ease back out as the assistant opens
        tl.to(q(".d-scrim"), { autoAlpha: 1, duration: 0.35 }, 2.2);
        tl.fromTo(q(".d-panel"), { x: 640, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out" }, 2.2);
        tl.fromTo(q(".d-msg"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.28, ease: "power3.out" }, 2.6);
        tl.to(q(".d-tdot"), { y: -5, duration: 0.25, repeat: 5, yoyo: true, stagger: 0.1, ease: "sine.inOut" }, 3.5);
        moveTo(screenToWorld(q(".d-close")[0]), 4.3, 0.7);
        press(5.1);
        tl.to(q(".d-panel"), { x: 640, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, 5.2);
        tl.to(q(".d-scrim"), { autoAlpha: 0, duration: 0.35 }, 5.3);

        // ===== 2 · compact finding hover, then down past the KPIs =====
        moveTo(centre(rect(compact), 0.5, 0.4), 5.7, 0.7);
        hoverOn(compact, 6.3, 1.0);
        const ky = y(kpi);
        cam(ky - 120, 7.0, 1.1);
        moveTo(centre(rect(kpi), 0.15, 0.6), 7.3, 0.7);

        // ===== 3 · levers: filter findings, then reset =====
        const lr = rect(leversCard);
        cam(lr.y - 200, 9.0, 1.1);
        moveTo(centre(rect(budgetTile)), 9.6, 0.7);
        cam(lr.y + lr.h / 2 - 60, 9.7, 0.9, 1.4, lr.x + lr.w / 2);
        press(10.35);
        tl.call(() => budgetTile.click(), [], 10.4);
        moveTo({ x: lr.x + lr.w - 40, y: lr.y - 36 }, 11.4, 0.6);
        press(12.15);
        tl.call(() => [...win.querySelectorAll<HTMLElement>("#levers button")].find((b) => b.textContent === "Reset")?.click(), [], 12.2);

        // ===== 4 · trend: switch metric, hover the days, switch back =====
        const cr = rect(chartCard);
        cam(cr.y + cr.h / 2, 12.4, 1.2, 1.45, cr.x + cr.w / 2);
        moveTo(centre(rect(costBtn)), 13.1, 0.6);
        press(13.75);
        tl.call(() => costBtn.click(), [], 13.8);
        const sr = rect(chartSvg);
        for (let i = 0; i < 8; i++) {
          const px = sr.x + 56 + (i * (sr.w - 56 - 24)) / 7;
          const at = 14.6 + i * 0.26;
          moveTo({ x: px, y: sr.y + sr.h * 0.5 }, at - 0.2, 0.22);
          tl.call(() => {
            const b = chartSvg.getBoundingClientRect();
            // TrendChart maps clientX with its unscaled width, so aim in those units (exact day i)
            const cx = b.left + 56 + (i * (sr.w - 56 - 24)) / 7;
            chartSvg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: cx, clientY: b.top + b.height * 0.5 }));
          }, [], at);
        }
        tl.call(() => chartSvg.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body })), [], 16.9);
        moveTo(centre(rect(cpaBtn)), 16.9, 0.5);
        press(17.5);
        tl.call(() => cpaBtn.click(), [], 17.55);

        // ===== 5 · campaigns: Campaign A, then its ad group, then close =====
        const cc = rect(campCard);
        cam(cc.y + 320, 17.9, 1.2, 1.35, cc.x + cc.w / 2);
        moveTo(centre(rect(campChevron)), 18.6, 0.6);
        press(19.25);
        tl.call(() => campChevron.click(), [], 19.3);
        moveTo({ x: cc.x + cc.w * 0.5, y: cc.y + 580 }, 20.2, 0.7);
        press(20.95);
        tl.call(() => {
          const ag = win.querySelector<HTMLElement>("#camp-btech button[aria-expanded]");
          if (ag?.getAttribute("aria-expanded") === "false") ag.click();
        }, [], 21.0);
        moveTo(centre(rect(campChevron)), 22.6, 0.7);
        press(23.4);
        tl.call(() => campChevron.click(), [], 23.45);

        // ===== 6 · tracking: hover the flagged rows =====
        const tr = rect(trackCard);
        cam(tr.y + tr.h / 2, 23.7, 1.2, 1.45, tr.x + tr.w / 2);
        trackRows.slice(0, 2).forEach((row, i) => {
          const at = 24.6 + i * 0.6;
          moveTo(centre(rect(row), 0.25, 0.5), at - 0.4, 0.4);
          tl.to(row, { backgroundColor: "rgb(243 229 174 / 0.45)", duration: 0.2 }, at).to(row, { clearProps: "backgroundColor", duration: 0.01 }, at + 0.55);
        });

        // ===== 7 · data integrity opens, closes =====
        const nr = rect(notes);
        cam(nr.y + 60, 26.1, 1.0, 1.4, nr.x + nr.w / 2);
        moveTo(centre(rect(notesSummary), 0.12, 0.5), 26.5, 0.6);
        press(27.15);
        tl.call(() => (notes.open = true), [], 27.2);
        press(28.6);
        tl.call(() => (notes.open = false), [], 28.65);

        // ===== 8 · scroll back to the top (loop point) =====
        cam(0, 28.9, 1.9);
        moveTo({ x: WIN - 180, y: 640 }, 29.2, 1.5);
        tl.to({}, { duration: 0.6 }, 30.8);

        (window as unknown as { __tl: gsap.core.Timeline }).__tl = tl;
        if (!new URLSearchParams(location.search).has("record")) tl.repeat(-1).play();
        else tl.seek(0);
      });
      const id = setTimeout(build, 1400);
      return () => clearTimeout(id);
    },
    { scope: stage },
  );

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#edf1f7]">
      <div ref={stage} className="relative overflow-hidden" style={{ width: SW, height: SH, transform: `scale(${scale})`, flex: "none" }}>
        <div className="absolute inset-0 bg-[#edf1f7]" />
        <div className="d-blob-a absolute -left-72 -top-72 size-[1200px] rounded-full bg-[radial-gradient(closest-side,rgb(243_229_174/0.75),transparent)]" />
        <div className="d-blob-b absolute -right-72 top-40 size-[1300px] rounded-full bg-[radial-gradient(closest-side,rgb(185_207_240/0.95),transparent)]" />

        <div className="d-world absolute left-0 top-0 origin-top-left" style={{ width: WIN }}>
          <div className="d-win absolute left-0 top-0 overflow-hidden rounded-[28px] shadow-[0_0_0_1px_rgb(255_255_255/0.7),0_60px_140px_-50px_rgb(43_46_112/0.45)]" style={{ width: WIN }}>
            <FilmMode.Provider value={true}>
              <div className="pointer-events-none">
                <Dashboard />
              </div>
            </FilmMode.Provider>
          </div>
          <span className="d-ripple pointer-events-none absolute z-[90] -ml-6 -mt-6 size-12 rounded-full border-2 border-indigo/50" />
          <svg className="d-cursor pointer-events-none absolute z-[90] -ml-[5px] -mt-[3px] size-8 drop-shadow-[0_6px_12px_rgb(35_36_46/0.35)]" viewBox="0 0 24 24">
            <path d="M5 3l14 8-6.5 1.6L9.5 19z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        {/* assistant (screen space) */}
        <div className="d-scrim pointer-events-none absolute inset-0 bg-ink/15" />
        <div className="d-panel absolute right-16 top-1/2 flex w-[600px] -translate-y-1/2 flex-col rounded-[28px] bg-raised p-10 shadow-[0_80px_160px_-60px_rgb(43_46_112/0.6)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[20px] font-medium">AI Assistant</p>
              <p className="text-small text-ink-muted">SMS Lucknow · 31 Aug – 7 Sep 2026</p>
            </div>
            <span className="d-close grid size-10 place-items-center rounded-full text-[22px] leading-none text-ink-muted">×</span>
          </div>
          <p className="d-msg mt-8 text-small text-ink-muted">Context attached to this conversation</p>
          <div className="d-msg mt-3 rounded-2xl bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="badge badge-attention">Attention</span>
              <span className="text-caption text-ink-muted">Budget &amp; Bidding · Campaign</span>
            </div>
            <p className="mt-3 text-[20px] font-medium">{lead.entity}</p>
            {lead.evidence.map((e, i) => (
              <div key={i} className="mt-2 flex justify-between border-t border-line pt-2 text-small">
                <span className="text-ink-muted">
                  {e.metric} · {e.context}
                </span>
                <span className="font-medium">{e.value}</span>
              </div>
            ))}
          </div>
          <div className="d-msg ml-auto mt-6 max-w-[85%] rounded-2xl rounded-br-md bg-indigo px-5 py-3 text-[17px] text-raised">
            Why is this happening on {lead.entity}, and what should I check first?
          </div>
          <div className="d-msg mt-5 flex gap-1.5 self-start rounded-2xl bg-surface px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="d-tdot size-2 rounded-full bg-ink/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
