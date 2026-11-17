"use client";

import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from "react";

/** True when the dashboard is rendered inside the product film: scroll reveals are off
 *  (the film's camera does the presenting) and content shows immediately. */
export const FilmMode = createContext(false);
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Dashboard motion (GSAP). Content renders fully without JS; motion only runs under
 * prefers-reduced-motion: no-preference and is reverted on unmount via useGSAP.
 *
 * Markup hooks:
 *  [data-reveal]        card enters once: fade + 16px rise, batched into a stagger
 *  [data-sev]           severity badge inside a revealed card: brief settle after the card
 *  [data-count]         number counts up once from 0 (data-format: inr | inr2 | int | pct)
 *  [data-bar]           bar grows from its baseline once (scaleX from 0)
 */
export const REDUCE = "(prefers-reduced-motion: reduce)";
const NO_REDUCE = "(prefers-reduced-motion: no-preference)";

export function formatNum(v: number, f: string) {
  if (f === "inr") return "₹" + Math.round(v).toLocaleString("en-IN");
  if (f === "inr2") return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (f === "pct") return `${v.toFixed(1)}%`;
  return Math.round(v).toLocaleString("en-IN");
}

export function useDashMotion(scope: RefObject<HTMLElement | null>) {
  const film = useContext(FilmMode);
  useGSAP(
    () => {
      if (film) return;
      const mm = gsap.matchMedia();
      mm.add(NO_REDUCE, () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        gsap.set(cards, { autoAlpha: 0, y: 16 });
        ScrollTrigger.batch(cards, {
          start: "top 94%",
          once: true,
          onEnter: (batch) => {
            const tl = gsap.timeline();
            tl.to(batch, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, clearProps: "transform" });
            const sev = batch.flatMap((b) => [...b.querySelectorAll("[data-sev]")]);
            if (sev.length) tl.from(sev, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: "back.out(2)", stagger: 0.05 }, 0.25);
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const f = el.dataset.format ?? "int";
          const o = { v: 0 };
          el.textContent = formatNum(0, f);
          gsap.to(o, {
            v: target,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
            onUpdate: () => (el.textContent = formatNum(o.v, f)),
            onComplete: () => (el.textContent = formatNum(target, f)),
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-bar]").forEach((el) => {
          gsap.from(el, { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 94%", once: true } });
        });
      });
      return () => mm.revert();
    },
    { scope },
  );
}

/** A number that tweens from its previous value when it changes (no abrupt swap). */
export function AnimatedNumber({ value, format }: { value: number; format: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const from = prev.current;
      prev.current = value;
      if (from === value || window.matchMedia(REDUCE).matches) {
        el.textContent = formatNum(value, format);
        return;
      }
      const o = { v: from };
      gsap.to(o, { v: value, duration: 0.5, ease: "power2.out", onUpdate: () => (el.textContent = formatNum(o.v, format)) });
    },
    { dependencies: [value, format] },
  );
  return <span ref={ref}>{formatNum(value, format)}</span>;
}

/** Height collapse that opens and closes smoothly, keeping content mounted while closing. */
export function Collapse({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  const [mounted, setMounted] = useState(open);
  const ref = useRef<HTMLDivElement>(null);
  if (open && !mounted) setMounted(true);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const d = window.matchMedia(REDUCE).matches ? 0 : 1;
      if (open) gsap.fromTo(el, { height: 0, autoAlpha: 0 }, { height: "auto", autoAlpha: 1, duration: 0.45 * d, ease: "power3.out", clearProps: "height" });
      else gsap.to(el, { height: 0, autoAlpha: 0, duration: 0.3 * d, ease: "power2.in", onComplete: () => setMounted(false) });
    },
    { dependencies: [open, mounted] },
  );

  return mounted ? (
    <div ref={ref} id={id} className="overflow-hidden">
      {children}
    </div>
  ) : null;
}
