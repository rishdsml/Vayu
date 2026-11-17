import { CONVERSIONS, conversionFlags } from "@/lib/dashboard-data";

/**
 * Conversion tracking health: issue summary (left), conversion action table (right).
 * Flags are computed from the rows. Counts not supplied stay missing, never zero.
 */
export function ConversionHealth() {
  const { rowFlags, summary, duplicatePrimary } = conversionFlags(CONVERSIONS);
  const total = CONVERSIONS.every((r) => r.conversions !== null) ? CONVERSIONS.reduce((a, r) => a + (r.conversions ?? 0), 0) : null;
  const dash = <span className="text-ink-muted/70">—</span>;

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div data-reveal className="dcard flex flex-col p-6 sm:p-8 lg:col-span-4">
        <span data-sev className="badge badge-attention self-start">
          Tracking issues found
        </span>
        <p className="num-light mt-6 text-[72px] leading-none" data-count={duplicatePrimary} data-format="int">
          {duplicatePrimary}
        </p>
        <p className="mt-2 text-small text-ink-muted">PRIMARY actions for the same lead-form category</p>
        <ul className="mt-8 flex flex-col text-small">
          {summary.map((f) => (
            <li key={f.text} className="flex gap-2 border-t border-line py-2">
              <span aria-hidden="true" className={`mt-2 size-1.5 shrink-0 rounded-full ${f.level === "attention" ? "bg-gold" : "border border-ink/30"}`} />
              <span className={f.level === "unknown" ? "text-ink-muted" : ""}>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div data-reveal className="dcard min-w-0 p-6 sm:p-8 lg:col-span-8">
        <div className="relative -mx-6 overflow-x-auto px-6 sm:-mx-8 sm:px-8">
          <table className="dtable min-w-[880px]">
            <thead>
              <tr>
                <th scope="col">conversion_action_name</th>
                <th scope="col">conversion_category</th>
                <th scope="col">action_optimization</th>
                <th scope="col">status</th>
                <th scope="col" className="num">
                  conversions
                </th>
                <th scope="col" className="num">
                  all_conversions
                </th>
                <th scope="col" className="num">
                  Gap
                </th>
                <th scope="col" className="num">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {CONVERSIONS.map((c) => {
                const flags = rowFlags(c);
                const gap = c.conversions !== null && c.all_conversions !== null ? c.all_conversions - c.conversions : null;
                const share = c.conversions !== null && total ? (c.conversions / total) * 100 : null;
                return (
                  <tr key={c.conversion_action_name} className={`transition-colors duration-200 hover:bg-surface/50 ${flags.length ? "bg-butter/15" : ""}`}>
                    <th scope="row" className="!text-ink">
                      <span className="font-medium">{c.conversion_action_name}</span>
                      {flags.map((f) => (
                        <span key={f} data-sev className="badge badge-attention ml-2 align-middle">
                          {f}
                        </span>
                      ))}
                    </th>
                    <td className="text-caption text-ink-muted">{c.conversion_category}</td>
                    <td>
                      <span className={`badge ${c.action_optimization === "PRIMARY" ? "bg-indigo/10 text-indigo-deep" : "bg-surface text-ink-muted"}`}>{c.action_optimization}</span>
                    </td>
                    <td className={c.status === "HIDDEN" ? "font-medium text-gold-text" : "text-ink-muted"}>{c.status}</td>
                    <td className="num">{c.conversions ?? dash}</td>
                    <td className="num">{c.all_conversions ?? dash}</td>
                    <td className="num">{gap ?? dash}</td>
                    <td className="num">{share !== null ? `${share.toFixed(1)}%` : dash}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-caption text-ink-muted">
          — means not supplied. conversions, all_conversions and shares per action are missing, so the gap and the zero-conversion check
          cannot be computed yet.
        </p>
      </div>
    </div>
  );
}
