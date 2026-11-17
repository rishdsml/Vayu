"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Bento loop · "It starts from your history" (3s). Twelve months of account history sync
 * in left to right, the status settles to Synced, the account-context lines draw from that
 * history, and the cursor selects the latest month, which every line is judged against.
 * Illustrative shapes only (no figures). Runs only while visible; reduced motion shows the
 * synced state, still.
 */
const MONTHS = [38, 52, 46, 60, 55, 68, 62, 74, 66, 80, 72, 58]; // bar heights, %
const LINES = [
  { label: "Campaign performance", pts: "2,12 18,10 34,11 50,7 66,8 82,4 94,5", tone: "stroke-indigo" },
  { label: "Spending behaviour", pts: "2,8 18,9 34,6 50,8 66,5 82,7 94,6", tone: "stroke-indigo" },
  { label: "Conversions", pts: "2,11 18,9 34,10 50,6 66,7 82,5 94,3", tone: "stroke-indigo" },
  { label: "ROAS", pts: "2,6 18,7 34,9 50,8 66,10 82,9 94,11", tone: "stroke-gold" },
];

export function HistoryLoop({ record = false }: { record?: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce && !record) {
        gsap.set(q(".h-syncing, .h-cursor"), { autoAlpha: 0 });
        return;
      }

      const box = root.current!.getBoundingClientRect();
      const cur = q(".h-cursor")[0].getBoundingClientRect();
      const last = q(".h-bar")[MONTHS.length - 1].getBoundingClientRect();
      const tip = { x: cur.left - box.left + 5, y: cur.top - box.top + 3 };
      const hit = { x: last.left - box.left + last.width / 2 - tip.x, y: last.bottom - box.top - last.height * 0.35 - tip.y };
      const lens = q(".h-line").map((p) => (p as unknown as SVGPolylineElement).getTotalLength());

      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power3.out" } });
      tl.set(q(".h-bar"), { scaleY: 0, backgroundColor: "rgb(55 59 139 / 0.28)" }, 0)
        .set(q(".h-scan"), { scaleX: 0, autoAlpha: 1 }, 0)
        .set(q(".h-syncing"), { autoAlpha: 1 }, 0)
        .set(q(".h-synced"), { autoAlpha: 0, scale: 0.8 }, 0)
        .set(q(".h-dot"), { scale: 0, transformOrigin: "50% 50%" }, 0)
        .set(q(".h-mark"), { autoAlpha: 0, y: 4 }, 0)
        .set(q(".h-cursor"), { x: 0, y: 0, scale: 1 }, 0);
      // hidden until drawn (round caps would otherwise show as dots)
      q(".h-line").forEach((p, i) => tl.set(p, { strokeDasharray: lens[i], strokeDashoffset: lens[i], autoAlpha: 0 }, 0));

      // history syncs in, month by month
      tl.to(q(".h-scan"), { scaleX: 1, duration: 0.85, ease: "power1.inOut" }, 0.05)
        .to(q(".h-bar"), { scaleY: 1, duration: 0.35, stagger: 0.055, ease: "back.out(1.6)" }, 0.05)
        .to(q(".h-scan"), { autoAlpha: 0, duration: 0.2 }, 0.9)
        .to(q(".h-syncing"), { autoAlpha: 0, duration: 0.15 }, 0.9)
        .to(q(".h-synced"), { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, 0.95);
      // the context draws from it
      q(".h-line").forEach((p, i) => {
        tl.set(p, { autoAlpha: 1 }, 1.0 + i * 0.1);
        tl.to(p, { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" }, 1.0 + i * 0.1);
      });
      // the cursor selects the latest month: everything is judged against it
      tl.to(q(".h-cursor"), { x: hit.x, y: hit.y, duration: 0.5, ease: "power2.inOut" }, 1.1)
        .to(q(".h-cursor"), { scale: 0.88, duration: 0.08, ease: "power2.in" }, 1.62)
        .to(q(".h-cursor"), { scale: 1, duration: 0.22, ease: "back.out(3)" }, 1.7)
        .to(q(".h-bar")[MONTHS.length - 1], { backgroundColor: "#d0ae3e", duration: 0.25 }, 1.64)
        .to(q(".h-mark"), { autoAlpha: 1, y: 0, duration: 0.3 }, 1.7)
        .to(q(".h-dot"), { scale: 1, duration: 0.3, stagger: 0.06, ease: "back.out(3)" }, 1.75)
        .to(q(".h-cursor"), { x: hit.x * 0.5, y: hit.y * 0.6, duration: 0.5, ease: "power2.inOut" }, 2.0)
        // soften out and return
        .to(q(".h-bar, .h-line, .h-dot, .h-mark"), { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 2.6)
        .to(q(".h-cursor"), { x: 0, y: 0, duration: 0.4, ease: "power2.inOut" }, 2.55)
        .to(q(".h-synced"), { autoAlpha: 0, scale: 0.8, duration: 0.2, ease: "power2.in" }, 2.7)
        .to(q(".h-syncing"), { autoAlpha: 1, duration: 0.2 }, 2.8)
        .set(q(".h-bar"), { autoAlpha: 1 }, 2.99)
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
    <div ref={root} aria-hidden="true" className="relative h-[340px] overflow-hidden rounded-md bg-raised p-6">
      {/* sync header */}
      <div className="flex items-center justify-between">
        <p className="eyebrow text-ink-muted">Account history</p>
        <span className="grid text-caption [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:justify-self-end">
          <span className="h-syncing flex items-center gap-1.5 text-ink-muted">
            <span className="onb-spinner !size-3" />
            Syncing
          </span>
          <span className="h-synced flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-mint-text">
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
            Synced
          </span>
        </span>
      </div>

      {/* twelve months */}
      <div className="relative mt-4">
        <div className="flex h-16 items-end gap-1.5">
          {MONTHS.map((h, i) => (
            <span key={i} className="h-bar flex-1 origin-bottom rounded-[3px]" style={{ height: `${h}%`, backgroundColor: "rgb(55 59 139 / 0.28)" }} />
          ))}
        </div>
        <span className="h-scan absolute -bottom-2 left-0 h-0.5 w-full origin-left rounded-full bg-gradient-to-r from-indigo/40 to-gold" />
        <span className="h-mark absolute right-0 top-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-raised">Latest</span>
      </div>

      {/* account context, drawn from the history */}
      <ul className="mt-6 flex flex-col gap-3 border-t border-line pt-4 text-small">
        {LINES.map((l) => (
          <li key={l.label} className="grid grid-cols-[1fr_104px] items-center gap-4">
            <span>{l.label}</span>
            <svg viewBox="0 0 104 16" className="h-4 w-[104px] overflow-visible" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline className={`h-line ${l.tone}`} points={l.pts} />
              <circle className="h-dot" cx={l.pts.split(" ").at(-1)!.split(",")[0]} cy={l.pts.split(" ").at(-1)!.split(",")[1]} r="3" fill="#fdfdfe" stroke={l.tone === "stroke-gold" ? "#d0ae3e" : "#373b8b"} strokeWidth="1.75" />
            </svg>
          </li>
        ))}
      </ul>

      <svg className="h-cursor absolute bottom-6 right-6 z-20 size-6 drop-shadow-[0_4px_8px_rgb(35_36_46/0.3)]" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.5 1.6L9.5 19z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
