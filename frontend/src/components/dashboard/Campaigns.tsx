"use client";

import { Fragment, useState } from "react";
import { CAMPAIGNS, TOTALS, inr, type AdGroup, type Campaign } from "@/lib/dashboard-data";

const SUMMARY_ACCOUNT_COST = TOTALS.current.cost;
import { Chevron } from "./Dashboard";
import { Collapse } from "./motion";

/**
 * Campaign table. Default columns carry the decision fields; a row expands (inline,
 * animated) to the full campaign record and its ad groups. Missing stays missing:
 * nothing renders as zero unless the source supplied a zero.
 */
const pctOf = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : (a / b) * 100);
const show = (v: string | number | null | undefined, f?: (n: number) => string) =>
  v === null || v === undefined ? null : typeof v === "number" && f ? f(v) : String(v);
const isShare = (n: number) => `${n.toFixed(1)}%`;

export function Campaigns() {
  const [open, setOpen] = useState<string | null>(null);
  const campaignCost = CAMPAIGNS.reduce((a, c) => a + c.cost, 0);
  const campaignConv = CAMPAIGNS.reduce((a, c) => a + c.conversions, 0);

  return (
    <div data-reveal className="dcard mt-6 p-6 sm:p-8">
      <div className="relative -mx-6 overflow-x-auto px-6 sm:-mx-8 sm:px-8">
        <table className="dtable min-w-[920px]">
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col" className="num">
                Cost · share
              </th>
              <th scope="col" className="num">
                Conv. · share
              </th>
              <th scope="col" className="num">
                CPA
              </th>
              <th scope="col" className="num">
                Budget · utilisation
              </th>
              <th scope="col">Search budget lost IS</th>
              <th scope="col">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {CAMPAIGNS.map((c) => {
              const isOpen = open === c.id;
              const derivedCpa = c.cost / c.conversions;
              const cpaMismatch = Math.abs(derivedCpa - c.cpa) >= 0.005;
              return (
                <Fragment key={c.id}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : c.id)}
                    className={`cursor-pointer transition-colors duration-200 hover:bg-surface/50 ${isOpen ? "bg-surface/60" : ""}`}
                  >
                    <th scope="row" className="!text-ink">
                      <span className="block font-medium">{c.campaign_name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
                        {c.channel_type}
                        <StatusPair status={c.status} primary={c.primary_status} reasons={c.primary_status_reasons} />
                      </span>
                    </th>
                    <td className="num">
                      <span className="block font-medium">{inr(c.cost)}</span>
                      <span className="text-caption text-ink-muted">{isShare(pctOf(c.cost, SUMMARY_ACCOUNT_COST)!)} of account</span>
                    </td>
                    <td className="num">
                      <span className="block">{c.conversions}</span>
                      <span className="text-caption text-ink-muted">{isShare(pctOf(c.conversions, campaignConv)!)}</span>
                    </td>
                    <td className="num">
                      <span className="font-medium">{inr(c.cpa, 2)}</span>
                      {cpaMismatch && (
                        <span className="block text-caption text-gold-text" title={`Supplied ${inr(c.cpa, 2)}; cost ÷ conversions = ${inr(derivedCpa, 2)}. Validate against raw records.`}>
                          Computed {inr(derivedCpa, 2)} · validate
                        </span>
                      )}
                    </td>
                    <td className="num">
                      <Missing v={show(c.budget_amount, (n) => inr(n))} />
                      <span className="block text-caption">
                        <Missing v={show(c.budget_utilisation, isShare)} />
                      </span>
                    </td>
                    <td>
                      {c.search_budget_lost_is !== null ? (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface">
                            <span data-bar className="block h-full rounded-full bg-gold" style={{ width: `${c.search_budget_lost_is}%` }} />
                          </span>
                          <span className="tabular-nums">{c.search_budget_lost_is}%</span>
                        </span>
                      ) : (
                        <Missing v={null} label={c.channel_type === "SEARCH" ? "Not supplied" : "Search only"} />
                      )}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`camp-${c.id}`}
                        aria-label={`${isOpen ? "Hide" : "Show"} details for ${c.campaign_name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(isOpen ? null : c.id);
                        }}
                        className="ml-auto grid size-10 place-items-center rounded-full text-ink-muted transition hover:bg-raised hover:text-ink"
                      >
                        <span className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                          <Chevron />
                        </span>
                      </button>
                    </td>
                  </tr>
                  <tr aria-hidden={!isOpen}>
                    <td colSpan={7} className="!border-0 !p-0">
                      <Collapse open={isOpen} id={`camp-${c.id}`}>
                        <CampaignDetail c={c} cost={campaignCost} />
                      </Collapse>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-caption text-ink-muted">
        Campaign costs total {inr(campaignCost)}; account cost is {inr(SUMMARY_ACCOUNT_COST)}. Both source values are kept; reconciliation
        needed. <span className="text-ink">Status</span> is the owner&rsquo;s switch (ENABLED / PAUSED);{" "}
        <span className="text-ink">primary_status</span> is Google&rsquo;s serving verdict.
      </p>
    </div>
  );
}

/** Owner's switch vs Google's verdict, never merged into one label. */
function StatusPair({ status, primary, reasons }: { status: string | null; primary: string | null; reasons: string | null }) {
  return (
    <>
      <span className="rounded-full bg-surface px-2 py-0.5" title="status: the owner's ENABLED/PAUSED switch">
        Switch · {status ?? <i>not supplied</i>}
      </span>
      <span className={`rounded-full px-2 py-0.5 ${primary === "LIMITED" ? "bg-butter text-gold-text" : "bg-surface"}`} title="primary_status: Google's serving verdict">
        Serving · {primary ?? <i>not supplied</i>}
        {reasons ? ` · ${reasons}` : ""}
      </span>
    </>
  );
}

function CampaignDetail({ c, cost }: { c: Campaign; cost: number }) {
  const search = c.channel_type === "SEARCH";
  const is = (v: number | null) => (search ? show(v, isShare) : "Unavailable · non-Search");
  const target =
    c.target_cpa === "none" ? "No target set" : c.target_cpa === null ? null : `${inr(c.cpa, 2)} vs ${inr(c.target_cpa, 2)}`;
  const fields: [string, string | null][] = [
    ["primary_status_reasons", c.primary_status_reasons],
    ["bidding_strategy_type", c.bidding_strategy_type],
    ["target_cpa", c.target_cpa === "none" ? "No target set" : show(c.target_cpa, (n) => inr(n, 2))],
    ["CPA vs target", target],
    ["Impressions", show(c.impressions, (n) => n.toLocaleString("en-IN"))],
    ["Clicks", show(c.clicks, (n) => n.toLocaleString("en-IN"))],
    ["CTR", show(pctOf(c.clicks, c.impressions), isShare)],
    ["CPC", show(c.clicks ? c.cost / c.clicks : null, (n) => inr(n, 2))],
    ["CVR", show(pctOf(c.conversions, c.clicks), isShare)],
    ["search_impression_share", is(c.search_impression_share)],
    ["search_rank_lost_is", is(c.search_rank_lost_is)],
    ["search_top_is", is(c.search_top_is)],
    ["search_abs_top_is", is(c.search_abs_top_is)],
    ["Share of campaign-total spend", show(pctOf(c.cost, cost), isShare)],
  ];
  return (
    <div className="mb-4 rounded-lg bg-surface/60 p-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
        {fields.map(([k, v]) => (
          <Field key={k} k={k} v={v} />
        ))}
      </dl>
      <div className="mt-6 border-t border-line pt-6">
        <p className="text-caption font-medium text-ink-muted">Ad groups · {c.ad_groups.length || "none supplied"}</p>
        {c.ad_groups.map((g) => (
          <AdGroupRow key={g.ad_group_name} g={g} campaign={c} />
        ))}
      </div>
    </div>
  );
}

function AdGroupRow({ g, campaign }: { g: AdGroup; campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const fields: [string, string | null][] = [
    ["status", g.status],
    ["primary_status", g.primary_status],
    ["cost", show(g.cost, (n) => inr(n))],
    ["Share of campaign spend", show(pctOf(g.cost, campaign.cost), isShare)],
    ["conversions", show(g.conversions)],
    ["Share of campaign conversions", show(pctOf(g.conversions, campaign.conversions), isShare)],
    ["Impressions", show(g.impressions, (n) => n.toLocaleString("en-IN"))],
    ["Clicks", show(g.clicks, (n) => n.toLocaleString("en-IN"))],
    ["CTR", show(pctOf(g.clicks, g.impressions), isShare)],
    ["CPC", show(g.cost !== null && g.clicks ? g.cost / g.clicks : null, (n) => inr(n, 2))],
    ["CVR", show(pctOf(g.conversions, g.clicks), isShare)],
    ["CPA", show(g.cost !== null && g.conversions ? g.cost / g.conversions : null, (n) => inr(n, 2))],
    ["search_impression_share", show(g.search_impression_share, isShare)],
    ["search_rank_lost_is", show(g.search_rank_lost_is, isShare)],
    ["cpc_bid", show(g.cpc_bid, (n) => inr(n, 2))],
    ["effective_target_cpa", show(g.effective_target_cpa, (n) => inr(n, 2))],
    ["effective_target_cpa_source", g.effective_target_cpa_source],
  ];
  return (
    <div className="mt-4 rounded-md bg-raised">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 rounded-md p-4 text-left transition-colors hover:bg-surface/40"
      >
        <span>
          <span className="block text-caption text-ink-muted">ad_group_name</span>
          <span className="text-small font-medium">{g.ad_group_name}</span>
        </span>
        <span className={`text-ink-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <Chevron />
        </span>
      </button>
      <Collapse open={open}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map(([k, v]) => (
            <Field key={k} k={k} v={v} />
          ))}
        </dl>
      </Collapse>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-caption text-ink-muted" title={k}>
        {k}
      </dt>
      <dd className="mt-1 text-small">
        <Missing v={v} />
      </dd>
    </div>
  );
}

function Missing({ v, label = "Not supplied" }: { v: string | null; label?: string }) {
  return v === null ? <span className="text-ink-muted/70">{label}</span> : <span className="font-medium tabular-nums">{v}</span>;
}
