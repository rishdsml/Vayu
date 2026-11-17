"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { NoiseGradient } from "@/components/NoiseGradient";
import { HERO_GRADIENT, SIGNUP_URL } from "@/lib/site";
import { cssPx, cssDeg, MOTION } from "@/lib/tokens";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Scroll choreography (DESIGN_RULES.md §7), one scrubbed timeline (0 → 1):
 *   STAGE   0.00–0.28  flat frame grows from inset card to full-bleed (scale + radius only)
 *   SCREEN  0.30–0.86  copy recedes; the tilted product screen rises, stands up and scales
 *                      until it fills the entire viewport: "entering the product"
 *   HOLD    0.86–1.00
 * Layers never share a transform:
 *   frame (y, scale, radius) › copy (y, scale, opacity, blur)
 *   frame › stage › mover (y, scale; owns perspective) › tilt (rotateX) › window (radius, chrome)
 * All geometry comes from CSS tokens in globals.css (:root).
 */
// The zoom completes at 0.84; 0.84–1.00 is a HOLD where the video stays full screen for about
// a scroll (the nav steps aside while idle), then the page moves on to the next sections.
const PHASE = { stage: [0, 0.28], screen: [0.3, 0.84] } as const;
const ZOOM_MEDIA = "(min-width: 641px) and (prefers-reduced-motion: no-preference)";

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(ZOOM_MEDIA, () => {
        // Geometry from tokens; offset* ignores transforms, so it is the untransformed layout.
        const frameTop = () => cssPx("--nav-clear");
        const frameScale = () => {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const byH = (vh - frameTop() - cssPx("--frame-bottom")) / vh;
          const byW = (vw - cssPx("--frame-side") * 2) / vw;
          return Math.min(byH, byW);
        };
        const screenStartWidth = () => {
          const probe = getComputedStyle(document.documentElement).getPropertyValue("--container-screen");
          return parseFloat(probe) || 864;
        };
        const screenScale = () => Math.min(1, screenStartWidth() / window.innerWidth);
        const screenY = () => {
          const c = copy.current;
          return c ? c.offsetTop + c.offsetHeight + cssPx("--screen-gap") : 560;
        };
        const radius = cssPx("--radius-lg");

        const [s0, s1] = PHASE.stage;
        const [c0, c1] = PHASE.screen;
        const span = c1 - c0;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: MOTION.scrub, invalidateOnRefresh: true },
        });

        // 1. STAGE: flat frame, inset card → full-bleed
        tl.fromTo(
          frame.current,
          { y: frameTop, scale: frameScale, borderRadius: () => cssPx("--radius-frame") / frameScale() },
          { y: 0, scale: 1, borderRadius: 0, ease: MOTION.easeScrub, duration: s1 - s0 },
          s0,
        );

        // 2. SCREEN: copy recedes; the camera moves into the dashboard until it fills the viewport
        tl.to(copy.current, { autoAlpha: 0, y: -96, scale: 0.94, filter: "blur(6px)", ease: "power1.in", duration: span * 0.55 }, c0)
          .fromTo(mover.current, { y: screenY, scale: screenScale }, { y: 0, scale: 1, ease: "power2.inOut", duration: span }, c0)
          .fromTo(tilt.current, { rotationX: () => cssDeg("--screen-tilt") }, { rotationX: 0, ease: "power2.inOut", duration: span * 0.9 }, c0)
          // at full size the window loses its corners and its chrome clears the floating nav
          .fromTo(screen.current, { borderRadius: radius / screenScale() }, { borderRadius: 0, ease: "power2.in", duration: span * 0.4 }, c1 - span * 0.4)
          .fromTo(chrome.current, { height: 0 }, { height: () => cssPx("--nav-clear") - 16, ease: "power2.in", duration: span * 0.4 }, c1 - span * 0.4)
          .to({}, { duration: 1 - c1 }); // HOLD: full screen, nothing moves

        // Tell the nav when the screen is resting at full size (it fades until the next interaction)
        let full = false;
        const announce = (v: boolean) => {
          if (v === full) return;
          full = v;
          window.dispatchEvent(new CustomEvent("hero-full", { detail: v }));
        };
        // Full = anywhere in the HOLD (zoom complete, page not yet moving). ScrollTrigger treats the
        // exact end as "left", so this reads the scroll position rather than isActive/progress.
        const check = (self: ScrollTrigger) => {
          const y = self.scroll();
          const holdStart = self.start + (self.end - self.start) * (c1 - 0.01);
          announce(y >= holdStart && y <= self.end + 2);
        };
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          onUpdate: check,
          onLeave: check,
          onLeaveBack: check,
          onRefresh: check,
        });
        return () => announce(false);
      });


      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="top" ref={root} aria-labelledby="hero-title" className="hero-zoom relative">
      <div className="hero-pin">
        <div ref={frame} className="hero-frame bg-indigo">
          <NoiseGradient
            palette={HERO_GRADIENT}
            distortion={0.8}
            deepAmount={0.95}
            accentAmount={0.45}
            calm={{ x: 0.5, y: 0.34, radius: 0.5, amount: 0.7 }}
            pointer={0.6}
            grain={0.85}
            className="absolute inset-0"
          />

          <div ref={copy} className="relative flex flex-col items-center px-6 pt-hero-top text-center">
            <h1 id="hero-title" className="max-w-headline text-balance text-display text-ink">
              <span className="sm:block">The Intelligence Layer</span> <span className="sm:block">for Google Ads.</span>
            </h1>

            <p className="mt-6 max-w-prose text-balance text-lede text-ink/70">
              Specialised agents follow what is changing in your account, investigate why it changed and bring forward what
              needs your attention.
            </p>

            <div className="mt-10">
              <a href={SIGNUP_URL} className="btn btn-primary btn-lg">
                Sign Up
              </a>
            </div>
          </div>

          {/* The product screen: a separate physical object on the gradient stage */}
          <div className="hero-stage">
            <div ref={mover} className="hero-screen">
              <div ref={tilt} className="hero-tilt">
                <ProductWindow windowRef={screen} chromeRef={chrome} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The product screen: the dashboard walkthrough film plays inside the hero's window.
 * It restarts from the beginning each time the screen comes into view (scrolling down to
 * the page or back up to the hero) and pauses when it leaves. Reduced motion: the poster.
 */
function ProductWindow({
  windowRef,
  chromeRef,
}: {
  windowRef: React.Ref<HTMLDivElement>;
  chromeRef: React.Ref<HTMLDivElement>;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          v.currentTime = 0;
          v.play().catch(() => {}); // autoplay can be refused; the poster stays
        } else {
          v.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    // The window takes the film's own ground colour, so the strip kept clear for the nav blends in
    <div ref={windowRef} className="ui-window flex flex-col overflow-hidden !bg-[#edf1f7]" aria-hidden="true">
      {/* grows to the nav's height once the screen fills the viewport */}
      <div ref={chromeRef} className="h-0 shrink-0" />
      <video
        ref={video}
        className="block aspect-video min-h-0 w-full flex-1 bg-[#edf1f7] object-cover object-top"
        src="/media/dashboard-walkthrough.mp4"
        poster="/media/dashboard-walkthrough-poster.jpg"
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        tabIndex={-1}
      />
    </div>
  );
}
