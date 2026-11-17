import type { ReactNode } from "react";

/**
 * Story: problem → introduction → agents as one continuous scroll.
 * Each beat's ground starts on the colour the previous one ends on (.story-bg-*),
 * so the tint follows scroll position with no runtime work. The only connector is
 * the short straight line under the introduction's label (Intro.tsx).
 */
export function Story({ children }: { children: ReactNode }) {
  return <div className="story">{children}</div>;
}

/** Background hand-over wrapper for one beat of the story. */
export function Beat({ ground, children }: { ground: "stats" | "statement" | "intro"; children: ReactNode }) {
  return <div className={`story-bg-${ground}`}>{children}</div>;
}
