"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Bento loop · "Ask your account a question" (3s). The cursor picks a suggested question,
 * it drops into the composer, Send is pressed, the question posts and a compact answer
 * expands with two bars comparing spend across the periods (supplied example figures:
 * ₹15,190 this period, ~₹31,000 previous). Then the thread clears and the cursor returns.
 * Runs only while visible; reduced motion shows the answered state, still.
 */
export function AskLoop({ record = false }: { record?: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce && !record) {
        gsap.set(q(".a-q, .a-ans"), { autoAlpha: 1 });
        gsap.set(q(".a-cursor, .a-token"), { autoAlpha: 0 });
        return;
      }

      // Cursor travel is measured from the layout, so it lands exactly on its targets
      const box = root.current!.getBoundingClientRect();
      const cur = q(".a-cursor")[0].getBoundingClientRect();
      const tip = { x: cur.left - box.left + 5, y: cur.top - box.top + 3 };
      const to = (sel: string) => {
        const r = q(sel)[0].getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2 - tip.x, y: r.top - box.top + r.height / 2 - tip.y };
      };
      const chip = to(".a-chip-0");
      const send = to(".a-send");

      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power3.out" } });
      tl.set(q(".a-q, .a-ans"), { autoAlpha: 0 }, 0)
        .set(q(".a-token"), { autoAlpha: 0, y: 0, x: 0, scale: 1 }, 0)
        .set(q(".a-ph"), { autoAlpha: 1 }, 0)
        .set(q(".a-bar"), { scaleX: 0 }, 0)
        .set(q(".a-cursor"), { x: 0, y: 0, scale: 1 }, 0)
        // pick a suggestion
        .to(q(".a-cursor"), { x: chip.x, y: chip.y, duration: 0.5, ease: "power2.inOut" }, 0.05)
        .to(q(".a-chip-0"), { backgroundColor: "rgb(55 59 139 / 0.10)", duration: 0.15 }, 0.45)
        .to([q(".a-chip-0"), q(".a-cursor")], { scale: 0.92, duration: 0.08, ease: "power2.in" }, 0.58)
        .to([q(".a-chip-0"), q(".a-cursor")], { scale: 1, duration: 0.22, ease: "back.out(3)" }, 0.66)
        // it drops into the composer
        .to(q(".a-ph"), { autoAlpha: 0, duration: 0.15 }, 0.7)
        .fromTo(q(".a-token"), { autoAlpha: 0, y: -22, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35 }, 0.7)
        .to(q(".a-chip-0"), { backgroundColor: "rgb(55 59 139 / 0)", duration: 0.2 }, 0.8)
        // send
        .to(q(".a-cursor"), { x: send.x, y: send.y, duration: 0.35, ease: "power2.inOut" }, 0.85)
        .to([q(".a-send"), q(".a-cursor")], { scale: 0.88, duration: 0.08, ease: "power2.in" }, 1.22)
        .to([q(".a-send"), q(".a-cursor")], { scale: 1, duration: 0.22, ease: "back.out(3)" }, 1.3)
        .to(q(".a-token"), { autoAlpha: 0, y: -10, duration: 0.15, ease: "power2.in" }, 1.3)
        .to(q(".a-ph"), { autoAlpha: 1, duration: 0.25 }, 1.55)
        .fromTo(q(".a-q"), { autoAlpha: 0, y: 16, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35 }, 1.35)
        // answer expands with the comparison
        .fromTo(q(".a-ans"), { autoAlpha: 0, y: 12, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4 }, 1.6)
        .to(q(".a-bar"), { scaleX: 1, duration: 0.55, stagger: 0.12, ease: "power2.out" }, 1.75)
        .to(q(".a-cursor"), { x: send.x * 0.6, y: send.y * 0.4, duration: 0.6, ease: "power2.inOut" }, 1.7)
        // clear and return
        .to(q(".a-q, .a-ans"), { autoAlpha: 0, y: -10, duration: 0.3, ease: "power2.in", stagger: 0.05 }, 2.55)
        .to(q(".a-cursor"), { x: 0, y: 0, duration: 0.45, ease: "power2.inOut" }, 2.5)
        .to({}, { duration: 0.05 }, 2.95);

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
    <div ref={root} aria-hidden="true" className="relative flex h-[340px] flex-col overflow-hidden rounded-md bg-raised p-6">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <span className="text-small font-semibold">AI Assistant</span>
        <span className="badge bg-gold-soft text-gold-text">Context · SMS Lucknow</span>
      </div>

      {/* thread */}
      <div className="relative flex flex-1 flex-col justify-end gap-3 pb-4 pt-4 text-small">
        <p className="a-q ml-auto max-w-[75%] origin-bottom-right rounded-md rounded-br-xs bg-indigo px-4 py-2 text-raised">
          Compare spend with last week
        </p>
        <div className="a-ans w-[78%] origin-bottom-left rounded-md rounded-bl-xs bg-surface px-4 py-3">
          {[
            ["24 – 30 Aug", "~₹31,000", 1],
            ["31 Aug – 7 Sep", "₹15,190", 15190 / 31000],
          ].map(([k, v, w], i) => (
            <div key={k as string} className={i ? "mt-2" : ""}>
              <div className="flex justify-between text-caption">
                <span className="text-ink-muted">{k}</span>
                <span className="font-medium tabular-nums">{v}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised">
                <span className={`a-bar block h-full origin-left rounded-full ${i ? "bg-indigo" : "bg-ink/20"}`} style={{ width: `${(w as number) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* suggestions + composer */}
      <div className="flex gap-2">
        {["Compare periods", "Why did CPC rise?", "Top campaign"].map((s, i) => (
          <span key={s} className={`a-chip-${i} rounded-full px-3 py-1.5 text-caption shadow-[0_0_0_1px_var(--color-line)]`}>
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 rounded-md border border-line bg-bg px-4 py-2 text-small">
        <span className="relative flex-1">
          <span className="a-ph text-ink-muted">Ask about your account</span>
          <span className="a-token absolute inset-y-0 left-0 flex items-center">
            <span className="rounded-full bg-indigo/10 px-3 py-0.5 text-caption font-medium text-indigo-deep">Compare periods</span>
          </span>
        </span>
        <span className="a-send grid size-8 place-items-center rounded-sm bg-indigo text-raised">
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 13V3M4 7l4-4 4 4" />
          </svg>
        </span>
      </div>

      {/* cursor resting at the right edge */}
      <svg className="a-cursor absolute right-10 top-[44%] z-20 size-6 drop-shadow-[0_4px_8px_rgb(35_36_46/0.3)]" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.5 1.6L9.5 19z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
