import React from 'react';
import { CurrencyType, CURRENCY_CONFIG } from '../types.ts';

interface HeaderProps {
  currency: CurrencyType;
  onCurrencyChange: (type: CurrencyType) => void;
}

export const Header: React.FC<HeaderProps> = ({ currency, onCurrencyChange }) => {
  return (
    <header className="bg-brand-earth-light pt-8 pb-14 text-brand-heading relative border-none font-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex flex-col md:flex-row items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-1 text-center">
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-50">
            Ixia Creative
          </span>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">
            Product Pricing Guide
          </h1>
          <p className="font-medium text-brand-muted text-xs italic pt-0.5 font-body">
            Value your craft. Value your time.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 font-body">
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-brand-earth/5 rounded-xl px-3 py-1.5">
            <label htmlFor="currency-select" className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
              Currency
            </label>
            <select 
              id="currency-select"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyType)}
              className="bg-transparent text-xs font-bold text-brand-clay focus:outline-none cursor-pointer"
            >
              {(Object.keys(CURRENCY_CONFIG) as CurrencyType[]).map((key) => (
                <option key={key} value={key} className="bg-brand-beige text-brand-body">
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