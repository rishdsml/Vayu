"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { FINDINGS, DATES, DAILY, DAILY_ACCOUNT_COST } from "@/lib/dashboard-data";
import { formatNum } from "../dashboard/motion";

gsap.registerPlugin(useGSAP);

/**
 * Launch film for the dashboard. One fixed 1920×1080 stage, one GSAP master timeline.
 * ?record=1 pauses it and exposes window.__tl so frames can be rendered by seeking
 * (deterministic 30fps export). Without it the film plays and loops for preview.
 * Copy: approved landing-page lines only. Figures: the dashboard's example data.
 */
const W = 1920;
const H = 1080;
const lead = FINDINGS[0];
const others = FINDINGS.slice(1);

// Chart: daily CPA, account level (illustrative allocation, same as the dashboard)
const conv = DATES.map((_, i) => Object.values(DAILY).reduce((a, c) => a + c.conversions[i], 0));
const CPA = DAILY_ACCOUNT_COST.map((c, i) => c / conv[i]);
const CW = 1040;
const CH = 340;
const cp = { l: 72, r: 24, t: 24, b: 44 };
const cMax = Math.ceil(Math.max(...CPA) / 50) * 50;
const cx = (i: number) => cp.l + (i * (CW - cp.l - cp.r)) / (DATES.length - 1);
const cy = (v: number) => cp.t + (1 - v / cMax) * (CH - cp.t - cp.b);
const LINE = CPA.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join("");
const AREA = `${LINE}L${cx(DATES.length - 1)},${CH - cp.b}L${cx(0)},${CH - cp.b}Z`;

const words = (s: string, cls = "") =>
  s.split(" ").map((w, i) => (
    <span key={i} className={`l-w inline-block ${cls}`}>
      {w}&nbsp;
    </span>
  ));

export function Launch() {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const rec = new URLSearchParams(location.search).has("record");
    const fit = () => setScale(rec ? 1 : Math.min(innerWidth / W, innerHeight / H));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(stage);
      const blur = (px: number) => `blur(${px}px)`;
      const E = "power3.out";
      const tl = gsap.timeline({ paused: true, defaults: { ease: E } });

      // ---------- initial state (set at t=0 so seeking is deterministic) ----------
      tl.set(q(".l-scene"), { autoAlpha: 0 }, 0);
      tl.set(q(".l-guide"), { scale: 0 }, 0);

      // ---------- ambient: gradient blobs drift for the whole film ----------
      tl.fromTo(q(".l-blob-a"), { x: -120, y: -60 }, { x: 160, y: 80, duration: 21, ease: "sine.inOut" }, 0);
      tl.fromTo(q(".l-blob-b"), { x: 120, y: 40 }, { x: -200, y: -60, duration: 21, ease: "sine.inOut" }, 0);

      // ---------- S1 · problem statement, kinetic type ----------
      tl.set(q(".s1"), { autoAlpha: 1 }, 0);
      tl.to(q(".l-guide"), { scale: 1, duration: 1.2, ease: "expo.out", stagger: 0.06 }, 0);
      tl.fromTo(q(".s1 .l1 .l-w"), { autoAlpha: 0, y: 40, filter: blur(14) }, { autoAlpha: 1, y: 0, filter: blur(0), duration: 0.7, stagger: 0.09 }, 0.25);
      tl.fromTo(q(".s1 .l2 .l-w"), { autoAlpha: 0, y: 40, filter: blur(14) }, { autoAlpha: 1, y: 0, filter: blur(0), duration: 0.7, stagger: 0.07 }, 1.35);
      tl.fromTo(q(".s1 .l-strike"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 2.4);
      tl.to(q(".s1 .l-lines"), { y: -60, scale: 0.94, autoAlpha: 0, filter: blur(16), duration: 0.6, ease: "power2.in" }, 3.25);

      // ---------- S2 · logo built on construction lines ----------
      tl.set(q(".s2"), { autoAlpha: 1 }, 3.6);
      tl.fromTo(q(".s2 .l-ring"), { scale: 0.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1, ease: "expo.out", stagger: 0.08 }, 3.6);
      tl.fromTo(q(".s2 .l-logo"), { scale: 0.86, autoAlpha: 0, filter: blur(20) }, { scale: 1, autoAlpha: 1, filter: blur(0), duration: 0.9 }, 3.85);
      tl.fromTo(q(".s2 .l-tag .l-w"), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05 }, 4.45);
      tl.to(q(".l-guide"), { autoAlpha: 0.35, duration: 0.6 }, 5.2);
      tl.to(q(".s2"), { scale: 1.12, autoAlpha: 0, filter: blur(18), duration: 0.6, ease: "power2.in" }, 5.5);

      // ---------- S3 · the dashboard, tilted, building itself ----------
      tl.set(q(".s3"), { autoAlpha: 1 }, 5.8);
      tl.fromTo(
        q(".l-dash"),
        { y: 420, rotateX: 48, rotateY: -22, rotateZ: 10, scale: 0.8, autoAlpha: 0 },
        { y: 40, rotateX: 26, rotateY: -16, rotateZ: 7, scale: 1, autoAlpha: 1, duration: 1.2, ease: "expo.out" },
        5.8,
      );
      tl.to(q(".l-dash"), { x: -90, y: -10, rotateY: -9, rotateZ: 5, duration: 2.6, ease: "sine.inOut" }, 7);
      tl.fromTo(q(".l-dash [data-in]"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 6.25);
      tl.fromTo(q(".l-dash .l-sev"), { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.1 }, 7.0);
      tl.fromTo(q(".l-health"), { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.8, ease: "power2.inOut" }, 7.3);
      // camera pushes into the lead finding
      tl.to(q(".l-dash"), { scale: 1.9, x: 380, y: 160, rotateX: 0, rotateY: 0, rotateZ: 0, filter: blur(10), autoAlpha: 0, duration: 0.8, ease: "power3.in" }, 8.9);

      // ---------- S4 · lead finding up close ----------
      tl.set(q(".s4"), { autoAlpha: 1 }, 9.45);
      tl.fromTo(q(".l-lead"), { scale: 1.12, autoAlpha: 0, filter: blur(14), rotateY: 10 }, { scale: 1, autoAlpha: 1, filter: blur(0), rotateY: 4, duration: 0.8 }, 9.45);
      tl.to(q(".l-lead"), { rotateY: -3, rotateX: 4, duration: 2.6, ease: "sine.inOut" }, 10.2);
      q(".l-ev").forEach((el, i) => {
        tl.fromTo(el, { backgroundColor: "rgba(55,59,139,0)" }, { backgroundColor: "rgba(55,59,139,0.07)", duration: 0.3 }, 10.1 + i * 0.4);
        tl.fromTo(el.querySelector(".l-ev-bar"), { scaleY: 0 }, { scaleY: 1, duration: 0.3 }, 10.1 + i * 0.4);
      });
      const spend = { v: 0 };
      tl.fromTo(spend, { v: 0 }, { v: lead.spend ?? 0, duration: 1.2, ease: "power2.out", onUpdate: () => q(".l-spend").forEach((e) => (e.textContent = formatNum(spend.v, "inr"))) }, 10.0);
      tl.fromTo(q(".l-action-line"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 11.4);
      tl.to(q(".s4"), { y: -80, autoAlpha: 0, filter: blur(12), duration: 0.5, ease: "power2.in" }, 12.3);

      // ---------- S5 · KPIs float in and count ----------
      tl.set(q(".s5"), { autoAlpha: 1 }, 12.6);
      tl.fromTo(q(".l-kpi"), { x: -160, autoAlpha: 0, filter: blur(10) }, { x: 0, autoAlpha: 1, filter: blur(0), duration: 0.7, stagger: 0.1 }, 12.6);
      tl.to(q(".l-kpi"), { y: (i) => [-14, 10, -8, 12][i], duration: 2, ease: "sine.inOut" }, 13.2);
      q(".l-kpi [data-to]").forEach((el, i) => {
        const o = { v: 0 };
        const to = Number(el.getAttribute("data-to"));
        const f = el.getAttribute("data-f")!;
        tl.fromTo(o, { v: 0 }, { v: to, duration: 1.1, ease: "power2.out", onUpdate: () => (el.textContent = formatNum(o.v, f)) }, 12.8 + i * 0.1);
      });
      tl.to(q(".s5"), { scale: 0.92, autoAlpha: 0, filter: blur(12), duration: 0.5, ease: "power2.in" }, 14.7);

      // ---------- S6 · trend chart draws, tilted ----------
      tl.set(q(".s6"), { autoAlpha: 1 }, 14.95);
      tl.fromTo(q(".l-chart"), { rotateX: 40, rotateY: 22, y: 200, autoAlpha: 0 }, { rotateX: 16, rotateY: 12, y: 0, autoAlpha: 1, duration: 1, ease: "expo.out" }, 14.95);
      tl.to(q(".l-chart"), { rotateX: 8, rotateY: 4, x: -40, duration: 2.6, ease: "sine.inOut" }, 15.7);
      const path = q(".l-line")[0] as unknown as SVGPathElement;
      const len = path.getTotalLength();
      tl.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 15.4);
      tl.fromTo(q(".l-area"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 15.9);
      tl.fromTo(q(".l-dot"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.3, stagger: 0.12, ease: "back.out(3)" }, 15.5);
      const cur = { i: 0 };
      tl.fromTo(
        cur,
        { i: 0 },
        {
          i: DATES.length - 1,
          duration: 1.6,
          ease: "power1.inOut",
          onUpdate: () => {
            const k = Math.round(cur.i);
            const x = cx(cur.i);
            const lo = Math.floor(cur.i);
            const hi = Math.min(lo + 1, DATES.length - 1);
            const v = CPA[lo] + (CPA[hi] - CPA[lo]) * (cur.i - lo);
            q(".l-cursor").forEach((e) => e.setAttribute("transform", `translate(${x},0)`));
            q(".l-tip").forEach((e) => e.setAttribute("transform", `translate(${x},${cy(v)})`));
            q(".l-tip-t").forEach((e) => (e.textContent = `${DATES[k]} · ${formatNum(CPA[k], "inr2")}`));
            q(".l-ticker").forEach((e) => (e.textContent = formatNum(v, "inr2")));
          },
        },
        16.4,
      );
      tl.fromTo(q(".l-cursor, .l-tip"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 16.35);
      tl.to(q(".s6"), { x: -200, autoAlpha: 0, filter: blur(12), duration: 0.5, ease: "power2.in" }, 18.2);

      // ---------- S7 · click to investigate, assistant opens with context ----------
      tl.set(q(".s7"), { autoAlpha: 1 }, 18.45);
      tl.fromTo(q(".l-cta"), { scale: 0.8, autoAlpha: 0, filter: blur(10) }, { scale: 1, autoAlpha: 1, filter: blur(0), duration: 0.6 }, 18.45);
      tl.fromTo(q(".l-pointer"), { x: 260, y: 220, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 18.6);
      tl.to(q(".l-cta"), { scale: 0.94, duration: 0.12, ease: "power2.in" }, 19.35);
      tl.to(q(".l-cta"), { scale: 1, duration: 0.3, ease: "back.out(3)" }, 19.47);
      tl.fromTo(q(".l-cta-ring"), { scale: 1, autoAlpha: 0.6 }, { scale: 1.5, autoAlpha: 0, duration: 0.7, ease: "power2.out" }, 19.4);
      tl.to(q(".l-cta-wrap"), { x: -470, scale: 0.8, duration: 0.8, ease: "power3.inOut" }, 19.8);
      tl.to(q(".l-pointer"), { autoAlpha: 0, duration: 0.3 }, 19.8);
      tl.fromTo(q(".l-link"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 20.2);
      tl.fromTo(q(".l-panel"), { x: 700, autoAlpha: 0, filter: blur(12) }, { x: 0, autoAlpha: 1, filter: blur(0), duration: 0.9, ease: "expo.out" }, 19.9);
      tl.fromTo(q(".l-msg"), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.25 }, 20.3);
      tl.fromTo(q(".l-typing span"), { y: 0 }, { y: -6, duration: 0.3, yoyo: true, repeat: 5, stagger: 0.1, ease: "sine.inOut" }, 21.1);
      // zoom-through
      tl.to(q(".s7"), { scale: 2.4, autoAlpha: 0, filter: blur(24), duration: 0.7, ease: "power3.in" }, 22.3);

      // ---------- S8 · end card ----------
      tl.set(q(".s8"), { autoAlpha: 1 }, 22.85);
      tl.fromTo(q(".l-guide"), { autoAlpha: 0.35 }, { autoAlpha: 1, duration: 0.6 }, 22.85);
      tl.fromTo(q(".s8 .l-logo"), { autoAlpha: 0, y: 30, filter: blur(16) }, { autoAlpha: 1, y: 0, filter: blur(0), duration: 0.9 }, 22.9);
      tl.fromTo(q(".s8 .l-end .l-w"), { autoAlpha: 0, y: 30, filter: blur(10) }, { autoAlpha: 1, y: 0, filter: blur(0), duration: 0.6, stagger: 0.06 }, 23.4);
      tl.fromTo(q(".s8 .l-sub"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 24.2);
      tl.to({}, { duration: 1.6 }, 24.8); // hold

      (window as unknown as { __tl: gsap.core.Timeline }).__tl = tl;
      if (!new URLSearchParams(location.search).has("record")) tl.repeat(-1).repeatDelay(0.6).play();
      else tl.seek(0);
    },
    { scope: stage },
  );

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#e9eef6]">
      <div
        ref={stage}
        className="relative overflow-hidden"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "center", flex: "none" }}
      >
        {/* Ground: soft brand gradient (butter → steel blue) with drifting light */}
        <div className="absolute inset-0 bg-[#edf1f7]" />
        <div className="l-blob-a absolute -left-60 -top-60 size-[1100px] rounded-full bg-[radial-gradient(closest-side,rgb(243_229_174/0.85),transparent)]" />
        <div className="l-blob-b absolute -right-60 top-40 size-[1300px] rounded-full bg-[radial-gradient(closest-side,rgb(185_207_240/0.9),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-[rgb(214_227_246/0.9)] to-transparent" />

        {/* Construction guides */}
        <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
          {[
            [0, 300, W, 300],
            [0, 780, W, 780],
            [560, 0, 560, H],
            [1360, 0, 1360, H],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} className="l-guide" x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(55 59 139 / 0.12)" style={{ transformOrigin: i < 2 ? "50% 50%" : "50% 50%", transformBox: "fill-box" }} />
          ))}
          <circle className="l-guide" cx={W / 2} cy={H / 2} r={330} fill="none" stroke="rgb(55 59 139 / 0.08)" style={{ transformOrigin: "center", transformBox: "fill-box" }} />
        </svg>

        {/* S1 · problem statement */}
        <section className="l-scene s1 absolute inset-0 grid place-items-center">
          <div className="l-lines text-center">
            <p className="l1 text-[104px] font-medium leading-[1.05] tracking-[-0.04em] text-ink">{words("Your conversions are down.")}</p>
            <p className="l2 mt-6 text-[64px] leading-[1.1] tracking-[-0.03em] text-ink/55">
              {words("Now you need to figure out")}
              <span className="relative inline-block">
                {words("what went wrong.", "text-indigo")}
                <span className="l-strike absolute -bottom-2 left-0 right-6 h-[6px] origin-left rounded-full bg-gold" />
              </span>
            </p>
          </div>
        </section>

        {/* S2 · logo */}
        <section className="l-scene s2 absolute inset-0 grid place-items-center">
          <span className="l-ring absolute size-[620px] rounded-full border border-indigo/15" />
          <span className="l-ring absolute size-[880px] rounded-full border border-indigo/10" />
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digitalmantra-logo.webp" alt="DigitalMantra" className="l-logo mx-auto h-[150px] w-auto" />
            <p className="l-tag mt-10 text-[44px] tracking-[-0.02em] text-ink/70">{words("The Intelligence Layer for Google Ads.")}</p>
          </div>
        </section>

        {/* S3 · dashboard overview, tilted */}
        <section className="l-scene s3 absolute inset-0 grid place-items-center [perspective:2600px]">
          <div className="l-dash dash w-[1480px] overflow-hidden rounded-[32px] shadow-[0_80px_160px_-60px_rgb(43_46_112/0.55),0_0_0_1px_rgb(255_255_255/0.6)] [transform-style:preserve-3d]" style={{ minHeight: 0 }}>
            <div data-in className="flex h-[76px] items-center gap-6 border-b border-line bg-raised/70 px-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digitalmantra-logo.webp" alt="" className="h-7 w-auto" />
              <div className="mx-auto flex rounded-full bg-raised p-1 shadow-[0_0_0_1px_var(--color-line)]">
                {["Findings", "Levers", "Performance", "Campaigns", "Tracking"].map((t, i) => (
                  <span key={t} className={`rounded-full px-4 py-2 text-small font-medium ${i === 0 ? "bg-ink text-raised" : "text-ink/70"}`}>
                    {t}
                  </span>
                ))}
              </div>
              <span className="btn btn-primary btn-sm">AI Assistant</span>
            </div>
            <div className="p-10">
              <div data-in className="flex items-center gap-4">
                <span className="text-h3 font-medium">SMS Lucknow</span>
                <span className="badge badge-stable">Connected</span>
                <span className="ml-auto text-small text-ink-muted">31 Aug – 7 Sep 2026</span>
              </div>
              <p data-in className="mt-6 text-[32px] leading-tight tracking-tight">
                <span className="l-health bg-[linear-gradient(rgb(243_229_174/0.7),rgb(243_229_174/0.7))] bg-no-repeat px-1 text-gold-text">Attention needed.</span>{" "}
                <span className="text-ink-muted">2 issues need attention and 1 to watch.</span>
              </p>
              <div className="mt-6 grid grid-cols-12 gap-4">
                <div data-in className="dcard dcard-lead col-span-7 p-8">
                  <div className="flex items-center gap-2">
                    <span className="l-sev badge badge-attention">Attention</span>
                    <span className="text-caption text-ink-muted">Budget &amp; Bidding · Campaign</span>
                  </div>
                  <p className="mt-6 text-[40px] leading-tight tracking-tight">{lead.entity}</p>
                  <p className="mt-2 text-lede text-ink/80">{lead.summary}</p>
                  <div className="mt-6 grid grid-cols-2 gap-8">
                    <div className="text-small">
                      {lead.evidence.map((e, i) => (
                        <div key={i} className="flex justify-between border-t border-ink/10 py-2">
                          <span>{e.metric}</span>
                          <span className="font-medium">{e.value}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-caption text-ink-muted">Campaign spend · period</p>
                      <p className="num-light text-[48px] leading-none">₹12,652</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-5 grid gap-4">
                  {others.map((f) => (
                    <div key={f.id} data-in className="dcard p-6">
                      <div className="flex items-center gap-2">
                        <span className={`l-sev badge ${f.severity === "attention" ? "badge-attention" : "badge-watch"}`}>{f.severity === "attention" ? "Attention" : "Watch"}</span>
                        <span className="text-caption text-ink-muted">{f.lever === "measurement" ? "Measurement" : "Budget & Bidding"}</span>
                      </div>
                      <p className="mt-4 text-small font-medium">{f.entity}</p>
                      <p className="mt-1 text-small text-ink-muted">{f.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div data-in className="dcard mt-4 grid grid-cols-5 gap-6 p-8">
                {[
                  ["Cost per lead (CPA)", "₹129.83"],
                  ["Cost", "₹15,190"],
                  ["Conversions", "117"],
                  ["Clicks", "694"],
                  ["Impressions", "4,960"],
                ].map(([k, v], i) => (
                  <div key={k} className={i ? "border-l border-line pl-6" : ""}>
                    <p className="text-caption text-ink-muted">{k}</p>
                    <p className={`num-light mt-2 leading-none ${i ? "text-[32px]" : "text-[44px] text-indigo-deep"}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* S4 · lead finding up close */}
        <section className="l-scene s4 absolute inset-0 grid place-items-center [perspective:2200px]">
          <div className="l-lead dcard dcard-lead w-[1240px] p-14 shadow-[0_80px_140px_-60px_rgb(43_46_112/0.5)]">
            <div className="flex items-center gap-3">
              <span className="badge badge-attention text-small">Attention</span>
              <span className="text-small text-ink-muted">Budget &amp; Bidding · Highest priority</span>
            </div>
            <p className="mt-8 text-[76px] leading-none tracking-[-0.04em]">{lead.entity}</p>
            <p className="mt-4 text-[30px] text-ink/75">{lead.summary}</p>
            <div className="mt-12 grid grid-cols-[1.4fr_1fr] gap-14">
              <div>
                <p className="text-small text-ink-muted">Evidence</p>
                {lead.evidence.map((e, i) => (
                  <div key={i} className="l-ev relative mt-2 flex items-baseline justify-between rounded-lg px-5 py-4 text-[22px]">
                    <span className="l-ev-bar absolute inset-y-3 left-0 w-[3px] origin-top rounded-full bg-indigo" />
                    <span>
                      {e.metric}
                      <span className="block text-[16px] text-ink-muted">{e.context}</span>
                    </span>
                    <span className="font-medium tabular-nums">{e.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-small text-ink-muted">Campaign spend · period</p>
                  <p className="l-spend num-light mt-2 text-[96px] leading-none">₹12,652</p>
                  <p className="mt-6 text-small text-ink-muted">Money at stake · not calculated</p>
                </div>
                <div>
                  <p className="text-small text-ink-muted">Recommended action</p>
                  <p className="relative mt-2 inline-block text-[24px] font-medium">
                    {lead.action}
                    <span className="l-action-line absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gold" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* S5 · KPIs */}
        <section className="l-scene s5 absolute inset-0 grid place-items-center">
          <div className="flex gap-8">
            {[
              ["Cost per lead (CPA)", 129.83, "inr2", true],
              ["Total cost", 15190, "inr", false],
              ["Conversions", 117, "int", false],
              ["Clicks", 694, "int", false],
            ].map(([k, v, f, hero]) => (
              <div key={k as string} className={`l-kpi dcard p-12 shadow-[0_60px_120px_-50px_rgb(43_46_112/0.5)] ${hero ? "dcard-lead w-[460px]" : "w-[380px]"}`}>
                <p className="text-[20px] text-ink-muted">{k}</p>
                <p className={`num-light mt-8 leading-none ${hero ? "text-[104px] text-indigo-deep" : "text-[80px]"}`} data-to={v as number} data-f={f as string}>
                  {formatNum(v as number, f as string)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* S6 · chart */}
        <section className="l-scene s6 absolute inset-0 grid place-items-center [perspective:2400px]">
          <div className="l-chart dcard w-[1180px] p-12 shadow-[0_80px_140px_-60px_rgb(43_46_112/0.5)]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-small font-medium">Daily trend · CPA</p>
                <p className="l-ticker num-light mt-4 text-[80px] leading-none">{formatNum(CPA[0], "inr2")}</p>
              </div>
              <div className="flex gap-2">
                {["Cost", "Conversions", "CPA", "CPC", "Clicks"].map((m) => (
                  <span key={m} className={`dtab h-9 px-4 text-caption ${m === "CPA" ? "!bg-ink !text-raised" : ""}`}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <svg width={CW} height={CH} className="mt-8 overflow-visible">
              <defs>
                <linearGradient id="l-ag" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#373b8b" stopOpacity="0.2" />
                  <stop offset="1" stopColor="#373b8b" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((k) => (
                <g key={k}>
                  <line x1={cp.l} x2={CW - cp.r} y1={cy(cMax * k)} y2={cy(cMax * k)} stroke="rgb(35 36 46 / 0.07)" />
                  <text x={cp.l - 14} y={cy(cMax * k) + 5} textAnchor="end" className="fill-ink-muted text-[14px]">
                    ₹{Math.round(cMax * k)}
                  </text>
                </g>
              ))}
              {DATES.map((d, i) => (
                <text key={d} x={cx(i)} y={CH - 10} textAnchor="middle" className="fill-ink-muted text-[14px]">
                  {d}
                </text>
              ))}
              <path className="l-area" d={AREA} fill="url(#l-ag)" />
              <path className="l-line" d={LINE} fill="none" stroke="#373b8b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <g className="l-cursor">
                <line x1={0} x2={0} y1={cp.t} y2={CH - cp.b} stroke="rgb(35 36 46 / 0.25)" strokeDasharray="4 4" />
              </g>
              {CPA.map((v, i) => (
                <circle key={i} className="l-dot" cx={cx(i)} cy={cy(v)} r="5" fill="#fdfdfe" stroke="#373b8b" strokeWidth="2" />
              ))}
              <g className="l-tip">
                <circle r="8" fill="#d0ae3e" stroke="#fdfdfe" strokeWidth="3" />
                <g transform="translate(0,-26)">
                  <rect x="-80" y="-30" width="160" height="34" rx="8" fill="#23242e" />
                  <text className="l-tip-t fill-[#fdfdfe] text-[15px]" textAnchor="middle" y="-8">
                    31 Aug
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </section>

        {/* S7 · investigate → assistant */}
        <section className="l-scene s7 absolute inset-0">
          {/* thin connector from the button to the panel */}
          <span className="l-link absolute left-[700px] top-1/2 h-px w-[300px] origin-left bg-gradient-to-r from-indigo/50 via-gold/70 to-gold/0" />
          <div className="l-cta-wrap absolute inset-0 grid place-items-center">
            <div className="relative">
              <span className="l-cta-ring absolute -inset-3 rounded-[20px] border-2 border-indigo/50" />
              <span className="l-cta btn btn-primary !min-h-[88px] !rounded-[18px] !px-12 !text-[30px]">Investigate in AI Assistant →</span>
              <svg className="l-pointer absolute -bottom-10 right-10 size-12 drop-shadow-lg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 2l16 9-7 2-3 7z" fill="#23242e" stroke="#fdfdfe" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="l-panel absolute right-[180px] top-1/2 flex w-[760px] -translate-y-1/2 flex-col rounded-[32px] bg-raised p-12 shadow-[0_80px_160px_-60px_rgb(43_46_112/0.55)]">
            <p className="text-[22px] font-medium">AI Assistant</p>
            <p className="text-small text-ink-muted">SMS Lucknow · 31 Aug – 7 Sep 2026</p>
            <p className="l-msg mt-10 text-small text-ink-muted">Context attached to this conversation</p>
            <div className="l-msg mt-4 rounded-2xl bg-surface p-6">
              <div className="flex items-center gap-2">
                <span className="badge badge-attention">Attention</span>
                <span className="text-caption text-ink-muted">Budget &amp; Bidding · Campaign</span>
              </div>
              <p className="mt-3 text-[22px] font-medium">{lead.entity}</p>
              {lead.evidence.map((e, i) => (
                <div key={i} className="mt-2 flex justify-between border-t border-line pt-2 text-small">
                  <span className="text-ink-muted">
                    {e.metric} · {e.context}
                  </span>
                  <span className="font-medium">{e.value}</span>
                </div>
              ))}
            </div>
            <div className="l-msg ml-auto mt-6 max-w-[85%] rounded-2xl rounded-br-md bg-indigo px-6 py-4 text-[20px] text-raised">
              Why is this happening on {lead.entity}, and what should I check first?
            </div>
            <div className="l-msg l-typing mt-6 flex gap-2 self-start rounded-2xl bg-surface px-5 py-4">
              <span className="size-2.5 rounded-full bg-ink/40" />
              <span className="size-2.5 rounded-full bg-ink/40" />
              <span className="size-2.5 rounded-full bg-ink/40" />
            </div>
          </div>
        </section>

        {/* S8 · end card */}
        <section className="l-scene s8 absolute inset-0 grid place-items-center">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digitalmantra-logo.webp" alt="DigitalMantra" className="l-logo mx-auto h-[96px] w-auto" />
            <p className="l-end mt-12 text-[80px] font-medium leading-[1.05] tracking-[-0.04em]">
              {words("Meet a smarter way to")}
              <br />
              {words("manage your Google Ads.", "text-indigo")}
            </p>
            <p className="l-sub mt-8 text-[28px] text-ink/60">The Intelligence Layer for Google Ads</p>
          </div>
        </section>

        <span className="absolute bottom-8 right-10 text-[14px] text-ink/40">Example account data</span>
      </div>
    </div>
  );
}
