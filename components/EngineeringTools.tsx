"use client";

import { useMemo, useState } from "react";
import { Calculator, Check, Clipboard, Paintbrush, RotateCcw, Ruler, TrendingUp, Layers3 } from "lucide-react";

type ToolKey = "concrete" | "surface" | "rebar" | "margin";

function NumberField({ id, label, value, onChange, min = 0, step = "any", suffix, help }: {
  id: string; label: string; value: number; onChange: (value: number) => void; min?: number; step?: number | string; suffix?: string; help?: string;
}) {
  return <div className="field tool-field">
    <label htmlFor={id}>{label}</label>
    <div className="tool-number-wrap"><input id={id} type="number" min={min} step={step} inputMode="decimal" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number.isFinite(Number(event.target.value)) ? Math.max(min, Number(event.target.value)) : min)} />{suffix ? <span>{suffix}</span> : null}</div>
    {help ? <span className="field-help">{help}</span> : null}
  </div>;
}

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const number = (value: number, digits = 2) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);

export function EngineeringTools() {
  const [active, setActive] = useState<ToolKey>("concrete");
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [concrete, setConcrete] = useState({ length: 4, width: 3, depth: 0.15, allowance: 5 });
  const [surface, setSurface] = useState({ walls: 4, length: 4, height: 3, openings: 4, coats: 2, coverage: 10, allowance: 8 });
  const [rebar, setRebar] = useState({ diameter: 12, lengthPerBar: 12, quantity: 100, allowance: 3 });
  const [margin, setMargin] = useState({ revenue: 2500000, cost: 2050000, contingency: 5 });

  const concreteResult = useMemo(() => {
    const net = concrete.length * concrete.width * concrete.depth;
    const allowance = net * concrete.allowance / 100;
    return { net, allowance, total: net + allowance };
  }, [concrete]);
  const surfaceResult = useMemo(() => {
    const gross = surface.walls * surface.length * surface.height;
    const net = Math.max(0, gross - surface.openings);
    const litres = net * surface.coats / Math.max(0.1, surface.coverage) * (1 + surface.allowance / 100);
    return { gross, net, litres };
  }, [surface]);
  const rebarResult = useMemo(() => {
    const unitWeight = rebar.diameter * rebar.diameter / 162;
    const netLength = rebar.lengthPerBar * rebar.quantity;
    const netWeight = unitWeight * netLength;
    const allowance = netWeight * rebar.allowance / 100;
    return { unitWeight, netLength, netWeight, allowance, total: netWeight + allowance };
  }, [rebar]);
  const marginResult = useMemo(() => {
    const buffer = margin.cost * margin.contingency / 100;
    const planned = margin.cost + buffer;
    const contribution = margin.revenue - planned;
    return { buffer, planned, contribution, percentage: margin.revenue > 0 ? contribution / margin.revenue * 100 : 0 };
  }, [margin]);

  const currentSummary = useMemo(() => {
    if (active === "concrete") return `Concrete volume estimate\nNet geometric volume: ${number(concreteResult.net)} m³\nPlanning allowance (${number(concrete.allowance, 1)}%): ${number(concreteResult.allowance)} m³\nIndicative planning quantity: ${number(concreteResult.total)} m³\nDimensions: ${number(concrete.length)} m × ${number(concrete.width)} m × ${number(concrete.depth)} m`;
    if (active === "surface") return `Paint / coating estimate\nNet area after openings: ${number(surfaceResult.net)} m²\nCoats: ${surface.coats}\nCoverage input: ${number(surface.coverage, 1)} m²/L\nIndicative quantity with ${number(surface.allowance, 1)}% allowance: ${number(surfaceResult.litres, 1)} L`;
    if (active === "rebar") return `Reinforcement bar weight estimate\nBar diameter: ${rebar.diameter} mm\nBars: ${number(rebar.quantity, 0)} × ${number(rebar.lengthPerBar)} m\nNet theoretical steel weight: ${number(rebarResult.netWeight, 2)} kg\nPlanning allowance: ${number(rebarResult.allowance, 2)} kg\nIndicative planning weight: ${number(rebarResult.total, 2)} kg`;
    return `Project margin scenario\nContract / revenue input: ${money(margin.revenue)}\nEstimated cost: ${money(margin.cost)}\nContingency: ${money(marginResult.buffer)}\nCost including contingency: ${money(marginResult.planned)}\nIndicative contribution: ${money(marginResult.contribution)} (${number(marginResult.percentage, 1)}%)`;
  }, [active, concrete, concreteResult, margin, marginResult, rebar, rebarResult, surface, surfaceResult]);

  function resetCurrent() {
    setCopied(false); setFeedback("");
    if (active === "concrete") setConcrete({ length: 4, width: 3, depth: 0.15, allowance: 5 });
    if (active === "surface") setSurface({ walls: 4, length: 4, height: 3, openings: 4, coats: 2, coverage: 10, allowance: 8 });
    if (active === "rebar") setRebar({ diameter: 12, lengthPerBar: 12, quantity: 100, allowance: 3 });
    if (active === "margin") setMargin({ revenue: 2500000, cost: 2050000, contingency: 5 });
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(currentSummary);
      setCopied(true); setFeedback("Result summary copied. Review the assumptions before using it.");
    } catch {
      setCopied(false); setFeedback("Clipboard access is unavailable in this browser. Select the result values and copy them manually.");
    }
  }

  const tabs: { key: ToolKey; label: string; icon: typeof Calculator; description: string }[] = [
    { key: "concrete", label: "Concrete volume", icon: Ruler, description: "Rectangular volume with a separate planning allowance." },
    { key: "surface", label: "Paint & coating", icon: Paintbrush, description: "Surface area and approximate litres based on your coverage input." },
    { key: "rebar", label: "Rebar weight", icon: Layers3, description: "Theoretical reinforcement bar weight based on diameter and total length." },
    { key: "margin", label: "Margin scenario", icon: TrendingUp, description: "A simple revenue-versus-cost scenario with contingency." }
  ];

  return <div className="tools-workbench">
    <div className="tools-tabs" role="tablist" aria-label="Engineering calculators">
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} id={`tool-tab-${key}`} className={`tools-tab${active === key ? " is-active" : ""}`} type="button" role="tab" aria-selected={active === key} aria-controls="tool-panel" onClick={() => { setActive(key); setFeedback(""); setCopied(false); }}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}
    </div>
    <div className="tools-panel-grid">
      <section id="tool-panel" className="tools-input-panel" role="tabpanel" aria-labelledby={`tool-tab-${active}`}>
        {active === "concrete" ? <>
          <div className="tool-panel-heading"><span className="tool-panel-icon"><Ruler size={20} /></span><div><h2>Concrete volume</h2><p>For a simple rectangular element, enter dimensions in metres.</p></div></div>
          <div className="form-grid"><NumberField id="concrete-length" label="Length" value={concrete.length} onChange={(length) => setConcrete((v) => ({ ...v, length }))} suffix="m" /><NumberField id="concrete-width" label="Width" value={concrete.width} onChange={(width) => setConcrete((v) => ({ ...v, width }))} suffix="m" /><NumberField id="concrete-depth" label="Depth / thickness" value={concrete.depth} onChange={(depth) => setConcrete((v) => ({ ...v, depth }))} suffix="m" step="0.01" /><NumberField id="concrete-allowance" label="Planning allowance" value={concrete.allowance} onChange={(allowance) => setConcrete((v) => ({ ...v, allowance: Math.min(100, allowance) }))} suffix="%" step="1" help="A separate assumption; confirm for your project." /></div>
          <div className="tool-formula"><strong>Formula</strong><code>Length × width × depth</code><span>The allowance is added after the net geometric volume.</span></div>
        </> : null}
        {active === "surface" ? <>
          <div className="tool-panel-heading"><span className="tool-panel-icon tool-panel-icon-green"><Paintbrush size={20} /></span><div><h2>Paint & coating</h2><p>Estimate material volume from a simple wall-area input.</p></div></div>
          <div className="form-grid"><NumberField id="surface-walls" label="Number of walls" value={surface.walls} onChange={(walls) => setSurface((v) => ({ ...v, walls: Math.min(10000, Math.floor(walls)) }))} step="1" /><NumberField id="surface-length" label="Average wall length" value={surface.length} onChange={(length) => setSurface((v) => ({ ...v, length }))} suffix="m" /><NumberField id="surface-height" label="Wall height" value={surface.height} onChange={(height) => setSurface((v) => ({ ...v, height }))} suffix="m" /><NumberField id="surface-openings" label="Total openings area" value={surface.openings} onChange={(openings) => setSurface((v) => ({ ...v, openings }))} suffix="m²" /><NumberField id="surface-coats" label="Number of coats" value={surface.coats} onChange={(coats) => setSurface((v) => ({ ...v, coats: Math.max(1, Math.min(10, Math.floor(coats))) }))} step="1" /><NumberField id="surface-coverage" label="Product coverage" value={surface.coverage} onChange={(coverage) => setSurface((v) => ({ ...v, coverage: Math.max(0.1, coverage) }))} suffix="m²/L" help="Use the product label's coverage figure." /><NumberField id="surface-allowance" label="Planning allowance" value={surface.allowance} onChange={(allowance) => setSurface((v) => ({ ...v, allowance: Math.min(100, allowance) }))} suffix="%" step="1" /></div>
          <div className="tool-formula"><strong>Formula</strong><code>(wall area − openings) × coats ÷ coverage</code><span>Actual coverage varies with substrate, application and product conditions.</span></div>
        </> : null}
        {active === "rebar" ? <>
          <div className="tool-panel-heading"><span className="tool-panel-icon tool-panel-icon-green"><Layers3 size={20} /></span><div><h2>Reinforcement bar weight</h2><p>Calculate theoretical steel mass from bar diameter and total length.</p></div></div>
          <div className="form-grid"><NumberField id="rebar-diameter" label="Nominal bar diameter" value={rebar.diameter} onChange={(diameter) => setRebar((v) => ({ ...v, diameter: Math.min(100, diameter) }))} suffix="mm" step="1" /><NumberField id="rebar-length" label="Length per bar" value={rebar.lengthPerBar} onChange={(lengthPerBar) => setRebar((v) => ({ ...v, lengthPerBar }))} suffix="m" step="0.1" /><NumberField id="rebar-quantity" label="Number of bars" value={rebar.quantity} onChange={(quantity) => setRebar((v) => ({ ...v, quantity: Math.min(10000000, Math.floor(quantity)) }))} step="1" /><NumberField id="rebar-allowance" label="Planning allowance" value={rebar.allowance} onChange={(allowance) => setRebar((v) => ({ ...v, allowance: Math.min(100, allowance) }))} suffix="%" step="1" help="Use your project-approved allowance." /></div>
          <div className="tool-formula"><strong>Formula</strong><code>Unit weight ≈ diameter² ÷ 162 kg/m</code><span>The theoretical formula does not include cutting schedules, laps, bends, couplers or actual mill tolerances.</span></div>
        </> : null}
        {active === "margin" ? <>
          <div className="tool-panel-heading"><span className="tool-panel-icon"><TrendingUp size={20} /></span><div><h2>Project margin scenario</h2><p>A simplified planning scenario, not a quote or accounting result.</p></div></div>
          <div className="form-grid"><NumberField id="margin-revenue" label="Contract value / revenue" value={margin.revenue} onChange={(revenue) => setMargin((v) => ({ ...v, revenue }))} suffix="₹" step="1000" /><NumberField id="margin-cost" label="Estimated cost" value={margin.cost} onChange={(cost) => setMargin((v) => ({ ...v, cost }))} suffix="₹" step="1000" /><NumberField id="margin-contingency" label="Contingency on estimated cost" value={margin.contingency} onChange={(contingency) => setMargin((v) => ({ ...v, contingency: Math.min(100, contingency) }))} suffix="%" step="1" /></div>
          <div className="tool-formula"><strong>Formula</strong><code>Revenue − (estimated cost + contingency)</code><span>Taxes, finance cost, retention, timing and contract conditions are not included unless reflected in your inputs.</span></div>
        </> : null}
        <div className="tools-actions"><button className="button button-primary button-small" type="button" onClick={() => window.print()}>Print result</button><button className="button button-outline button-small" type="button" onClick={resetCurrent}><RotateCcw size={14} /> Reset calculator</button><button className="button button-quiet button-small" type="button" onClick={() => void copyResult()}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy result"}</button></div>
        {feedback ? <p className="tools-feedback" role="status">{feedback}</p> : null}
      </section>
      <aside className="tools-results" aria-live="polite">
        <div className="tools-results-header"><span className="eyebrow">LIVE ESTIMATE</span><span className="tools-live-dot">UPDATES AS YOU TYPE</span></div>
        {active === "concrete" ? <>
          <p className="tool-result-label">Indicative planning quantity</p><p className="tool-result-main">{number(concreteResult.total)} <span>m³</span></p><div className="tool-result-breakdown"><div><span>Net volume</span><strong>{number(concreteResult.net)} m³</strong></div><div><span>Allowance</span><strong>{number(concreteResult.allowance)} m³</strong></div></div><div className="tool-result-track"><span style={{ width: `${concrete.allowance === 0 ? 0 : Math.min(50, concrete.allowance / 2)}%` }} /></div><p className="tool-result-note">This is a geometric estimate for a rectangular element, not a concrete mix design or an instruction to order material.</p>
        </> : null}
        {active === "surface" ? <>
          <p className="tool-result-label">Indicative product quantity</p><p className="tool-result-main">{number(surfaceResult.litres, 1)} <span>litres</span></p><div className="tool-result-breakdown"><div><span>Gross wall area</span><strong>{number(surfaceResult.gross)} m²</strong></div><div><span>Net after openings</span><strong>{number(surfaceResult.net)} m²</strong></div><div><span>Surface coats</span><strong>{surface.coats}</strong></div></div><p className="tool-result-note">Follow manufacturer instructions and verify substrate condition, primer, application losses and actual coverage before purchasing.</p>
        </> : null}
        {active === "rebar" ? <>
          <p className="tool-result-label">Indicative planning weight</p><p className="tool-result-main">{number(rebarResult.total, 2)} <span>kg</span></p><div className="tool-result-breakdown"><div><span>Theoretical unit weight</span><strong>{number(rebarResult.unitWeight, 3)} kg/m</strong></div><div><span>Total bar length</span><strong>{number(rebarResult.netLength)} m</strong></div><div><span>Net theoretical weight</span><strong>{number(rebarResult.netWeight, 2)} kg</strong></div><div><span>Allowance</span><strong>{number(rebarResult.allowance, 2)} kg</strong></div></div><p className="tool-result-note">Confirm bar bending schedules, lap lengths, hooks, couplers, grade, diameter and project-specific measurement rules before procurement or reconciliation.</p>
        </> : null}
        {active === "margin" ? <>
          <p className="tool-result-label">Indicative contribution after contingency</p><p className="tool-result-main">{money(marginResult.contribution)}</p><span className={`tool-margin-pill${marginResult.contribution < 0 ? " is-negative" : ""}`}>{number(marginResult.percentage, 1)}% of revenue</span><div className="tool-result-breakdown"><div><span>Contingency value</span><strong>{money(marginResult.buffer)}</strong></div><div><span>Cost incl. contingency</span><strong>{money(marginResult.planned)}</strong></div><div><span>Revenue input</span><strong>{money(margin.revenue)}</strong></div></div><p className="tool-result-note">An indicative arithmetic scenario only. Confirm contract terms, taxes, financing, billing timing and all project cost records with the responsible professional.</p>
        </> : null}
        <div className="tool-result-footer"><span>NS / ENGINEERING TOOLS</span><span>Not for final design or approval</span></div>
      </aside>
    </div>
  </div>;
}
