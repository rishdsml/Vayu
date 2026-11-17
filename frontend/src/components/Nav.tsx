"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { NAV_LINKS, SIGNUP_URL } from "@/lib/site";

gsap.registerPlugin(ScrollToPlugin);

/** Smooth in-page scroll that lands each section just below the fixed nav bar. */
function scrollToHash(e: MouseEvent<HTMLAnchorElement>) {
  const hash = e.currentTarget.getAttribute("href") ?? "";
  const el = hash === "#top" ? document.body : document.querySelector<HTMLElement>(hash);
  if (!el || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  // The nav's real bottom edge (top inset + bar height)
  const navH = document.querySelector(".nav-bar")?.getBoundingClientRect().bottom ?? 80;
  const y = hash === "#top" ? 0 : el.getBoundingClientRect().top + window.scrollY - navH;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dist = Math.abs(y - window.scrollY);
  gsap.to(window, {
    scrollTo: { y, autoKill: true },
    duration: reduce ? 0 : gsap.utils.clamp(0.6, 1.4, dist / 3500),
    ease: "power3.inOut",
    overwrite: true,
  });
  history.pushState(null, "", hash);
  // Move keyboard focus to the section, as a native anchor jump would
  if (hash !== "#top") {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}

/** Flat on the page at the top; morphs into an iOS-style glass pill once scrolled (.nav-bar). */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While the hero video rests at full screen, the nav steps aside after a short pause;
  // any scroll, pointer movement, touch or key press brings it straight back.
  useEffect(() => {
    let heroFull = false;
    let timer = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      if (heroFull) timer = window.setTimeout(() => setIdle(true), 1400);
    };
    const onHero = (e: Event) => {
      heroFull = (e as CustomEvent<boolean>).detail;
      wake();
    };
    const events = ["scroll", "wheel", "pointermove", "touchstart", "keydown"] as const;
    window.addEventListener("hero-full", onHero);
    events.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hero-full", onHero);
      events.forEach((ev) => window.removeEventListener(ev, wake));
    };
  }, []);

  const pill = scrolled || open;
  const hidden = idle && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 px-gutter pt-4 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${hidden ? "pointer-events-none -translate-y-3 opacity-0" : ""}`}
      onFocusCapture={() => setIdle(false)}
    >
      <div data-scrolled={pill} className="nav-bar flex items-center gap-2">
        <a href="#top" onClick={scrollToHash} className="shrink-0" aria-label="DigitalMantra, back to top">
          {/* Corporate identity: the logo keeps its own colours (DESIGN_RULES.md §1) */}
          <Image src="/digitalmantra-logo.webp" alt="DigitalMantra" width={968} height={258} priority className="h-8 w-auto" />
        </a>

        <nav aria-label="Sections" className="ml-auto hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={scrollToHash}
              className="rounded-md px-4 py-2 text-small font-medium text-ink/85 transition-colors hover:bg-white/40 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a href={SIGNUP_URL} className="btn btn-primary btn-sm ml-auto hidden md:ml-0 md:inline-flex">
          Sign Up
        </a>

        <button
          type="button"
          className="ml-auto grid size-12 place-items-center rounded-md md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-6">
            <span className={`absolute left-0 h-0.5 w-6 rounded-full bg-ink transition-transform ${open ? "top-2 rotate-45" : "top-1"}`} />
            <span className={`absolute left-0 h-0.5 w-6 rounded-full bg-ink transition-transform ${open ? "top-2 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      <div id="mobile-menu" hidden={!open} className="glass fixed inset-x-4 bottom-4 top-24 rounded-xl px-6 pt-4 md:hidden">
        <nav aria-label="Sections (mobile)" className="flex flex-col">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                setOpen(false);
                scrollToHash(e);
              }}
className="border-b border-line py-4 text-h2">
              {l.label}
            </a>
          ))}
          <a href={SIGNUP_URL} onClick={() => setOpen(false)} className="btn btn-primary mt-8 w-full">
            Sign Up
          </a>
        </nav>
      </div>
    </header>
  );
}
