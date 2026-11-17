"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CLIENT_LOGOS, type ClientLogo } from "@/lib/site";

/**
 * Client logo strip (original site §01b): five stationary cells. Every 4s a
 * left-to-right wave swaps in the next set of five, 110ms apart, with a blur/fade crossfade.
 * Cells never move. Pauses off-screen, in a hidden tab, on hover or focus, and
 * under reduced motion. Rotates only when there are more logos than cells.
 */
const CELLS = 5; // 3 visible under md
const CELLS_MOBILE = 3;
const INTERVAL_MS = 2000; // each set holds ~2s
const WAVE_STEP_MS = 110;
const PLACEHOLDER_WIDTHS = ["w-16", "w-12", "w-20", "w-16", "w-24", "w-12", "w-20", "w-16", "w-12", "w-20"];

type Cell = { cur: number; prev: number | null; v: number };

export function LogoStrip({ logos = CLIENT_LOGOS }: { logos?: ClientLogo[] }) {
  const band = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: CELLS }, (_, i) => ({ cur: i % logos.length, prev: null, v: 0 })),
  );

  useEffect(() => {
    const el = band.current;
    if (!el || logos.length <= CELLS) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let paused = false;
    // Logos rotate as whole sets of five (15 logos = 3 sets); each cell keeps its position.
    const sets = Math.ceil(logos.length / CELLS);
    let set = 0;
    let timer: number | undefined;
    const waves: number[] = [];

    const step = () => {
      const count = window.matchMedia("(min-width: 768px)").matches ? CELLS : CELLS_MOBILE;
      set = (set + 1) % sets;
      for (let j = 0; j < count; j++) {
        const pick = (set * CELLS + j) % logos.length;
        waves.push(
          window.setTimeout(() => {
            setCells((cs) => cs.map((c, k) => (k === j ? { cur: pick, prev: c.cur, v: c.v + 1 } : c)));
          }, j * WAVE_STEP_MS),
        );
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (reduce.matches || !visible || paused || document.hidden) return;
      timer = window.setTimeout(() => {
        step();
        schedule();
      }, INTERVAL_MS);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      schedule();
    });
    io.observe(el);
    const pause = () => {
      paused = true;
      schedule();
    };
    const resume = () => {
      paused = false;
      schedule();
    };
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);
    document.addEventListener("visibilitychange", schedule);
    reduce.addEventListener("change", schedule);

    return () => {
      window.clearTimeout(timer);
      waves.forEach((w) => window.clearTimeout(w));
      io.disconnect();
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
      document.removeEventListener("visibilitychange", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, [logos]);

  const placeholder = logos.some((l) => !l.src);

  return (
    <section aria-labelledby="logos-title" className="logo-band" data-placeholder={placeholder || undefined}>
      {/* Horizontal strip: label cell, then five fixed logo cells, hairlines fading at the ends */}
      <div ref={band} className="wrap">
        <div className="logo-strip grid grid-cols-3 md:grid-cols-[minmax(0,1.1fr)_repeat(5,minmax(0,1fr))]">
          <h2
            id="logos-title"
            className="col-span-3 flex items-center pb-6 text-small font-medium text-ink-muted md:col-span-1 md:pb-0 md:pr-6"
          >
            Brands DigitalMantra has worked with
          </h2>
          {/* Screen readers get the full list once; the animated cells are decorative */}
          <ul className="sr-only">
            {logos.map((l) => (
              <li key={l.name}>{l.name}</li>
            ))}
          </ul>
          {cells.map((c, k) => (
            <div
              key={k}
              aria-hidden="true"
              className={`logo-cell grid h-24 min-w-0 place-items-center overflow-hidden px-4 ${k >= CELLS_MOBILE ? "hidden md:grid" : ""}`}
            >
              {c.prev !== null && (
                <span key={`out-${c.v}`} className="logo-slot logo-out">
                  <LogoMark logo={logos[c.prev]} index={c.prev} />
                </span>
              )}
              <span key={`in-${c.v}`} className={`logo-slot ${c.v ? "logo-in" : ""}`}>
                <LogoMark logo={logos[c.cur]} index={c.cur} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LogoMark({ logo, index }: { logo: ClientLogo; index: number }) {
  if (logo.src) {
    const h = logo.height ?? 32;
    return (
      // Original colours and proportions; raster files sit on white, so they multiply onto the ground
      <Image
        src={logo.src}
        alt=""
        width={logo.w ?? h * 4}
        height={logo.h ?? h}
        unoptimized
        draggable={false}
        className={`w-auto max-w-full object-contain ${logo.raster ? "mix-blend-multiply" : ""}`}
        style={{ height: h }}
      />
    );
  }
  // Neutral placeholder mark until approved logos exist; the bar width varies so the wave reads
  return (
    <span className="flex h-8 max-w-full items-center gap-2 overflow-hidden rounded-sm bg-ink/5 px-4">
      <span className="size-4 shrink-0 rounded-full bg-ink/10" />
      <span className={`h-2 min-w-0 shrink rounded-full bg-ink/10 ${PLACEHOLDER_WIDTHS[index % PLACEHOLDER_WIDTHS.length]}`} />
    </span>
  );
}
