"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Published DigitalMantra agency figures (exact wording and order). Not product results. */
const STATS = [
  { value: "12+", label: "Years of Digital Transformation Experience" },
  { value: "400+", label: "Delighted Clients Worldwide" },
  { value: "1,200+", label: "Goal Hitting Campaigns" },
  { value: "30+", label: "Digital Minds at Work" },
];

/**
 * Editorial statistics strip: four equal columns on one shared baseline, separated by
 * thin vertical rules. No cards, lines or ornaments. Figures count up once.
 */
export function Stats() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const text = el.dataset.count ?? "";
          const m = text.match(/^([\d,]+)(.*)$/);
          if (!m) return;
          const target = parseInt(m[1].replace(/,/g, ""), 10);
          const obj = { v: 0 };
          el.textContent = `0${m[2]}`;
          gsap.to(obj, {
            v: target,
            duration: 1.4,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
            onUpdate: () => {
              el.textContent = Math.round(obj.v).toLocaleString("en-US") + m[2];
            },
            onComplete: () => {
              el.textContent = text;
            },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="credentials" aria-labelledby="stats-title" className="stats-band">
      <div className="wrap">
        <h2 id="stats-title" className="sr-only">
          Agency track record
        </h2>
        <dl className="mx-auto grid max-w-content grid-cols-2 gap-y-12 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.value}
              className={`flex flex-col items-center px-4 text-center sm:px-6 ${i % 2 ? "border-l border-ink/10" : i === 2 ? "lg:border-l lg:border-ink/10" : ""}`}
            >
              <dd data-count={s.value} aria-label={s.value} className="order-1 text-h1 tabular-nums text-indigo-deep">
                {s.value}
              </dd>
              <dt className="order-2 mt-4 max-w-56 text-small text-ink-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mx-auto mt-12 max-w-content text-caption text-ink-muted">Agency figures, not product performance.</p>
      </div>
    </section>
  );
}
