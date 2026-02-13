import React, { useState, useMemo, useCallback } from 'react';
import { PricingState, PricingBreakdown, CurrencyType } from './types.ts';
import { Header } from './components/Header.tsx';
import { InputCard } from './components/InputCard.tsx';
import { ResultsCard } from './components/ResultsCard.tsx';
import AdvicePanel from "./components/AdvicePanel.tsx";

const WHOLESALE_APP_BASE_URL = 'https://wholesaleprice.ixiacreativestudio.com/';

const App: React.FC = () => {
  const [currency, setCurrency] = useState<CurrencyType>('DOLLAR');
  const [state, setState] = useState<PricingState>({
    productName: '',
    hourlyRate: 25,
    timeTaken: 1,
    materials: 0,
    overheads: 0,
    extras: 0,
    profitMargin: 40,
  });

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

  // Build link to Wholesale app with prefilled values
  const wholesalePrefillUrl = useMemo(() => {
    const params = new URLSearchParams();

    // 1) Product name
    if (state.productName?.trim()) {
      params.set('productName', state.productName.trim());
    }

    // 2) Target retail (use suggested price from MakerPrice)
    params.set('targetRetail', String(breakdown.suggestedPrice));

    // 3) Hard costs ONLY (money you actually spend):
    // materials + overheads + extras/packaging. Do NOT include labour.
    const hardCosts = state.materials + state.overheads + state.extras;
    params.set('productionCost', String(hardCosts));

    // 4) Time taken (hours)
    params.set('timeTaken', String(state.timeTaken));

    // 5) Ideal Hourly Rate
    params.set("idealHourlyRate", String(state.hourlyRate));

    const qs = params.toString();
    return qs ? `${WHOLESALE_APP_BASE_URL}?${qs}` : WHOLESALE_APP_BASE_URL;
  }, [state.productName, state.timeTaken, state.materials, state.overheads, state.extras, breakdown.suggestedPrice]);

  return (
    <div className="min-h-screen bg-brand-beige pb-20">
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
              <AdvicePanel state={state} results={breakdown} />

              {/* Link to Wholesale Price Checker with prefills */}
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
  );
};

export default App;
