"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { NoiseGradient } from "@/components/NoiseGradient";
import { CARD_GRADIENT, SIGNUP_URL } from "@/lib/site";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Final CTA: one contained card carrying the hero's animated noise gradient.
 * Its own NoiseGradient instance (own canvas + lifecycle; pauses off-screen).
 * A calm zone sits behind the copy so contrast holds while the field moves.
 */
export function Cta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The card settles into place as it arrives (scrubbed, so it reverses).
        gsap.fromTo(
          "[data-cta-card]",
          { y: 64, scale: 0.96 },
          { y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "top 35%", scrub: 0.6 } },
        );
        gsap.from("[data-cta-reveal]", {
          opacity: 0,
          y: 24,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: "[data-cta-card]", start: "top 65%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="signup" aria-labelledby="cta-title" className="pb-section">
      <div className="wrap">
        <div data-cta-card className="relative isolate overflow-hidden rounded-frame will-change-transform">
          <NoiseGradient
            palette={CARD_GRADIENT.palette}
            scale={CARD_GRADIENT.scale}
            distortion={CARD_GRADIENT.distortion}
            deepAmount={CARD_GRADIENT.deepAmount}
            accentAmount={CARD_GRADIENT.accentAmount}
            calm={{ x: 0.5, y: 0.44, radius: 0.42, amount: 0.75 }}
            pointer={0.5}
            grain={0.85}
            seed={7}
            className="absolute inset-0"
          />
          <div className="relative flex min-h-cta flex-col items-center justify-center px-6 py-24 text-center sm:px-12">
            <h2 id="cta-title" data-cta-reveal className="max-w-headline text-balance text-h1 text-ink">
              See what changed in your account, and why.
            </h2>
            <p data-cta-reveal className="mt-6 max-w-prose text-balance text-lede text-ink/70">
              Connect your Google Ads account and get your first findings once the initial sync is complete.
            </p>
            <div data-cta-reveal className="mt-10">
              <a href={SIGNUP_URL} className="btn btn-primary btn-lg">
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
