"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * How it works · 02 loop (3s). The Reporting Agent scans the account's trend and spots a
 * change; the Diagnosis Agent takes it and runs its checks across levers, which resolve one
 * by one. No cursor: the agents do the work. Trend shape is illustrative; lever results match
 * the example account. Runs only while visible; reduced motion shows the resolved state.
 */
const CHECKS = [
  { lever: "Budget & Bidding", sev: "attention" },
  { lever: "Targeting", sev: null },
  { lever: "Measurement", sev: "attention" },
] as const;
const PTS = "4,40 30,38 56,39 82,36 108,37 134,22 160,14 186,16 212,12";

export function AnalyseLoop({ record = false }: { record?: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce && !record) {
        gsap.set(q(".n-scan"), { autoAlpha: 0 });
        return;
      }

      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power3.out" } });
      tl.set(q(".n-agent-0"), { backgroundColor: "#fdfdfe", color: "#23242e" }, 0)
        .set(q(".n-agent-1"), { backgroundColor: "rgb(253 253 254 / 0)", color: "rgb(35 36 46 / 0.45)" }, 0)
        .set(q(".n-reveal"), { clipPath: "inset(0% 100% 0% 0%)" }, 0)
        .set(q(".n-scan"), { left: "0%", autoAlpha: 0 }, 0)
        .to(q(".n-scan"), { autoAlpha: 1, duration: 0.15, ease: "none" }, 0)
        .set(q(".n-mark"), { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%" }, 0)
        .set(q(".n-bar"), { scaleX: 0 }, 0)
        .set(q(".n-res"), { autoAlpha: 0, x: -6 }, 0)
        // Reporting scans the trend
        .to(q(".n-scan"), { left: "100%", duration: 1.0, ease: "power1.inOut" }, 0.05)
        .to(q(".n-reveal"), { clipPath: "inset(0% 0% 0% 0%)", duration: 1.0, ease: "power1.inOut" }, 0.05)
        .to(q(".n-mark"), { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(3)" }, 0.68)
        .to(q(".n-scan"), { autoAlpha: 0, duration: 0.15 }, 1.05)
        // hand-off to Diagnosis
        .to(q(".n-agent-0"), { backgroundColor: "rgb(253 253 254 / 0)", color: "rgb(35 36 46 / 0.45)", duration: 0.25 }, 1.1)
        .to(q(".n-agent-1"), { backgroundColor: "#fdfdfe", color: "#23242e", duration: 0.25 }, 1.1);
      // checks fill and resolve
      CHECKS.forEach((_, i) => {
        const at = 1.2 + i * 0.28;
        tl.to(q(`.n-bar-${i}`), { scaleX: 1, duration: 0.4, ease: "power2.inOut" }, at).to(q(`.n-res-${i}`), { autoAlpha: 1, x: 0, duration: 0.25 }, at + 0.35);
      });
      // reset
      tl.to(q(".n-res, .n-mark"), { autoAlpha: 0, duration: 0.25, ease: "power2.in" }, 2.6)
        .to(q(".n-bar"), { scaleX: 0, transformOrigin: "100% 50%", duration: 0.3, ease: "power2.in" }, 2.6)
        .to(q(".n-reveal"), { clipPath: "inset(0% 0% 0% 100%)", duration: 0.3, ease: "power2.in" }, 2.6)
        .to(q(".n-agent-1"), { backgroundColor: "rgb(253 253 254 / 0)", color: "rgb(35 36 46 / 0.45)", duration: 0.25 }, 2.7)
        .to(q(".n-agent-0"), { backgroundColor: "#fdfdfe", color: "#23242e", duration: 0.25 }, 2.7)
        .set(q(".n-bar"), { transformOrigin: "0% 50%" }, 2.99)
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

  const agent = (cls: string, label: string, glyph: React.ReactNode) => (
    <span className={`${cls} flex items-center gap-2 rounded-full bg-raised px-3 py-1.5 text-caption font-medium shadow-[0_0_0_1px_var(--color-line)]`}>
      <span className="grid size-5 place-items-center rounded-[30%] bg-indigo text-raised">
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {glyph}
        </svg>
      </span>
      {label}
    </span>
  );

  return (
    <div ref={root} aria-hidden="true" className="relative h-[232px] overflow-hidden rounded-md bg-surface p-5">
      <div className="flex gap-2">
        {agent("n-agent-0", "Reporting Agent", <polyline points="3,15 8,10 12,12 17,6 21,8" />)}
        {agent(
          "n-agent-1",
          "Diagnosis Agent",
          <>
            <circle cx="10.5" cy="10.5" r="5.5" />
            <path d="m15 15 5 5" />
          </>,
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1.1fr_1fr] gap-3">
        {/* trend being scanned */}
        <div className="relative rounded-md bg-raised p-3 shadow-[0_0_0_1px_var(--color-line)]">
          <svg viewBox="0 0 216 48" className="h-[120px] w-full" preserveAspectRatio="none" fill="none">
            {[12, 24, 36].map((y) => (
              <line key={y} x1="0" x2="216" y1={y} y2={y} stroke="rgb(35 36 46 / 0.06)" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {/* plot overlay = the svg's box: line revealed by clip-path, scan, change marker */}
          <div className="absolute inset-3">
            <div className="n-reveal absolute inset-0">
              <svg viewBox="0 0 216 48" className="size-full" preserveAspectRatio="none" fill="none">
                <polyline points={PTS} stroke="#373b8b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <span className="n-scan absolute inset-y-0 w-px bg-gradient-to-b from-indigo/0 via-indigo to-indigo/0" />
            <span
              className="n-mark absolute -ml-1.5 -mt-1.5 size-3 rounded-full border-2 border-raised bg-gold shadow-[0_0_0_4px_rgb(208_174_62/0.25)]"
              style={{ left: `${(134 / 216) * 100}%`, top: `${(22 / 48) * 100}%` }}
            />
          </div>
        </div>

        {/* diagnosis checks */}
        <div className="flex flex-col justify-center gap-3 rounded-md bg-raised p-3 shadow-[0_0_0_1px_var(--color-line)]">
          {CHECKS.map((c, i) => (
            <div key={c.lever}>
              <div className="flex items-center justify-between text-caption">
                <span className="font-medium">{c.lever}</span>
                <span className={`n-res n-res-${i}`}>
                  {c.sev ? <span className="badge badge-attention !py-0">Attention</span> : <span className="text-ink-muted">No findings</span>}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                <span className={`n-bar n-bar-${i} block h-full origin-left rounded-full ${c.sev ? "bg-gold" : "bg-indigo/40"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
