import React from 'react';
import { CurrencyType, CURRENCY_CONFIG } from '../types.ts';

interface HeaderProps {
  currency: CurrencyType;
  onCurrencyChange: (type: CurrencyType) => void;
}

export const Header: React.FC<HeaderProps> = ({ currency, onCurrencyChange }) => {
  return (
    <header className="ixia-header pt-8 pb-14 relative border-none ixia-font-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex flex-col md:flex-row items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-1 text-center">
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-50">
            Ixia Creative
          </span>

          <h1 className="text-2xl md:text-3xl font-light tracking-tight">
            Product Pricing Guide
          </h1>

          <p className="font-medium ixia-header-muted text-xs italic pt-0.5 ixia-font-body">
            Value your craft. Value your time.
          </p>
        </div>

        <div className="mt-6 md:mt-0 md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 ixia-font-body">
          <div className="flex items-center space-x-2 ixia-currency-pill rounded-xl px-3 py-1.5">
            <label
              htmlFor="currency-select"
              className="text-[9px] font-black uppercase tracking-widest ixia-header-muted"
            >
              Currency
            </label>

            <select
              id="currency-select"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyType)}
              className="bg-transparent text-xs font-bold ixia-select-accent focus:outline-none cursor-pointer"
            >
              {(Object.keys(CURRENCY_CONFIG) as CurrencyType[]).map((key) => (
                <option key={key} value={key} className="ixia-select-option">
                  {CURRENCY_CONFIG[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
