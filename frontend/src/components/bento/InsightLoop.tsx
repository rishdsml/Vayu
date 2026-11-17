"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * How it works · 03 loop (3s). A proactive update from the Night Agent drops in; the cursor
 * opens it and it expands into the insight: what changed, why, and what to do (the example
 * account's lead finding). Then it folds away and the cursor returns.
 * Runs only while visible; reduced motion shows the expanded update, still.
 */
const ROWS = [
  { k: "What changed", v: "Search budget lost IS 86.7%" },
  { k: "Why", v: "The daily budget runs out" },
  { k: "What to do", v: "Check whether the budget was cut" },
];

export function InsightLoop({ record = false }: { record?: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce && !record) {
        gsap.set(q(".i-cursor"), { autoAlpha: 0 });
        return;
      }

      const detail = q(".i-detail")[0] as HTMLElement;
      const fullH = detail.scrollHeight;
      const box = root.current!.getBoundingClientRect();
      const cur = q(".i-cursor")[0].getBoundingClientRect();
      const head = q(".i-head")[0].getBoundingClientRect();
      const hit = { x: head.left - box.left + head.width * 0.62 - (cur.left - box.left + 5), y: head.top - box.top + head.height / 2 - (cur.top - box.top + 3) };

      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power3.out" } });
      tl.set(q(".i-card"), { y: -90, autoAlpha: 0, scale: 0.97 }, 0)
        .set(detail, { height: 0 }, 0)
        .set(q(".i-row"), { autoAlpha: 0, y: 6 }, 0)
        .set(q(".i-chev"), { rotation: 0 }, 0)
        .set(q(".i-cursor"), { x: 0, y: 0, scale: 1 }, 0)
        // the update drops in
        .to(q(".i-card"), { y: 0, autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, 0.05)
        .fromTo(q(".i-dot"), { scale: 0.6 }, { scale: 1, duration: 0.3, ease: "back.out(3)", transformOrigin: "50% 50%" }, 0.35)
        // cursor opens it
        .to(q(".i-cursor"), { x: hit.x, y: hit.y, duration: 0.45, ease: "power2.inOut" }, 0.5)
        .to([q(".i-card"), q(".i-cursor")], { scale: 0.98, duration: 0.08, ease: "power2.in" }, 0.98)
        .to([q(".i-card"), q(".i-cursor")], { scale: 1, duration: 0.22, ease: "back.out(2.5)" }, 1.06)
        .to(detail, { height: fullH, duration: 0.45, ease: "power3.inOut" }, 1.08)
        .to(q(".i-chev"), { rotation: 180, duration: 0.35 }, 1.08)
        .to(q(".i-row"), { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.12 }, 1.3)
        .to(q(".i-cursor"), { x: hit.x + 60, y: hit.y + 70, duration: 0.6, ease: "power2.inOut" }, 1.45)
        // fold away and return
        .to(q(".i-row"), { autoAlpha: 0, duration: 0.15, ease: "power2.in" }, 2.45)
        .to(detail, { height: 0, duration: 0.3, ease: "power3.inOut" }, 2.5)
        .to(q(".i-chev"), { rotation: 0, duration: 0.3 }, 2.5)
        .to(q(".i-card"), { y: -90, autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 2.7)
        .to(q(".i-cursor"), { x: 0, y: 0, duration: 0.45, ease: "power2.inOut" }, 2.5)
        .to({}, { duration: 0.01 }, 2.99);

      if (record) {
        (window as unknown as { __tl: gsap.core.Timeline }).__tl = tl.repeat(0);
        return;
      }
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.2 });
      io.observe(root.current!);
      return () => io.disconnect();
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden="true" className="relative h-[232px] overflow-hidden rounded-md bg-surface p-5">
      <div className="i-card rounded-xl bg-raised shadow-[0_0_0_1px_var(--color-line),0_18px_40px_-20px_rgb(43_46_112/0.45)]">
        <div className="i-head flex items-center gap-3 px-4 py-3">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-[30%] bg-indigo text-raised">
            <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />
            </svg>
            <span className="i-dot absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-raised bg-gold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-caption text-ink-muted">
              <span className="font-medium text-ink">Night Agent</span> · now
            </p>
            <p className="truncate text-small font-medium">Campaign A needs attention</p>
          </div>
          <span className="badge badge-attention">Attention</span>
          <svg viewBox="0 0 16 16" className="i-chev size-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </div>
        <div className="i-detail overflow-hidden">
          <div className="border-t border-line px-4 pb-3 pt-1">
            {ROWS.map((r) => (
              <div key={r.k} className="i-row flex items-baseline justify-between gap-4 border-b border-line py-2 text-caption last:border-0">
                <span className="text-ink-muted">{r.k}</span>
                <span className={`font-medium ${r.k === "What to do" ? "text-indigo-deep" : ""}`}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <svg className="i-cursor absolute bottom-4 right-10 z-20 size-6 drop-shadow-[0_4px_8px_rgb(35_36_46/0.3)]" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.5 1.6L9.5 19z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
