"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CAMPAIGNS } from "@/lib/dashboard-data";

gsap.registerPlugin(useGSAP);

/**
 * How it works · 01 loop (3s). The cursor presses Connect; a signal runs from DigitalMantra
 * to Google Ads, the button resolves to Connected and the account's campaigns appear
 * (the three example campaigns). Then it resets and the cursor returns.
 * Runs only while visible; reduced motion shows the connected state, still.
 */
function AdsMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FBBC04" d="M17.6 6.6 4.2 29.8a7 7 0 0 0 12.1 7L29.7 13.6a7 7 0 0 0-12.1-7Z" />
      <path fill="#4285F4" d="M30.4 6.6a7 7 0 0 0-12.1 7l13.4 23.2a7 7 0 0 0 12.1-7Z" />
      <circle cx="10.3" cy="33.3" r="7" fill="#34A853" />
    </svg>
  );
}

export function ConnectLoop({ record = false }: { record?: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce && !record) {
        gsap.set(q(".c-btn, .c-wait, .c-cursor, .c-pulse"), { autoAlpha: 0 });
        gsap.set(q(".c-done, .c-camp"), { autoAlpha: 1 });
        gsap.set(q(".c-line-on"), { scaleX: 1 });
        return;
      }

      const box = root.current!.getBoundingClientRect();
      const cur = q(".c-cursor")[0].getBoundingClientRect();
      const btn = q(".c-btn")[0].getBoundingClientRect();
      const hit = { x: btn.left - box.left + btn.width / 2 - (cur.left - box.left + 5), y: btn.top - box.top + btn.height / 2 - (cur.top - box.top + 3) };

      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "power3.out" } });
      tl.set(q(".c-btn"), { autoAlpha: 1, scale: 1 }, 0)
        .set(q(".c-wait, .c-done"), { autoAlpha: 0 }, 0)
        .set(q(".c-camp"), { autoAlpha: 0, y: 10 }, 0)
        .set(q(".c-line-on"), { scaleX: 0 }, 0)
        .set(q(".c-pulse"), { autoAlpha: 0, left: "0%" }, 0)
        .set(q(".c-node-ads"), { boxShadow: "0 0 0 0 rgb(52 168 83 / 0)" }, 0)
        .set(q(".c-cursor"), { x: 0, y: 0, scale: 1 }, 0)
        // press Connect
        .to(q(".c-cursor"), { x: hit.x, y: hit.y, duration: 0.5, ease: "power2.inOut" }, 0.05)
        .to([q(".c-btn"), q(".c-cursor")], { scale: 0.92, duration: 0.08, ease: "power2.in" }, 0.6)
        .to([q(".c-btn"), q(".c-cursor")], { scale: 1, duration: 0.2, ease: "back.out(3)" }, 0.68)
        .to(q(".c-btn"), { autoAlpha: 0, duration: 0.15 }, 0.78)
        .to(q(".c-wait"), { autoAlpha: 1, duration: 0.15 }, 0.82)
        // signal travels from DigitalMantra to Google Ads
        .to(q(".c-pulse"), { autoAlpha: 1, duration: 0.1 }, 0.85)
        .to(q(".c-pulse"), { left: "100%", duration: 0.55, ease: "power1.inOut" }, 0.85)
        .to(q(".c-line-on"), { scaleX: 1, duration: 0.55, ease: "power1.inOut" }, 0.85)
        .to(q(".c-pulse"), { autoAlpha: 0, duration: 0.1 }, 1.38)
        .to(q(".c-node-ads"), { boxShadow: "0 0 0 8px rgb(52 168 83 / 0.14)", duration: 0.25 }, 1.38)
        .to(q(".c-node-ads"), { boxShadow: "0 0 0 0 rgb(52 168 83 / 0)", duration: 0.5 }, 1.65)
        // resolved
        .to(q(".c-wait"), { autoAlpha: 0, duration: 0.12 }, 1.45)
        .fromTo(q(".c-done"), { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, 1.5)
        .to(q(".c-camp"), { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.1 }, 1.6)
        .to(q(".c-cursor"), { x: hit.x * 0.4, y: hit.y * 0.3, duration: 0.6, ease: "power2.inOut" }, 1.0)
        // reset
        .to(q(".c-camp, .c-done"), { autoAlpha: 0, duration: 0.25, ease: "power2.in" }, 2.55)
        .to(q(".c-line-on"), { scaleX: 0, transformOrigin: "100% 50%", duration: 0.3, ease: "power2.in" }, 2.55)
        .to(q(".c-btn"), { autoAlpha: 1, duration: 0.2 }, 2.75)
        .to(q(".c-cursor"), { x: 0, y: 0, duration: 0.4, ease: "power2.inOut" }, 2.55)
        .set(q(".c-line-on"), { transformOrigin: "0% 50%" }, 2.99)
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
      {/* connection: DigitalMantra ── Google Ads */}
      <div className="flex items-center justify-center gap-0 px-6">
        <span className="grid h-12 shrink-0 place-items-center rounded-xl bg-raised px-4 shadow-[0_0_0_1px_var(--color-line),0_8px_20px_-12px_rgb(43_46_112/0.4)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digitalmantra-logo.webp" alt="" className="h-6 w-auto" />
        </span>
        <span className="relative mx-3 h-px flex-1">
          <span className="absolute inset-0 border-t border-dashed border-ink/25" />
          <span className="c-line-on absolute inset-0 origin-left bg-gradient-to-r from-indigo to-[#34A853]" style={{ transform: "scaleX(0)" }} />
          <span className="c-pulse absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo shadow-[0_0_0_4px_rgb(55_59_139/0.15)] opacity-0" />
        </span>
        <span className="c-node-ads grid size-12 shrink-0 place-items-center rounded-xl bg-raised shadow-[0_0_0_1px_var(--color-line)]">
          <AdsMark className="size-7" />
        </span>
      </div>

      {/* account row */}
      <div className="mt-5 flex items-center gap-4 rounded-md bg-raised px-4 py-3 text-small shadow-[0_0_0_1px_var(--color-line)]">
        <AdsMark className="size-6 shrink-0" />
        <span className="flex-1">Google Ads account</span>
        <span className="grid [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:justify-self-end">
          <span className="c-btn btn btn-primary btn-sm">Connect</span>
          <span className="c-wait flex items-center gap-2 self-center text-caption text-ink-muted opacity-0">
            <span className="onb-spinner !size-3.5" />
            Connecting
          </span>
          <span className="c-done badge badge-stable self-center opacity-0">
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
            Connected
          </span>
        </span>
      </div>

      {/* campaigns found */}
      <div className="mt-3 flex flex-wrap gap-2">
        {CAMPAIGNS.map((c) => (
          <span key={c.id} className="c-camp flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-caption shadow-[0_0_0_1px_var(--color-line)] opacity-0">
            <span className="size-1.5 rounded-full bg-indigo" />
            {c.campaign_name}
          </span>
        ))}
      </div>

      <svg className="c-cursor absolute bottom-3 right-10 z-20 size-6 drop-shadow-[0_4px_8px_rgb(35_36_46/0.3)]" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.5 1.6L9.5 19z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
