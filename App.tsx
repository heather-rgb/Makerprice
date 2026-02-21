import React, { useState, useMemo, useCallback } from 'react';
import { PricingState, PricingBreakdown, CurrencyType, CURRENCY_CONFIG } from './types.ts';
import { Header } from './components/Header.tsx';
import { InputCard } from './components/InputCard.tsx';
import { ResultsCard } from './components/ResultsCard.tsx';
import AdvicePanel, { parseAdviceToSections } from "./components/AdvicePanel.tsx";

const WHOLESALE_APP_BASE_URL = 'https://wholesaleprice.ixiacreativestudio.com/';

const App: React.FC = () => {
  const [currency, setCurrency] = useState<CurrencyType>('DOLLAR');
  const currencyConfig = CURRENCY_CONFIG[currency];

  const [state, setState] = useState<PricingState>({
    productName: '',
    hourlyRate: 25,
    timeTaken: 1,
    materials: 0,
    overheads: 0,
    extras: 0,
    profitMargin: 40,
  });

  // NEW: capture generated advice so it can be printed in the report
  const [adviceMarkdown, setAdviceMarkdown] = useState<string>("");

  const breakdown = useMemo((): PricingBreakdown => {
    const laborCost = state.hourlyRate * state.timeTaken;
    const baseCost = laborCost + state.materials + state.overheads + state.extras;
    const profitAmount = baseCost * (state.profitMargin / 100);
    const suggestedPrice = baseCost + profitAmount;

    return {
      laborCost,
      baseCost,
      profitAmount,
      suggestedPrice,
    };
  }, [state]);

  const updateState = useCallback((key: keyof PricingState, value: any) => {
    setState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const wholesalePrefillUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (state.productName?.trim()) {
      params.set('productName', state.productName.trim());
    }

    params.set('targetRetail', String(breakdown.suggestedPrice));

    const hardCosts = state.materials + state.overheads + state.extras;
    params.set('productionCost', String(hardCosts));

    params.set('timeTaken', String(state.timeTaken));
    params.set("idealHourlyRate", String(state.hourlyRate));

    const qs = params.toString();
    return qs ? `${WHOLESALE_APP_BASE_URL}?${qs}` : WHOLESALE_APP_BASE_URL;
  }, [state.productName, state.timeTaken, state.materials, state.overheads, state.extras, breakdown.suggestedPrice]);

  // ---------- Print report helpers ----------
  const { locale } = currencyConfig;

  const formatCurrency = (val: number) => {
    const isoCode = currency === 'DOLLAR' ? 'USD' : currency === 'POUND' ? 'GBP' : 'EUR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: isoCode,
      currencyDisplay: 'symbol',
    }).format(val);
  };

  const friendlyPrice = Math.floor(breakdown.suggestedPrice * 2) / 2;
  const expensesAndMaterialsTotal = state.materials + state.overheads + state.extras;
  const totalEarned = breakdown.laborCost + breakdown.profitAmount;
  const printedOn = new Date().toLocaleDateString(locale);
  const currencyLabel =
    currency === 'DOLLAR' ? 'USD ($)' : currency === 'POUND' ? 'GBP (£)' : 'EUR (€)';

  return (
    <>
      {/* =========================
          SCREEN APP (unchanged)
          Wrapped as a single shell so print can hide it cleanly
          ========================= */}
      <div className="ixia-app-shell min-h-screen bg-brand-beige pb-20">
        <Header currency={currency} onCurrencyChange={setCurrency} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <InputCard
                state={state}
                onUpdate={updateState}
                currency={currency}
              />
            </div>

            <div className="lg:col-span-6">
              <div className="sticky top-8 space-y-4">
                <ResultsCard
                  state={state}
                  breakdown={breakdown}
                  currency={currency}
                />

                <AdvicePanel
                  state={state}
                  results={breakdown}
                  currencySymbol={currencyConfig.symbol}
                  onAdviceChange={setAdviceMarkdown}
                />

                <a
                  href={wholesalePrefillUrl}
                  className="block w-full text-center rounded-2xl ixia-btn-cta font-black py-4 px-6 transition border shadow-sm"
                >
                  Check wholesale viability
                </a>

                <p className="text-xs text-brand-earth/70 leading-relaxed px-1">
                  This will open the Wholesale Price Checker with your suggested retail price and hard costs pre-filled.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-20 text-center ixia-footer-text text-sm pb-10">
          <p>&copy; {new Date().getFullYear()} Ixia Creative Studio. Built for artisans and creators.</p>
        </footer>
      </div>

      {/* =========================
          PRINT REPORT (report-only)
          This is the ONLY thing visible in print
          ========================= */}
      <div className="ixia-print-only">
        <div className="ixia-print-report">
          <div className="ixia-print-section">
            <div className="ixia-print-title">
              MakerPrice Report{state.productName ? ` — ${state.productName}` : ''}
            </div>
            <div className="ixia-print-subtitle">
              Printed on {printedOn}
            </div>
          </div>

          <div className="ixia-print-section ixia-print-keep">
            <div className="ixia-print-h">Inputs</div>
            <div className="ixia-print-grid">
              <div className="ixia-print-kv">
                <div className="ixia-print-k">Product</div>
                <p className="ixia-print-v">{state.productName ? state.productName : 'Not specified'}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Currency</div>
                <p className="ixia-print-v">{currencyLabel}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Hourly rate</div>
                <p className="ixia-print-v">{formatCurrency(state.hourlyRate)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Time taken</div>
                <p className="ixia-print-v">{state.timeTaken} hour(s)</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Materials</div>
                <p className="ixia-print-v">{formatCurrency(state.materials)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Overheads</div>
                <p className="ixia-print-v">{formatCurrency(state.overheads)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Extras</div>
                <p className="ixia-print-v">{formatCurrency(state.extras)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Profit margin</div>
                <p className="ixia-print-v">{state.profitMargin}%</p>
              </div>
            </div>
          </div>

          <div className="ixia-print-section ixia-print-keep">
            <div className="ixia-print-h">Results</div>
            <div className="ixia-print-grid">
              <div className="ixia-print-kv">
                <div className="ixia-print-k">Suggested retail price</div>
                <p className="ixia-print-v">{formatCurrency(friendlyPrice)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Actual total</div>
                <p className="ixia-print-v">{formatCurrency(breakdown.suggestedPrice)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Your maker wage</div>
                <p className="ixia-print-v">{formatCurrency(breakdown.laborCost)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Expenses & materials</div>
                <p className="ixia-print-v">{formatCurrency(expensesAndMaterialsTotal)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Business buffer</div>
                <p className="ixia-print-v">{formatCurrency(breakdown.profitAmount)}</p>
              </div>

              <div className="ixia-print-kv">
                <div className="ixia-print-k">Total you earn per sale</div>
                <p className="ixia-print-v">{formatCurrency(totalEarned)}</p>
              </div>
            </div>
          </div>

          {!!adviceMarkdown && (
            <div className="ixia-print-section">
              <div className="ixia-print-h">Advice</div>

              {/* Preserve headings + list structure using the same parser */}
              {parseAdviceToSections(adviceMarkdown).map((sec, idx) => (
                <div key={idx} className="ixia-print-keep" style={{ marginBottom: "4mm" }}>
                  <div className="ixia-print-k" style={{ opacity: 1 }}>
                    {sec.title}
                  </div>

                  {sec.blocks.map((b, i) => {
                    if (b.kind === "p") {
                      // Keep your "Label: value" feel (simple)
                      return (
                        <p key={i} className="ixia-print-kv" style={{ margin: "0 0 2mm 0" }}>
                          {b.text}
                        </p>
                      );
                    }

                    if (b.kind === "ul") {
                      return (
                        <ul key={i} style={{ margin: "0 0 2mm 5mm", padding: 0 }}>
                          {b.items.map((it, j) => (
                            <li key={j} style={{ margin: "0 0 1mm 0" }}>
                              {it}
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <ol key={i} style={{ margin: "0 0 2mm 5mm", padding: 0 }}>
                        {b.items.map((it, j) => (
                          <li key={j} style={{ margin: "0 0 1mm 0" }}>
                            {it}
                          </li>
                        ))}
                      </ol>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default App;