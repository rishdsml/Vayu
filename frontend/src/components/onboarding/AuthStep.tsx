"use client";

import { useId, useState, type RefObject } from "react";
import { api, ApiError } from "@/lib/onboarding-api";
import { LEGAL_LINKS } from "@/lib/site";

/**
 * Sign in / sign up / password reset. Google is the primary route: one consent signs
 * the user in and grants Google Ads access. Email accounts connect Google Ads next.
 * Field spec: DESIGN_RULES.md §5 (48px, radius md, raised fill, line border,
 * indigo focus ring, error under the field).
 */
type Mode = "signin" | "signup" | "reset";

export function AuthStep({
  heading,
  onGoogle,
  onEmail,
}: {
  heading: RefObject<HTMLHeadingElement | null>;
  onGoogle: () => void;
  onEmail: () => void;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const id = useId();

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setFieldErr({});
    setSent(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) e.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address.";
    if (mode !== "reset" && !password) e.password = "Enter your password.";
    else if (mode === "signup" && password.length < 8) e.password = "Use at least 8 characters.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  };

  const google = async () => {
    setBusy("google");
    setError(null);
    try {
      await api.signInWithGoogle();
      onGoogle();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign-in didn't complete. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy("email");
    try {
      if (mode === "reset") {
        await api.requestPasswordReset(email);
        setSent(true);
      } else {
        if (mode === "signin") await api.signIn({ email, password, remember });
        else await api.signUp({ name, email, password });
        onEmail();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const title = mode === "signin" ? "Welcome back." : mode === "signup" ? "Create your account." : "Reset your password.";
  const lede =
    mode === "signin"
      ? "Please enter your details."
      : mode === "signup"
        ? "Start understanding your Google Ads performance."
        : "Enter your email and we'll send you a link to reset it.";

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="text-h2 outline-none">
        {title}
      </h1>
      <p className="mt-2 text-body text-ink-muted">{lede}</p>

      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {/* Sign up: name and email share a row from sm up so the screen fits without scrolling */}
        <div className={mode === "signup" ? "grid gap-4 sm:grid-cols-2" : "contents"}>
        {mode === "signup" && (
          <Field id={`${id}-name`} label="Name" error={fieldErr.name}>
            <input id={`${id}-name`} className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
          </Field>
        )}
        <Field id={`${id}-email`} label="Email" error={fieldErr.email}>
          <input
            id={`${id}-email`}
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </Field>
        </div>
        {mode !== "reset" && (
          <Field id={`${id}-pw`} label="Password" error={fieldErr.password}>
            <div className="relative">
              <input
                id={`${id}-pw`}
                className="field pr-12"
                type={show ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-muted hover:text-ink"
              >
                <EyeIcon off={show} />
              </button>
            </div>
          </Field>
        )}

        {mode === "signin" && (
          <div className="flex items-center justify-between gap-4 text-small">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="check" />
              Remember for 30 days
            </label>
            <button type="button" onClick={() => switchMode("reset")} className="link-draw font-medium text-ink">
              Forgot password
            </button>
          </div>
        )}

        {sent ? (
          <p role="status" className="rounded-md bg-mint/70 px-4 py-2 text-small text-mint-text">
            If an account exists for {email}, a reset link is on its way.
          </p>
        ) : (
          <button type="submit" disabled={busy !== null} className="btn btn-primary w-full">
            {busy === "email" && <span aria-hidden="true" className="onb-spinner border-raised/30 border-t-raised" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        )}
      </form>

      {mode !== "reset" && (
        <button type="button" onClick={google} disabled={busy !== null} className="btn btn-google mt-4 w-full">
          {busy === "google" ? <span aria-hidden="true" className="onb-spinner" /> : <GoogleMark />}
          {busy === "google" ? "Waiting for Google…" : mode === "signin" ? "Sign in with Google" : "Sign up with Google"}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-butter/60 px-4 py-2 text-small text-gold-text">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-small text-ink-muted">
        {mode === "signin" ? (
          <>
            Don&rsquo;t have an account?{" "}
            <button type="button" onClick={() => switchMode("signup")} className="link-draw font-medium text-indigo">
              Sign up for free
            </button>
          </>
        ) : mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => switchMode("signin")} className="link-draw font-medium text-indigo">
              Sign in
            </button>
          </>
        ) : (
          <button type="button" onClick={() => switchMode("signin")} className="link-draw font-medium text-indigo">
            Back to sign in
          </button>
        )}
      </p>

      {mode === "signup" && (
        <p className="mt-4 text-center text-caption text-ink-muted">
          By creating an account you agree to our{" "}
          <a href={LEGAL_LINKS[0].href} target="_blank" rel="noopener noreferrer" className="link-draw text-ink">
            Privacy Policy
          </a>
          .
        </p>
      )}
    </>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2" data-invalid={error ? "true" : undefined}>
      <label htmlFor={id} className="text-small font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="text-small text-gold-text">
          {error}
        </p>
      )}
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
