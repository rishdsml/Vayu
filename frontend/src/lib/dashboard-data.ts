/**
 * Dashboard prototype data: SMS Lucknow. Every value below was supplied in the brief.
 * Anything not supplied is `null` and renders as missing ("Not supplied"), never as zero.
 * Money is already converted from micros to rupees. Replace this module with the backend
 * response when the dashboard API exists; field names mirror the source (campaign_name, …).
 */

export type Severity = "attention" | "watch" | "stable";
/** A lever's evaluation state. Zero findings is NOT the same as confirmed healthy. */
export type LeverState = "findings" | "no_findings" | "not_evaluated" | "unavailable";
export type LeverId = "measurement" | "repairs" | "budget" | "targeting" | "creative";

export const LEVERS: { id: LeverId; label: string; state: LeverState }[] = [
  { id: "measurement", label: "Measurement", state: "findings" },
  // The source reports "No findings" for these three; it does not say whether checks ran clean.
  { id: "repairs", label: "Repairs", state: "no_findings" },
  { id: "budget", label: "Budget & Bidding", state: "findings" },
  { id: "targeting", label: "Targeting", state: "no_findings" },
  { id: "creative", label: "Creative", state: "no_findings" },
];

export const LEVER_STATE_LABEL: Record<LeverState, string> = {
  findings: "Findings",
  no_findings: "No findings reported",
  not_evaluated: "Not evaluated",
  unavailable: "Data unavailable",
};

export const ACCOUNT = {
  name: "SMS Lucknow",
  customer_id: null as string | null, // 10-digit ID not supplied
  connected: true,
  range: { label: "31 Aug – 7 Sep 2026", days: 8 },
  comparison: { label: "24 – 30 Aug 2026", days: 7 },
  last_synced: null as string | null,
  health: "attention" as Severity,
};

export type Evidence = { metric: string; value: string; context: string };
export type Finding = {
  id: string;
  severity: Severity;
  lever: LeverId;
  entity: string;
  entityType: "Campaign" | "Conversion tracking";
  summary: string;
  evidence: Evidence[];
  /** Actual spend of the affected entity in the period (a fact), if one applies. */
  spend: number | null;
  /** Calculated monetary exposure. Not supplied for any finding yet. */
  moneyAtStake: number | null;
  action: string;
};

export const FINDINGS: Finding[] = [
  {
    id: "btech-budget",
    severity: "attention",
    lever: "budget",
    entity: "Campaign A",
    entityType: "Campaign",
    summary: "Missing 86.7% of eligible searches because the budget runs out.",
    evidence: [
      { metric: "search_budget_lost_is", value: "86.7%", context: "eligible searches missed" },
      { metric: "CPC", value: "₹16.63 → ₹31.07", context: "previous → current" },
      { metric: "Spend", value: "Down", context: "week over week" },
    ],
    spend: 12652,
    moneyAtStake: null,
    action: "Check whether the daily budget was cut, then raise it.",
  },
  {
    id: "duplicate-primary",
    severity: "attention",
    lever: "measurement",
    entity: "Duplicate primary lead tracking",
    entityType: "Conversion tracking",
    summary:
      "Two PRIMARY actions track the same lead-form category, potentially double-counting leads and splitting the bidding signal.",
    evidence: [
      { metric: "Lead form submit", value: "PRIMARY", context: "SUBMIT_LEAD_FORM" },
      { metric: "Lead form - Submit", value: "PRIMARY", context: "SUBMIT_LEAD_FORM" },
      { metric: "PRIMARY actions", value: "2", context: "same category" },
    ],
    spend: null,
    moneyAtStake: null,
    action: "Keep one PRIMARY and set the other to SECONDARY.",
  },
  {
    id: "mba-cpa",
    severity: "watch",
    lever: "budget",
    entity: "MBA Ads 2026",
    entityType: "Campaign",
    summary: "CPA is 62% higher than Campaign A.",
    evidence: [
      { metric: "CPA", value: "₹197.47", context: "MBA Ads 2026" },
      { metric: "CPA", value: "₹121.65", context: "Campaign A" },
      { metric: "Difference", value: "62%", context: "MBA higher" },
    ],
    spend: 2370,
    moneyAtStake: null,
    action: "Investigate before adding budget.",
  },
];

/** Account totals (period sums). Rates are derived total ÷ total in `metrics()`. */
export const TOTALS = {
  current: { cost: 15190, impressions: 4960, clicks: 694, conversions: 117, conversion_value: null as number | null },
  // Only an approximate previous cost was supplied.
  previous: { cost: 31000, impressions: null, clicks: null, conversions: null, conversion_value: null } as Record<string, number | null>,
  previousApprox: ["cost"],
};

type T = { cost: number | null; impressions: number | null; clicks: number | null; conversions: number | null; conversion_value: number | null };
const div = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : a / b);
/** Exact formulas from the specification. */
export function metrics(t: T) {
  return {
    cost: t.cost,
    impressions: t.impressions,
    clicks: t.clicks,
    conversions: t.conversions,
    CPA: div(t.cost, t.conversions), // SUM(cost) / SUM(conversions)
    CTR: div(t.clicks, t.impressions), // SUM(clicks) / SUM(impressions)
    CPC: div(t.cost, t.clicks), // SUM(cost) / SUM(clicks)
    CVR: div(t.conversions, t.clicks), // SUM(conversions) / SUM(clicks)
    ROAS: t.conversion_value ? div(t.conversion_value, t.cost) : null, // SUM(conversion_value) / SUM(cost)
  };
}

export type Campaign = {
  id: string;
  campaign_name: string;
  channel_type: string;
  /** Owner's switch (ENABLED / PAUSED). */
  status: string | null;
  /** Google's serving verdict. */
  primary_status: string | null;
  primary_status_reasons: string | null;
  bidding_strategy_type: string | null;
  /** number, "none" when the source says no target is set, null when not supplied. */
  target_cpa: number | "none" | null;
  budget_amount: number | null;
  budget_utilisation: number | null;
  cost: number;
  conversions: number;
  /** CPA as supplied by the source (kept even where it disagrees with cost ÷ conversions). */
  cpa: number;
  impressions: number | null;
  clicks: number | null;
  search_impression_share: number | null;
  search_budget_lost_is: number | null;
  search_rank_lost_is: number | null;
  search_top_is: number | null;
  search_abs_top_is: number | null;
  ad_groups: AdGroup[];
};

export type AdGroup = {
  ad_group_name: string;
  status: string | null;
  primary_status: string | null;
  cost: number | null;
  conversions: number | null;
  impressions: number | null;
  clicks: number | null;
  search_impression_share: number | null;
  search_rank_lost_is: number | null;
  cpc_bid: number | null;
  effective_target_cpa: number | null;
  effective_target_cpa_source: string | null;
};

const unknownCampaign = {
  status: null,
  primary_status_reasons: null,
  bidding_strategy_type: null,
  target_cpa: null,
  budget_amount: null,
  budget_utilisation: null,
  impressions: null,
  clicks: null,
  search_impression_share: null,
  search_rank_lost_is: null,
  search_top_is: null,
  search_abs_top_is: null,
};

export const CAMPAIGNS: Campaign[] = [
  {
    ...unknownCampaign,
    id: "btech",
    campaign_name: "Campaign A",
    channel_type: "SEARCH",
    primary_status: "LIMITED",
    primary_status_reasons: "Budget limited",
    cost: 12652,
    conversions: 104,
    cpa: 121.65,
    search_budget_lost_is: 86.7,
    ad_groups: [
      {
        ad_group_name: "Campaign A",
        status: null,
        primary_status: null,
        cost: null,
        conversions: null,
        impressions: null,
        clicks: null,
        search_impression_share: null,
        search_rank_lost_is: null,
        cpc_bid: null,
        effective_target_cpa: null,
        effective_target_cpa_source: null,
      },
    ],
  },
  { ...unknownCampaign, id: "mba", campaign_name: "MBA Ads 2026", channel_type: "SEARCH", primary_status: "ELIGIBLE", cost: 2370, conversions: 12, cpa: 197.47, search_budget_lost_is: null, ad_groups: [] },
  { ...unknownCampaign, id: "ug", campaign_name: "UG courses Lead Ads 2026", channel_type: "SEARCH", primary_status: null, cost: 169, conversions: 1, cpa: 169.0, search_budget_lost_is: null, ad_groups: [] },
];

export type ConversionAction = {
  conversion_action_name: string;
  conversion_category: string;
  action_optimization: "PRIMARY" | "SECONDARY";
  status: string;
  conversions: number | null;
  all_conversions: number | null;
};

const counts = { conversions: null, all_conversions: null };
export const CONVERSIONS: ConversionAction[] = [
  { conversion_action_name: "Lead form submit", conversion_category: "SUBMIT_LEAD_FORM", action_optimization: "PRIMARY", status: "ENABLED", ...counts },
  { conversion_action_name: "Lead form - Submit", conversion_category: "SUBMIT_LEAD_FORM", action_optimization: "PRIMARY", status: "ENABLED", ...counts },
  { conversion_action_name: "Calls from Ads", conversion_category: "PHONE_CALL_LEAD", action_optimization: "PRIMARY", status: "ENABLED", ...counts },
  { conversion_action_name: "Clicks to call", conversion_category: "CONTACT", action_optimization: "PRIMARY", status: "ENABLED", ...counts },
  { conversion_action_name: "Android installs (all other apps)", conversion_category: "DOWNLOAD", action_optimization: "SECONDARY", status: "ENABLED", ...counts },
  { conversion_action_name: "admissions.smslucknow.ac.in (web) purchase", conversion_category: "PURCHASE", action_optimization: "SECONDARY", status: "HIDDEN", ...counts },
];

/** Flags computed from the table, so they follow the data. */
export function conversionFlags(rows: ConversionAction[]) {
  const primaryByCat = new Map<string, number>();
  rows.filter((r) => r.action_optimization === "PRIMARY").forEach((r) => primaryByCat.set(r.conversion_category, (primaryByCat.get(r.conversion_category) ?? 0) + 1));
  const dupCats = [...primaryByCat].filter(([, n]) => n > 1).map(([c]) => c);
  const rowFlags = (r: ConversionAction) => {
    const f: string[] = [];
    if (r.action_optimization === "PRIMARY" && dupCats.includes(r.conversion_category)) f.push("Duplicate PRIMARY");
    if (r.status === "HIDDEN") f.push("Hidden");
    if (r.action_optimization === "PRIMARY" && r.conversions === 0) f.push("PRIMARY, zero conversions");
    return f;
  };
  const countsMissing = rows.every((r) => r.conversions === null);
  const summary = [
    ...dupCats.map((c) => ({ level: "attention" as const, text: `Duplicate PRIMARY actions for ${c}.` })),
    ...rows.filter((r) => r.status === "HIDDEN").map((r) => ({ level: "attention" as const, text: `${r.conversion_action_name} is HIDDEN.` })),
    countsMissing
      ? { level: "unknown" as const, text: "PRIMARY actions with zero conversions: cannot be checked until conversion counts are supplied." }
      : { level: "attention" as const, text: `${rows.filter((r) => r.action_optimization === "PRIMARY" && r.conversions === 0).length} PRIMARY actions with zero conversions.` },
  ];
  return { dupCats, rowFlags, summary, duplicatePrimary: rows.filter((r) => r.action_optimization === "PRIMARY" && dupCats.includes(r.conversion_category)).length };
}

/** Integrity checks: surfaced in the UI, never silently corrected. */
export const DATA_CHECKS = [
  { id: "window", title: "Reporting window", body: "31 Aug – 7 Sep is eight days; 24 – 30 Aug is seven. Confirm the intended seven-day window before comparing periods." },
  { id: "reconcile", title: "Campaign cost reconciliation", body: "Campaign costs sum to ₹15,191; account cost is ₹15,190. Both source values are kept." },
  { id: "mba-cpa", title: "MBA Ads 2026 CPA", body: "Supplied CPA is ₹197.47, but ₹2,370 ÷ 12 = ₹197.50. Validate against raw records before changing either." },
  { id: "daily", title: "Daily data", body: "The daily chart is an illustrative allocation that reconciles to the supplied totals. It is not Google Ads data; replace with campaigns_daily aggregates." },
  { id: "money", title: "Spend vs money at stake", body: "₹12,652 is campaign spend, not money at stake. No per-finding exposure has been calculated." },
  { id: "previous", title: "Previous period", body: "Only an approximate previous-period cost (~₹31,000) was supplied. No other previous values are shown." },
  { id: "unknowns", title: "Unavailable fields", body: "Customer ID, last-synced time, bidding strategy and most campaign and ad group fields were not supplied and stay unavailable." },
];

/* ---- Daily trend: ILLUSTRATIVE allocation that reconciles to the supplied totals ---- */
export const DATES = ["31 Aug", "1 Sep", "2 Sep", "3 Sep", "4 Sep", "5 Sep", "6 Sep", "7 Sep"];

function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.floor((total * w) / sum));
  out[weights.indexOf(Math.max(...weights))] += total - out.reduce((a, b) => a + b, 0); // totals stay exact
  return out;
}

const SHAPE = {
  btechCost: [16, 15, 14, 13, 12, 11, 10, 9],
  btechConv: [15, 14, 14, 13, 13, 12, 12, 11],
  mbaCost: [12, 13, 12, 12, 13, 12, 13, 13],
  mbaConv: [2, 1, 2, 1, 2, 1, 2, 1],
  ugCost: [0, 0, 0, 0, 1, 1, 1, 1],
  ugConv: [0, 0, 0, 0, 0, 1, 0, 0],
  clicks: [15, 14, 13, 13, 12, 12, 11, 10],
  impressions: [14, 14, 13, 13, 12, 12, 11, 11],
};

export const DAILY: Record<string, { cost: number[]; conversions: number[] }> = {
  btech: { cost: allocate(12652, SHAPE.btechCost), conversions: allocate(104, SHAPE.btechConv) },
  mba: { cost: allocate(2370, SHAPE.mbaCost), conversions: allocate(12, SHAPE.mbaConv) },
  ug: { cost: allocate(169, SHAPE.ugCost), conversions: allocate(1, SHAPE.ugConv) },
};
/** Account-only series: no campaign-level clicks or impressions were supplied. */
export const DAILY_CLICKS = allocate(694, SHAPE.clicks);
export const DAILY_IMPRESSIONS = allocate(4960, SHAPE.impressions);
/** Account daily cost reconciles to the account total (₹15,190), not the campaign sum. */
export const DAILY_ACCOUNT_COST = allocate(15190, DATES.map((_, i) => DAILY.btech.cost[i] + DAILY.mba.cost[i] + DAILY.ug.cost[i]));

export const inr = (n: number, dp = 0) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const pct = (n: number, dp = 1) => `${(n * 100).toFixed(dp)}%`;
