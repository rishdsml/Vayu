"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ConnectLoop } from "../bento/ConnectLoop";
import { AnalyseLoop } from "../bento/AnalyseLoop";
import { InsightLoop } from "../bento/InsightLoop";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * How it works, following Fruitful's vertical timeline: a sticky heading on the left,
 * a vertical line with numbered nodes in the middle, step panels on the right.
 * The line fills with scroll; each node and panel activates as it reaches the
 * reading line (60% of the viewport). Scrubbed and toggled, so it reverses on scroll up.
 */
const STAGES = [
  {
    n: "01",
    title: "Connect your Google Ads account.",
    body: "Give the platform access to your Google Ads account so it can start understanding your performance.",
    Preview: ConnectLoop,
  },
  {
    n: "02",
    title: "We analyse your performance.",
    body: "Our specialised agents examine your account, spot meaningful changes and investigate what is driving them.",
    Preview: AnalyseLoop,
  },
  {
    n: "03",
    title: "Get insights that matter.",
    body: "See what changed, why it happened and what deserves your attention, with proactive updates when relevant.",
    Preview: InsightLoop,
  },
] as const;

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const steps = q<HTMLElement>("[data-step]");
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-fill]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-steps]", start: "top 60%", end: "bottom 60%", scrub: 0.4 } },
        );
        steps.forEach((s) =>
          ScrollTrigger.create({
            trigger: s,
            start: "top 60%",
            onEnter: () => (s.dataset.active = "true"),
            onLeaveBack: () => (s.dataset.active = "false"),
          }),
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        steps.forEach((s) => (s.dataset.active = "true"));
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="how-it-works" aria-labelledby="hiw-title" className="section">
      <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
        <header className="lg:col-span-5">
          <div className="lg:sticky lg:top-40">
            <h2 id="hiw-title" className="text-h2">
              How it works.
              <span className="block text-ink-muted">Making sense of your ad performance.</span>
            </h2>
          </div>
        </header>

        <ol data-steps className="relative flex flex-col gap-12 lg:col-span-7 lg:gap-16">
          {/* Same thin connector as problem → solution (1px, indigo → gold, drawn by scaleY) */}
          <span
            aria-hidden="true"
            data-fill
            className="absolute bottom-0 left-0 top-0 w-px origin-top bg-gradient-to-b from-indigo/50 via-gold/70 to-gold/0"
          />
          {STAGES.map(({ n, title, body, Preview }) => (
            <li key={n} data-step data-active="false" className="hiw-step relative pl-8 lg:pl-16">
              <div className="hiw-panel">
                <p className="eyebrow mb-6 text-ink-muted">{n}</p>
                <div aria-hidden="true">
                  <Preview />
                </div>
                <h3 className="mt-8 text-h3">{title}</h3>
                <p className="mt-2 max-w-md text-body text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
