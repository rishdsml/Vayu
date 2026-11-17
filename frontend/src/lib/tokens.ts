/**
 * Read design tokens from CSS at runtime, so JS animation geometry and CSS layout
 * share one source of truth (globals.css :root / @theme). Client-only.
 */
function raw(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A length token in px. Resolves clamp()/vh by measuring a probe element. */
export function cssPx(name: string): number {
  const v = raw(name);
  if (/^-?[\d.]+px$/.test(v)) return parseFloat(v);
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:var(${name})`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

/** An angle token in degrees. */
export function cssDeg(name: string): number {
  return parseFloat(raw(name)) || 0;
}

/** Motion tokens used by GSAP (mirrors --ease-* / --duration-* in globals.css). */
export const MOTION = {
  scrub: 0.6,
  easeScrub: "power1.inOut",
  easeOut: "power3.out",
  durationFast: 0.2,
  durationBase: 0.3,
  durationSlow: 0.6,
} as const;
