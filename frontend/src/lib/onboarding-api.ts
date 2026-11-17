/**
 * Onboarding API (product documentation §4). Endpoint paths and shapes are PROPOSALS
 * carried over from the original prototype, pending engineering.
 *
 * Sign-in is Google only: one OAuth consent signs the user in and grants Google Ads
 * access. The backend issues the consent URL; its callback postMessages
 * { type: "google-oauth", ok, code?, message?, user? } to this origin.
 *
 * MODE "mock" runs a clearly labelled prototype until the backend exists. Mock
 * scenarios can be forced with ?mock=denied|cancel|noaccounts|syncfail for QA.
 */
export const ONBOARDING = {
  mode: "mock" as "mock" | "backend",
  apiBase: "/api",
  /** Dashboard prototype (example account data until the backend exists). */
  dashboardUrl: null,
};

export type Account = { id: string; name: string };
export type Range = "30d" | "90d" | "6m" | "1y";
export type SyncStage = "connecting" | "retrieving" | "processing" | "summary";
export type SyncStatus =
  | { status: "running"; stage: SyncStage }
  | { status: "failed"; message?: string }
  | { status: "completed"; response: AccountSummary };
/** Rendered only from the backend's `response` key (documentation §4.3). */
export type AccountSummary = {
  total_campaigns?: number;
  active_campaigns?: number;
  total_ads?: number;
  account_status?: string;
};

export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(ONBOARDING.apiBase + path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(j.message || "Request failed", j.code);
  return j as T;
}

function oauthPopup(startPath: string): Promise<{ email: string }> {
  return req<{ authUrl: string }>("POST", startPath).then(
    ({ authUrl }) =>
      new Promise((resolve, reject) => {
        const w = window.open(authUrl, "google-oauth", "width=520,height=640");
        if (!w) return reject(new ApiError("The Google window was blocked. Allow pop-ups for this site and try again.", "blocked"));
        const onMsg = (ev: MessageEvent) => {
          if (ev.origin !== window.location.origin || ev.data?.type !== "google-oauth") return;
          window.removeEventListener("message", onMsg);
          if (ev.data.ok) resolve({ email: ev.data.user?.email ?? "" });
          else reject(new ApiError(ev.data.message || "The connection was not completed.", ev.data.code));
        };
        window.addEventListener("message", onMsg);
      }),
  );
}

const backend = {
  /** Email + password. Errors: code "invalid_credentials" (401), "exists" (409). */
  signIn: (d: { email: string; password: string; remember: boolean }) => req<{ user: { email: string } }>("POST", "/auth/signin", d),
  signUp: (d: { name: string; email: string; password: string }) => req<{ user: { email: string } }>("POST", "/auth/signup", d),
  requestPasswordReset: (email: string) => req<object>("POST", "/auth/password-reset", { email }),
  /** For email accounts: grants Google Ads access only (no sign-in). */
  connectGoogleAds: () => oauthPopup("/google/oauth/start"),
  async signInWithGoogle(): Promise<{ email: string }> {
    const { authUrl } = await req<{ authUrl: string }>("POST", "/auth/google/start");
    return new Promise((resolve, reject) => {
      const w = window.open(authUrl, "google-oauth", "width=520,height=640");
      if (!w) return reject(new ApiError("The Google window was blocked. Allow pop-ups for this site and try again.", "blocked"));
      const onMsg = (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin || ev.data?.type !== "google-oauth") return;
        window.removeEventListener("message", onMsg);
        if (ev.data.ok) resolve({ email: ev.data.user?.email ?? "" });
        else reject(new ApiError(ev.data.message || "The sign-in was not completed.", ev.data.code));
      };
      window.addEventListener("message", onMsg);
    });
  },
  listAccounts: () => req<{ accounts: Account[] }>("GET", "/google-ads/customers"),
  startSync: (customerId: string, range: Range) => req<{ jobId: string }>("POST", "/sync", { customerId, range }),
  syncStatus: (jobId: string) => req<SyncStatus>("GET", `/sync/${encodeURIComponent(jobId)}`),
};

/* ---------------- Mock (prototype only; placeholder data) ---------------- */
const scenario = () => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("mock") ?? "");
const later = <T,>(ms: number, fn: () => T) => new Promise<T>((res, rej) => setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, ms));
let job = { t0: 0, total: 12000 };

const mock: typeof backend = {
  signIn: (d) =>
    later(900, () => {
      if (scenario() === "wrongpass") throw new ApiError("The email or password is incorrect.", "invalid_credentials");
      return { user: { email: d.email } };
    }),
  signUp: (d) =>
    later(900, () => {
      if (scenario() === "exists") throw new ApiError("An account with this email already exists. Sign in instead.", "exists");
      return { user: { email: d.email } };
    }),
  requestPasswordReset: () => later(800, () => ({})),
  connectGoogleAds: () =>
    later(1400, () => {
      if (scenario() === "denied") throw new ApiError("Access to Google Ads was not granted, so we can't analyse your account.", "denied");
      return { email: "you@example.com" };
    }),
  signInWithGoogle: () =>
    later(1400, () => {
      if (scenario() === "cancel") throw new ApiError("The Google window was closed before sign-in finished.", "cancelled");
      if (scenario() === "denied") throw new ApiError("Access to Google Ads was not granted, so we can't analyse your account.", "denied");
      return { email: "you@example.com" };
    }),
  listAccounts: () =>
    later(900, () => ({
      accounts:
        scenario() === "noaccounts"
          ? []
          : [
              { id: "000-000-0001", name: "Example account A" },
              { id: "000-000-0002", name: "Example account B" },
              { id: "000-000-0003", name: "Example account C" },
            ],
    })),
  startSync: () => {
    job = { t0: Date.now(), total: 12000 };
    return later(400, () => ({ jobId: "mock-job" }));
  },
  syncStatus: () =>
    later(200, (): SyncStatus => {
      const k = (Date.now() - job.t0) / job.total;
      if (scenario() === "syncfail" && k > 0.6)
        return { status: "failed", message: "Processing stopped unexpectedly. Nothing was changed in your Google Ads account." };
      if (k < 0.15) return { status: "running", stage: "connecting" };
      if (k < 0.55) return { status: "running", stage: "retrieving" };
      if (k < 0.85) return { status: "running", stage: "processing" };
      if (k < 1) return { status: "running", stage: "summary" };
      // Shape mirrors the documented example; values are placeholders.
      return { status: "completed", response: { total_campaigns: 25, active_campaigns: 18, total_ads: 120, account_status: "connected" } };
    }),
};

export const api = ONBOARDING.mode === "backend" ? backend : mock;
export const isMock = ONBOARDING.mode !== "backend";
