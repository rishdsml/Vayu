"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PROBLEM_1 = ["Your", "conversions", "are", "down."];
const PROBLEM_2 = ["Now", "you", "need", "to", "figure", "out", "what", "went", "wrong."];

/**
 * Problem → solution (Story, beats 2–3), in normal document flow (no pinning).
 *
 *   problem   fills word by word as it arrives, holds the screen, then dims and lifts
 *   connector a 1px straight line under it draws downward (scaleY), head on a reading line
 *   solution  headline rises in as the line reaches it; the supporting line follows
 *
 * Every step is scrubbed by element position, so scrolling up reverses it exactly.
 * Only transform and opacity animate.
 */
export function Problem() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 1. Problem fills in as it rises into place…
        gsap.fromTo(
          "[data-word]",
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: { trigger: "[data-problem]", start: "top 85%", end: "center 55%", scrub: true },
          },
        );
        // …then steps back as the visitor moves on (container, so it never fights the fill).
        gsap.fromTo(
          "[data-problem]",
          { opacity: 1, y: 0 },
          {
            opacity: 0.12,
            y: -48,
            ease: "power1.in",
            scrollTrigger: { trigger: "[data-problem]", start: "center 38%", end: "bottom top", scrub: 0.4 },
          },
        );
        // 2. Connector draws downward; its tip follows a reading line 60% down the viewport.
        gsap.fromTo(
          "[data-connector]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-connector]", start: "top 60%", end: "bottom 60%", scrub: 0.3 } },
        );
        // 3. Solution headline enters as the line arrives; the supporting line follows.
        gsap.fromTo(
          "[data-solution-title]",
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            scrollTrigger: { trigger: "[data-solution-title]", start: "top 72%", end: "top 48%", scrub: 0.4 },
          },
        );
        gsap.fromTo(
          "[data-solution-line]",
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            scrollTrigger: { trigger: "[data-solution-line]", start: "top 70%", end: "top 50%", scrub: 0.4 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* Problem: alone on screen when centred (the stats sit a full half-screen above) */}
      <section id="problem" aria-labelledby="problem-title" className="story-bg-statement pt-problem">
        <div className="wrap flex flex-col items-center">
          <h2 id="problem-title" data-problem className="max-w-content text-balance text-center text-h1 will-change-transform">
            {PROBLEM_1.map((w) => (
              <span key={w}>
                <span data-word className="inline-block">
                  {w}
                </span>{" "}
              </span>
            ))}
            {PROBLEM_2.map((w, i) => (
              <span key={w}>
                <span data-word className="inline-block text-indigo">
                  {w}
                </span>
                {i < PROBLEM_2.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>

          {/* The connector: thin, straight, vertical. Drawn by scroll (scaleY from the top). */}
          <span
            data-connector
            aria-hidden="true"
            className="mt-12 block h-connector w-px origin-top bg-gradient-to-b from-indigo/50 via-gold/70 to-gold/0"
          />
        </div>
      </section>

      {/* Solution: introduces the product before the agents take over */}
      <section id="product" aria-labelledby="solution-title" className="story-bg-intro pb-section pt-8">
        <div className="wrap flex flex-col items-center text-center">
          <h2 id="solution-title" data-solution-title className="max-w-headline text-balance text-h2">
            Meet a smarter way to manage your Google Ads.
          </h2>
          <p data-solution-line className="mt-6 max-w-prose text-balance text-lede text-ink-muted">
            Understand performance changes, uncover what&rsquo;s driving them, and know what needs your attention.
          </p>
        </div>
      </section>
    </div>
  );
}
