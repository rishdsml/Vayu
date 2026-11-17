import type { Metadata } from "next";
import { TraceLoop } from "@/components/bento/TraceLoop";
import { AskLoop } from "@/components/bento/AskLoop";
import { HistoryLoop } from "@/components/bento/HistoryLoop";
import { ConnectLoop } from "@/components/bento/ConnectLoop";
import { AnalyseLoop } from "@/components/bento/AnalyseLoop";
import { InsightLoop } from "@/components/bento/InsightLoop";

export const metadata: Metadata = { title: "Bento loops · DigitalMantra", robots: { index: false } };
// Internal preview/export page: it reads searchParams, so it renders at request time.
export const instant = false;

/** Bento loop preview / export stage. ?name=trace  ·  &record=1 pauses for frame export. */
const LOOPS = { trace: TraceLoop, ask: AskLoop, history: HistoryLoop, connect: ConnectLoop, analyse: AnalyseLoop, insight: InsightLoop };

export default async function LoopsPage({ searchParams }: PageProps<"/loops">) {
  const sp = await searchParams;
  const name = (typeof sp.name === "string" ? sp.name : "trace") as keyof typeof LOOPS;
  const Loop = LOOPS[name] ?? TraceLoop;
  return (
    <div className="grid min-h-svh place-items-center bg-[#eef1f5]">
      {/* box width follows the viewport (capped), so each loop exports at its card's width */}
      <div className="w-full max-w-[600px] bg-[#eef1f5] p-0" data-loop-box>
        <Loop record={sp.record === "1"} />
      </div>
    </div>
  );
}
