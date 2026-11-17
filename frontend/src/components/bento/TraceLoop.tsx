"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Bento loop · "Answers you can trace" (3s). A cropped finding card; the cursor clicks
 * its sources control and the operations behind the finding expand from that point,
 * ticking in one by one. Then it closes and the cursor returns: a seamless loop.
 * Runs only while visible; reduced motion shows the open state, still.
 * `record` pauses the timeline and exposes it on window.__tl for MP4 export.
 */
const OPS = [
  { op: "Compare time periods", scope: "Period" },
  { op: "Break down by campaign", scope: "Campaign" },
  { op: "Check spend trend", scope: "Daily" },
];

export function TraceLoop({ record = false }: { record?: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce && !record) {
        gsap.set(q(".t-pop"), { autoAlpha: 1 });
        gsap.set(q(".t-cursor"), { autoAlpha: 0 });
        return;
      }

      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power3.out" } });
      tl.set(q(".t-pop"), { autoAlpha: 0, scale: 0.92, y: -6 }, 0)
        .set(q(".t-row"), { autoAlpha: 0, x: -8 }, 0)
        .set(q(".t-tick"), { scale: 0 }, 0)
        .set(q(".t-cursor"), { x: 0, y: 0, scale: 1 }, 0)
        // cursor travels to the sources control
        .to(q(".t-cursor"), { x: 2, y: -147, duration: 0.6, ease: "power2.inOut" }, 0.05)
        .to(q(".t-src"), { backgroundColor: "rgb(55 59 139 / 0.10)", duration: 0.2 }, 0.45)
        // press
        .to([q(".t-src"), q(".t-cursor")], { scale: 0.9, duration: 0.1, ease: "power2.in" }, 0.68)
        .to([q(".t-src"), q(".t-cursor")], { scale: 1, duration: 0.25, ease: "back.out(3)" }, 0.78)
        .fromTo(q(".t-ring"), { scale: 0.6, autoAlpha: 0.7 }, { scale: 1.8, autoAlpha: 0, duration: 0.5, ease: "power2.out" }, 0.7)
        // popover expands from the control
        .to(q(".t-pop"), { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.4)" }, 0.78)
        .to(q(".t-row"), { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.14 }, 0.95)
        .to(q(".t-tick"), { scale: 1, duration: 0.3, stagger: 0.14, ease: "back.out(3)" }, 1.0)
        // cursor eases off while the popover holds
        .to(q(".t-cursor"), { x: -40, y: -60, duration: 0.7, ease: "power2.inOut" }, 1.5)
        // close and return
        .to(q(".t-pop"), { autoAlpha: 0, scale: 0.96, y: -4, duration: 0.25, ease: "power2.in" }, 2.35)
        .to(q(".t-src"), { backgroundColor: "rgb(55 59 139 / 0)", duration: 0.25 }, 2.35)
        .to(q(".t-cursor"), { x: 0, y: 0, duration: 0.5, ease: "power2.inOut" }, 2.45)
        .to({}, { duration: 0.05 }, 2.95);

      if (record) {
        (window as unknown as { __tl: gsap.core.Timeline }).__tl = tl.repeat(0);
        return;
      }
      // Only run while on screen
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.2 });
      io.observe(root.current!);
      return () => io.disconnect();
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden="true" className="relative h-[240px] overflow-hidden rounded-md bg-raised">
      {/* cropped finding card */}
      <div className="absolute left-6 right-6 top-6 rounded-lg bg-raised p-5 shadow-[0_0_0_1px_var(--color-line),0_20px_40px_-28px_rgb(43_46_112/0.35)]">
        <div className="flex items-center gap-2">
          <span className="badge badge-attention">Attention</span>
          <span className="text-caption text-ink-muted">Budget &amp; Bidding</span>
          {/* sources control */}
          <span className="t-src relative ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium text-indigo-deep shadow-[0_0_0_1px_var(--color-line)]">
            <span className="t-ring absolute inset-0 rounded-full border-2 border-indigo/50 opacity-0" />
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M8 2 2 5l6 3 6-3-6-3Z" />
              <path d="m2 8 6 3 6-3M2 11l6 3 6-3" />
            </svg>
            3
          </span>
        </div>
        <p className="mt-4 text-small font-medium">Campaign A</p>
        <div className="mt-3 text-caption">
          {[
            ["search_budget_lost_is", "86.7%"],
            ["CPC", "₹16.63 → ₹31.07"],
            ["Spend", "Down"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-t border-line py-2">
              <span className="text-ink-muted">{k}</span>
              <span className="font-medium tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* operations popover, anchored under the sources control */}
      <div className="t-pop absolute right-8 top-[76px] z-10 w-[280px] origin-top-right rounded-lg bg-raised p-4 opacity-0 shadow-[0_0_0_1px_var(--color-line),0_24px_48px_-20px_rgb(43_46_112/0.45)]">
        <p className="text-caption text-ink-muted">3 operations used</p>
        <ul className="mt-2 flex flex-col">
          {OPS.map((o) => (
            <li key={o.op} className="t-row flex items-center gap-2 border-t border-line py-2 text-caption first:border-0">
              <span className="t-tick grid size-4 shrink-0 place-items-center rounded-full bg-gold text-raised">
                <svg viewBox="0 0 16 16" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              </span>
              <span className="font-medium">{o.op}</span>
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-ink-muted">{o.scope}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* cursor (rests bottom-right, travels to the control) */}
      <svg className="t-cursor absolute bottom-4 right-12 z-20 size-6 drop-shadow-[0_4px_8px_rgb(35_36_46/0.3)]" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.5 1.6L9.5 19z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>

      {/* soft fade at the bottom, as the fragment continues */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-raised to-transparent" />
    </div>
  );
}
