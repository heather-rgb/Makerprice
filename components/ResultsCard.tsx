import React from 'react';
import { PricingState, PricingBreakdown, CurrencyType, CURRENCY_CONFIG } from '../types.ts';

interface ResultsCardProps {
  state: PricingState;
  breakdown: PricingBreakdown;
  currency: CurrencyType;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({ state, breakdown, currency }) => {
  const { locale } = CURRENCY_CONFIG[currency];

  const formatCurrency = (val: number) => {
    const isoCode = currency === 'DOLLAR' ? 'USD' : currency === 'POUND' ? 'GBP' : 'EUR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: isoCode,
      currencyDisplay: 'symbol'
    }).format(val);
  };

  const friendlyPrice = Math.floor(breakdown.suggestedPrice * 2) / 2;
  const totalEarned = breakdown.laborCost + breakdown.profitAmount;

  return (
    <div className="ixia-surface-elevated ixia-text-body ixia-font-body rounded-3xl shadow-2xl overflow-hidden border border-brand-earth/10 transition-all duration-300">
      <div className="p-8 text-center space-y-4 border-b border-brand-beige-dusty ixia-panel-muted">
        <h3 className="ixia-text-muted text-sm font-black uppercase tracking-[0.2em] font-heading">
          Suggested Retail Price
        </h3>

        <div className="flex items-center justify-center">
          <span className="text-6xl font-black ixia-accent tracking-tighter font-heading">
            {formatCurrency(friendlyPrice)}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm italic font-medium ixia-text-muted">
            {state.productName ? `Pricing for "${state.productName}"` : 'Based on your current setup'}
          </p>
          <p className="text-xs italic font-medium ixia-text-faint">
            (Actual total: {formatCurrency(breakdown.suggestedPrice)})
          </p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex justify-between items-start border-b border-brand-beige-dusty pb-4">
          <div className="flex flex-col">
            <span className="ixia-text-heading font-bold font-heading">Your Maker Wage</span>
            <span className="text-[10px] ixia-text-muted font-medium italic mt-1 leading-tight">
              Direct payment for your hands
            </span>
          </div>
          <span className="text-xl font-bold ixia-text-heading">{formatCurrency(breakdown.laborCost)}</span>
        </div>

        <div className="flex justify-between items-center border-b border-brand-beige-dusty pb-4">
          <span className="ixia-text-muted font-medium">Expenses & Materials</span>
          <span className="font-bold ixia-text-heading">
            {formatCurrency(state.materials + state.overheads + state.extras)}
          </span>
        </div>

        <div className="flex justify-between items-start border-b border-brand-beige-dusty pb-4">
          <div className="flex flex-col">
            <span className="ixia-text-muted font-bold font-heading">Business Profit</span>
            <span className="text-[10px] ixia-text-muted font-medium italic mt-1 leading-tight">
              Funds for brand growth
            </span>
          </div>
          <span className="text-xl font-bold ixia-text-muted">{formatCurrency(breakdown.profitAmount)}</span>
        </div>

        <div className="ixia-surface-muted p-6 rounded-2xl border-2 border-brand-clay/10 shadow-md">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="ixia-text-heading font-black uppercase tracking-widest text-xs mb-1 font-heading">
                Total You Earn per Sale
              </span>
              <span className="ixia-text-muted text-[10px] font-bold">(Wage + Profit)</span>
            </div>
            <span className="text-4xl font-black ixia-accent font-heading">
              {formatCurrency(totalEarned)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-brand-beige-dusty/50 font-heading">
        <button
          className="w-full ixia-btn-primary font-black py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl"
          onClick={() => window.print()}
        >
          <i className="fa-solid fa-file-pdf"></i>
          <span>Save Quote as PDF</span>
        </button>
      </div>
    </div>
  );
};
