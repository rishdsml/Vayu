"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, isMock, ONBOARDING, ApiError, type Account, type AccountSummary, type Range, type SyncStage } from "@/lib/onboarding-api";
import { AuthStep, GoogleMark } from "./AuthStep";

/**
 * Onboarding (documentation §4), rebuilt on the landing page's design system.
 * Steps: Google sign-in (one consent: sign-in + Google Ads access) → Customer ID →
 * history range → synchronisation (waits for real completion; ~2–3 min is an estimate,
 * never a timeout) → account summary from the `response` key.
 */
type Step = "signin" | "connect" | "account" | "range" | "sync" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "signin", label: "Sign in" },
  { id: "account", label: "Account" },
  { id: "range", label: "History" },
  { id: "sync", label: "Set up" },
];
const RANGES: { id: Range; label: string; desc: string }[] = [
  { id: "30d", label: "Last 30 days", desc: "Recent performance" },
  { id: "90d", label: "Last 90 days", desc: "About three months" },
  { id: "6m", label: "Last 6 months", desc: "Half a year of history" },
  { id: "1y", label: "Last year", desc: "A full year of history" },
];
const STAGES: { id: SyncStage; label: string }[] = [
  { id: "connecting", label: "Connecting to Google Ads" },
  { id: "retrieving", label: "Retrieving your advertising data" },
  { id: "processing", label: "Processing and organising it" },
  { id: "summary", label: "Preparing your account summary" },
];
const POLL_MS = 2000;

export function Onboarding() {
  const [step, setStep] = useState<Step>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [account, setAccount] = useState<string>("");
  const [range, setRange] = useState<Range>("6m");
  const [stage, setStage] = useState<SyncStage>("connecting");
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const poll = useRef<number | undefined>(undefined);

  // Move focus to each step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => () => window.clearTimeout(poll.current), []);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };

  const loadAccounts = useCallback(async () => {
    setAccounts(null);
    setError(null);
    try {
      const { accounts } = await api.listAccounts();
      setAccounts(accounts);
      if (accounts.length === 1) setAccount(accounts[0].id);
    } catch (e) {
      setAccounts([]);
      setError(e instanceof ApiError ? e.message : "We couldn't load your accounts. Please try again.");
    }
  }, []);

  const toAccounts = () => {
    go("account");
    loadAccounts();
  };

  // Email accounts grant Google Ads access separately (Google sign-in already did).
  const connectAds = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.connectGoogleAds();
      toAccounts();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The connection didn't complete. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startSync = async () => {
    go("sync");
    setStage("connecting");
    try {
      const { jobId } = await api.startSync(account, range);
      const tick = async () => {
        try {
          const s = await api.syncStatus(jobId);
          if (s.status === "running") {
            setStage(s.stage);
            poll.current = window.setTimeout(tick, POLL_MS);
          } else if (s.status === "completed") {
            setSummary(s.response);
            go("done");
          } else {
            setError(s.message ?? "Processing stopped unexpectedly. Nothing was changed in your Google Ads account.");
          }
        } catch {
          // Network blips don't end the job: keep waiting for the real result.
          poll.current = window.setTimeout(tick, POLL_MS * 2);
        }
      };
      tick();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't start the setup. Please try again.");
    }
  };

  const stepIndex = step === "connect" ? 0 : Math.min(STEPS.findIndex((s) => s.id === step), STEPS.length - 1);
  // Fill ends under the centre of the current step's label (labels are centred in equal columns).
  const progress = step === "done" ? 1 : (stepIndex + 0.5) / STEPS.length;

  return (
    <div className="onb relative flex min-h-svh flex-col">
      {/* Pinned: same position, size and spacing on every step */}
      <header className="sticky top-0 z-20 bg-bg/85 backdrop-blur-md">
        <div className="wrap flex h-20 items-center justify-between">
        <Link href="/" aria-label="DigitalMantra, back to home">
          <Image src="/digitalmantra-logo.webp" alt="DigitalMantra" width={968} height={258} priority className="h-8 w-auto" />
        </Link>
        {isMock && <span className="badge bg-surface text-ink-muted">Prototype · example data</span>}
        </div>
      </header>

      <main className="wrap flex flex-1 flex-col items-center pb-6 pt-4 sm:pb-12">
        {/* Progress: thin track, indigo fill, plain text labels */}
        <nav aria-label="Setup progress" className="mx-auto w-full max-w-onb">
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                aria-current={s.id === step ? "step" : undefined}
                className={`text-center text-caption ${i <= stepIndex || step === "done" ? "text-ink" : "text-ink-muted"}`}
              >
                <span className="tabular-nums text-ink-muted">0{i + 1}</span> {s.label}
              </li>
            ))}
          </ol>
          <div className="relative mt-4 h-px w-full bg-ink/10">
            <span
              className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-indigo to-gold transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ transform: `scaleX(${Math.max(progress, 0.04)})` }}
            />
          </div>
        </nav>

        <section key={step} className="onb-panel mt-8 w-full max-w-onb" aria-live="polite">
          {step === "signin" && <AuthStep heading={heading} onGoogle={toAccounts} onEmail={() => go("connect")} />}

          {step === "connect" && (
            <>
              <h1 ref={heading} tabIndex={-1} className="text-h2 outline-none">
                Connect your Google Ads account.
              </h1>
              <p className="mt-4 text-body text-ink-muted">
                Give the platform access to the Google account you use for Google Ads so it can start understanding your
                performance. It never changes your campaigns.
              </p>
              <button type="button" onClick={connectAds} disabled={busy} className="btn btn-google mt-8 w-full">
                {busy ? <Spinner /> : <GoogleMark />}
                {busy ? "Waiting for Google…" : "Connect Google Ads"}
              </button>
              {error && <ErrorNote>{error}</ErrorNote>}
            </>
          )}

          {step === "account" && (
            <>
              <h1 ref={heading} tabIndex={-1} className="text-h2 outline-none">
                Choose an account.
              </h1>
              <p className="mt-4 text-body text-ink-muted">Pick the Google Ads account you want analysed.</p>
              {accounts === null ? (
                <div className="mt-8 flex flex-col gap-2" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-md bg-surface" />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <>
                  <ErrorNote>{error ?? "We didn't find any Google Ads accounts on this Google account. Try signing in with a different one."}</ErrorNote>
                  <div className="mt-6 flex gap-2">
                    <button type="button" onClick={loadAccounts} className="btn btn-secondary">
                      Try again
                    </button>
                    <button type="button" onClick={() => go("signin")} className="btn btn-secondary">
                      Use another Google account
                    </button>
                  </div>
                </>
              ) : (
                <fieldset className="mt-8">
                  <legend className="sr-only">Google Ads accounts</legend>
                  <div className="flex flex-col gap-2">
                    {accounts.map((a) => (
                      <label key={a.id} className="onb-option">
                        <input type="radio" name="account" value={a.id} checked={account === a.id} onChange={() => setAccount(a.id)} className="sr-only" />
                        <span className="flex-1">
                          <span className="block text-body font-medium">{a.name}</span>
                          <span className="block text-small tabular-nums text-ink-muted">Customer ID {a.id}</span>
                        </span>
                        <span aria-hidden="true" className="onb-radio" />
                      </label>
                    ))}
                  </div>
                  <button type="button" disabled={!account} onClick={() => go("range")} className="btn btn-primary mt-8 w-full">
                    Continue
                  </button>
                </fieldset>
              )}
            </>
          )}

          {step === "range" && (
            <>
              <h1 ref={heading} tabIndex={-1} className="text-h2 outline-none">
                How much history?
              </h1>
              <p className="mt-4 text-body text-ink-muted">
                More history gives the agents a fuller picture of what is normal for your account.
              </p>
              <fieldset className="mt-8">
                <legend className="sr-only">Historical data range</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {RANGES.map((r) => (
                    <label key={r.id} className="onb-option">
                      <input type="radio" name="range" value={r.id} checked={range === r.id} onChange={() => setRange(r.id)} className="sr-only" />
                      <span className="flex-1">
                        <span className="block text-body font-medium">{r.label}</span>
                        <span className="block text-small text-ink-muted">{r.desc}</span>
                      </span>
                      <span aria-hidden="true" className="onb-radio" />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-8 flex gap-2">
                <button type="button" onClick={() => go("account")} className="btn btn-secondary">
                  Back
                </button>
                <button type="button" onClick={startSync} className="btn btn-primary flex-1">
                  Start analysis
                </button>
              </div>
            </>
          )}

          {step === "sync" && (
            <>
              <h1 ref={heading} tabIndex={-1} className="text-h2 outline-none">
                Setting up your account.
              </h1>
              <p className="mt-4 text-body text-ink-muted">
                This usually takes two to three minutes. Keep this page open; it moves on as soon as everything is ready.
              </p>
              <ol className="mt-8 flex flex-col gap-4">
                {STAGES.map((s, i) => {
                  const cur = STAGES.findIndex((x) => x.id === stage);
                  const state = error && i === cur ? "failed" : i < cur ? "done" : i === cur ? "active" : "todo";
                  return (
                    <li key={s.id} className="flex items-center gap-4 text-body" data-state={state}>
                      <span className="grid size-6 shrink-0 place-items-center" aria-hidden="true">
                        {state === "done" ? <Check /> : state === "active" ? <Spinner /> : <span className="size-2 rounded-full bg-ink/20" />}
                      </span>
                      <span className={state === "todo" ? "text-ink-muted" : "text-ink"}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
              {error && (
                <>
                  <ErrorNote>{error}</ErrorNote>
                  <button type="button" onClick={startSync} className="btn btn-primary mt-6 w-full">
                    Try again
                  </button>
                </>
              )}
            </>
          )}

          {step === "done" && summary && (
            <>
              <h1 ref={heading} tabIndex={-1} className="text-h2 outline-none">
                Your account is ready.
              </h1>
              <p className="mt-4 text-body text-ink-muted">Here&rsquo;s what we found. The agents will take it from here.</p>
              <dl className="mt-8 grid grid-cols-2 gap-y-8 border-t border-ink/10 pt-8 sm:grid-cols-3">
                {[
                  ["Total campaigns", summary.total_campaigns],
                  ["Active campaigns", summary.active_campaigns],
                  ["Total ads", summary.total_ads],
                ]
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => (
                    <div key={k as string}>
                      <dd className="text-h2 tabular-nums">{v as number}</dd>
                      <dt className="mt-2 text-small text-ink-muted">{k as string}</dt>
                    </div>
                  ))}
              </dl>
              {summary.account_status && (
                <p className="mt-8 flex items-center gap-2 text-small">
                  <span className="badge badge-stable capitalize">{summary.account_status}</span>
                  Customer ID {account}
                </p>
              )}
              {ONBOARDING.dashboardUrl ? (
                <a href={ONBOARDING.dashboardUrl} className="btn btn-primary btn-lg mt-10 w-full">
                  Go to dashboard
                </a>
              ) : (
                <p className="mt-10 rounded-md bg-surface p-4 text-small text-ink-muted">
                  The dashboard is the next part of the product. It will open from here once it&rsquo;s live.
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-6 rounded-md bg-butter/60 px-4 py-2 text-small text-gold-text">
      {children}
    </p>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="onb-spinner" />;
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-indigo" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}
