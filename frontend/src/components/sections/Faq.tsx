"use client";

import { useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * FAQ. Answers follow the product documentation (sections 1–4 and the landing-page
 * addendum). Nothing here claims certifications, retention policies, integrations,
 * guaranteed timings or automatic campaign changes.
 */
const FAQS: { q: string; a: string[] }[] = [
  {
    q: "What does the product actually do?",
    a: [
      "It is an intelligence layer for Google Ads. It brings your account data into one structured database, analyses it with a fixed library of analytical queries, and uses specialised agents to show what changed, what is likely behind it and what needs your attention.",
      "You see the results in a dashboard, can ask follow-up questions through an AI assistant, and receive scheduled updates on WhatsApp.",
    ],
  },
  {
    q: "How do I get started?",
    a: [
      "Sign up, then connect your Google account through Google's own sign-in (OAuth). Choose the Google Ads account you want analysed by its Customer ID, and pick how much history to bring in, for example the last 30 days, 90 days, 6 months or a year.",
    ],
  },
  {
    q: "What happens after I connect, and how long does it take?",
    a: [
      "The platform retrieves your advertising data, cleans it and stores it in a structured form, with a processing screen showing progress. When it finishes you get a short account summary, such as your total and active campaigns, and your dashboard opens.",
      "The first sync is expected to take around two to three minutes. That is an estimate, not a fixed limit: the dashboard opens once processing has actually finished.",
    ],
  },
  {
    q: "What does the Reporting Agent look at?",
    a: [
      "It reads performance through five analytical shapes: trend, threshold, comparison, state change and concentration. It applies them across the account, its campaigns and ad groups, and brings the findings together into one view of what is changing, including anomalies and emerging problems worth a closer look.",
    ],
  },
  {
    q: "How does the Diagnosis Agent work out why performance changed?",
    a: [
      "It starts from a specific change, such as ROAS falling in one campaign, and works through it with structured SQL queries connected by decision graphs. Each result decides which check comes next, across campaigns and ad groups, bidding, targeting, creatives and measurement.",
      "The queries come from a controlled library rather than being invented on the fly. What you get is the likely cause, the evidence behind it and a recommended next step.",
    ],
  },
  {
    q: "What does the Night Agent monitor?",
    a: [
      "The Night Agent analyses your account on a schedule, looking for significant developments, problems and opportunities. When something shifts, it draws on the Reporting and Diagnosis capabilities to understand it before reporting back.",
    ],
  },
  {
    q: "How do the WhatsApp reports work?",
    a: [
      "The Night Agent turns its findings into a concise update and sends it to WhatsApp on a schedule. Updates cover the developments, problems and opportunities worth your attention, so you stay informed without opening a dashboard to check.",
    ],
  },
  {
    q: "Will it make changes to my campaigns?",
    a: ["No. It surfaces findings and recommends next steps. Any change to your Google Ads account is yours to make."],
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  const root = useRef<HTMLElement>(null);

  // Heading and rows rise in once as the section arrives (transform/opacity, staggered).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-faq-reveal]", {
          opacity: 0,
          y: 24,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.06,
          scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="faq" aria-labelledby="faq-title" className="section">
      <div className="wrap">
        <header className="mx-auto max-w-headline text-center">
          <h2 id="faq-title" data-faq-reveal className="text-balance text-h1">
            Questions, answered.
          </h2>
          <p data-faq-reveal className="mx-auto mt-6 max-w-prose text-balance text-lede text-ink-muted">
            How the agents work, what connecting an account involves, and what the product will and won&rsquo;t do.
          </p>
        </header>

        <div className="mx-auto mt-16 flex max-w-faq flex-col gap-4">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const btn = `${base}-q${i}`;
            const panel = `${base}-a${i}`;
            return (
              <div key={item.q} data-faq-reveal className="faq-item" data-open={isOpen}>
                <h3>
                  <button
                    id={btn}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="faq-q flex w-full items-center gap-6 rounded-lg px-6 py-6 text-left sm:px-8"
                  >
                    <span className="flex-1 text-h3">{item.q}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="faq-chevron size-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6l5 5 5-5" />
                    </svg>
                  </button>
                </h3>
                <div id={panel} role="region" aria-labelledby={btn} className="faq-a" inert={!isOpen}>
                  <div className="overflow-hidden">
                    <div className="faq-a-inner flex max-w-prose flex-col gap-4 px-6 pb-8 text-body text-ink-muted sm:px-8">
                      {item.a.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
