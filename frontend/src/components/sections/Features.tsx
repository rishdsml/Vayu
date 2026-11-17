"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { TraceLoop } from "../bento/TraceLoop";
import { AskLoop } from "../bento/AskLoop";
import { HistoryLoop } from "../bento/HistoryLoop";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Feature bento: only capabilities the three agents do not already communicate
 * (audit in DESIGN_RULES.md). Sources: product documentation §1.3, §2.2, §2.4, §6.3–6.6.
 *   A. AI Assistant: ask your own questions, follow-ups keep their context
 *   B. Historical account context: built after the first sync, referenced by every agent
 *   C. Grounded analysis: agents choose from a controlled library of analytical operations
 * Interfaces are illustrative (noted in the footer).
 */
export function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const st = { trigger: root.current, start: "top 70%", once: true };
        gsap.from("[data-bento-card]", { opacity: 0, y: 32, duration: 0.9, ease: "power3.out", stagger: 0.1, scrollTrigger: st });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="features" aria-labelledby="features-title" className="section">
      <div className="wrap">
        <header className="mx-auto max-w-headline text-center">
          <h2 id="features-title" className="text-balance text-h2">
            More ways to work with your Google Ads data.
          </h2>
          <p className="mx-auto mt-6 max-w-prose text-balance text-lede text-ink-muted">
            Explore your account, ask questions, understand campaign performance and stay on top of what needs your attention.
          </p>
        </header>

        <div className="mt-16 grid gap-4 sm:gap-6 lg:grid-cols-12">
          {/* A. AI Assistant: the large card */}
          <article data-bento-card className="bento-card flex flex-col lg:col-span-7">
            <AskLoop />
            <h3 className="pt-6 text-h3">Ask your account a question.</h3>
            <p className="mt-2 max-w-md text-small text-ink-muted">
              Compare periods, chase an anomaly or ask for a recommendation in plain language. Follow-ups keep their context,
              so &ldquo;its&rdquo; still means Campaign A.
            </p>
          </article>

          {/* B. Historical account context */}
          <article data-bento-card className="bento-card flex flex-col lg:col-span-5">
            <HistoryLoop />
            <h3 className="mt-auto pt-6 text-h3">It starts from your history.</h3>
            <p className="mt-2 max-w-md text-small text-ink-muted">
              After the first sync, your account&rsquo;s history is summarised into a context the agents and assistant refer
              back to, so new changes are judged against what is normal for you.
            </p>
          </article>

          {/* C. Grounded analysis: a wide card across the second row, text left, UI right */}
          <article data-bento-card className="bento-card grid gap-6 lg:col-span-12 lg:grid-cols-12 lg:items-center lg:gap-8">
            <div className="lg:order-2 lg:col-span-6 lg:col-start-7">
              <TraceLoop />
            </div>
            <div className="lg:order-1 lg:col-span-5">
              <h3 className="text-h3">Answers you can trace.</h3>
              <p className="mt-2 max-w-md text-small text-ink-muted">
                The agents don&rsquo;t write their own database queries. They choose from a controlled library of analytical
                operations, so every finding rests on your actual account data.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
