import React, { useState, useEffect } from 'react';
import { PricingState, CurrencyType, CURRENCY_CONFIG } from '../types.ts';
import { Modal } from './Modal.tsx';

interface InputCardProps {
  state: PricingState;
  onUpdate: (key: keyof PricingState, value: any) => void;
  currency: CurrencyType;
}

type WorkspacePreset = 'kitchen' | 'home' | 'pro' | null;

export const InputCard: React.FC<InputCardProps> = ({ state, onUpdate, currency }) => {
  const [activePreset, setActivePreset] = useState<WorkspacePreset>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { symbol, locale } = CURRENCY_CONFIG[currency];

  const formatValue = (val: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency === 'DOLLAR' ? 'USD' : currency === 'POUND' ? 'GBP' : 'EUR',
      currencyDisplay: 'symbol'
    }).format(val);
  };

  const presets = {
    kitchen: { label: 'Kitchen Table', rate: 0.5, icon: 'fa-utensils' },
    home: { label: 'Home Work Shop', rate: 1.5, icon: 'fa-house-chimney-window' },
    pro: { label: 'Pro Studio', rate: 3, icon: 'fa-building' }
  };

  const formatDuration = (decimalHours: number) => {
    const totalMinutes = Math.round(decimalHours * 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getMarginLabel = (margin: number) => {
    if (margin < 10) return { text: 'Basic', color: 'text-brand-muted' };
    if (margin <= 35) return { text: 'Healthy', color: 'text-brand-muted' };
    if (margin <= 60) return { text: 'Professional', color: 'text-brand-clay' };
    return { text: 'Premium', color: 'text-brand-clay' };
  };

  useEffect(() => {
    if (activePreset) {
      const presetRate = presets[activePreset].rate;
      const calculatedOverhead = Math.round((state.timeTaken * presetRate) * 100) / 100;
      if (state.overheads !== calculatedOverhead) {
        onUpdate('overheads', calculatedOverhead);
      }
    }
  }, [state.timeTaken, activePreset, onUpdate]);

  const handlePresetClick = (key: WorkspacePreset) => {
    if (activePreset === key) {
      setActivePreset(null);
    } else {
      setActivePreset(key);
      if (key) {
        const calculated = Math.round((state.timeTaken * presets[key].rate) * 100) / 100;
        onUpdate('overheads', calculated);
      }
    }
  };

  const marginStatus = getMarginLabel(state.profitMargin);
  const rateOptions = Array.from({ length: 46 }, (_, i) => i + 5);

  return (
    <div className="ixia-surface-card ixia-font-body rounded-3xl overflow-hidden border border-brand-earth/10">
      <div className="ixia-bar-header ixia-font-heading px-6 py-5 flex items-center justify-between">
        <h2 className="ixia-text-on-dark font-bold text-lg flex items-center whitespace-nowrap">
          <i className="fa-solid fa-sliders mr-2 ixia-accent"></i>
          Price Adjuster
        </h2>
      </div>

      <div className="p-8 space-y-10">
        <div className="space-y-4 border-l-4 border-brand-clay pl-6 py-2">
          <p className="text-brand-body text-base leading-relaxed font-medium">
            This guide helps you calculate a fair, sustainable price for your work. Adjust the sliders and watch the totals update.
          </p>
          <div className="bg-white/70 border border-brand-earth/10 rounded-2xl px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-brand-muted font-heading">
              Pricing a service instead?
            </p>
            <p className="text-xs text-brand-body/70 mt-1">
              For sessions, appointments, coaching, consulting, design, lessons.
            </p>
            <a
              href="https://serviceprice.ixiacreativestudio.com/"
              className="inline-flex mt-2 text-sm font-black text-brand-clay hover:opacity-80 transition"
            >
              Try the Service Pricing Guide →
            </a>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 group transition-colors"
          >
            <i className="fa-solid fa-circle-info text-brand-clay text-base"></i>
            <span className="text-brand-body text-[14px] font-bold whitespace-nowrap transition-colors hover:text-brand-clay">
              Tips on Using this Guide
            </span>
          </button>
        </div>

        <div className="bg-brand-beige-dusty p-6 rounded-2xl border border-brand-earth/10">
          <div className="flex items-center space-x-2 mb-3">
            <i className="fa-solid fa-tag text-brand-clay/60 text-xs"></i>
            <label className="block text-xs font-black uppercase text-brand-muted tracking-widest font-heading">
              Identify Your Creation
            </label>
          </div>
          <input
            type="text"
            placeholder="e.g. Hand-knitted Woolen Scarf"
            className="w-full px-4 py-3 bg-white border-2 border-brand-earth/20 rounded-xl focus:border-brand-clay focus:outline-none transition-colors font-semibold text-brand-body placeholder:text-brand-muted/40"
            value={state.productName}
            onChange={(e) => onUpdate('productName', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8 ixia-panel p-6 rounded-2xl border">

            <h3 className="text-xs font-black uppercase text-brand-heading tracking-widest flex items-center font-heading">
              <i className="fa-solid fa-user-clock mr-2 text-brand-clay/60"></i> Your Time & Effort
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-body/70">Hourly Rate</label>
                <span className="ixia-chip text-sm font-black px-3 py-1 rounded-lg">
                  {symbol}{state.hourlyRate}/hr
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                className="w-full"
                value={state.hourlyRate}
                onChange={(e) => onUpdate('hourlyRate', Number(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-body/70">Time Taken</label>
                <span className="ixia-chip text-sm font-black px-3 py-1 rounded-lg">
                  {formatDuration(state.timeTaken)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.08333333333333333"
                className="w-full"
                value={state.timeTaken}
                onChange={(e) => onUpdate('timeTaken', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-8 bg-brand-beige-dusty p-6 rounded-2xl border border-brand-earth/10">
            <h3 className="text-xs font-black uppercase text-brand-heading tracking-widest flex items-center font-heading">
              <i className="fa-solid fa-box-open mr-2 text-brand-clay/60"></i> Materials & Workspace
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-body/70">Materials</label>
                <div className="ixia-chip flex items-center text-sm font-black px-3 py-1 rounded-lg">
                  <span className="mr-0.5">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="bg-transparent text-brand-beige w-16 focus:outline-none border-none p-0 font-black text-sm [appearance:textfield] text-right"
                    value={state.materials}
                    onChange={(e) => onUpdate('materials', Number(e.target.value))}
                  />
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="1"
                className="w-full"
                value={state.materials}
                onChange={(e) => onUpdate('materials', Number(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-body/70">Overheads</label>
                <span className="ixia-chip text-sm font-black px-3 py-1 rounded-lg">
                  {formatValue(state.overheads)}
                </span>
              </div>
              <div className="pb-4">
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="0.5"
                  className="w-full"
                  value={state.overheads}
                  onChange={(e) => {
                    setActivePreset(null);
                    onUpdate('overheads', Number(e.target.value));
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-2 font-heading">
                {(Object.keys(presets) as Array<keyof typeof presets>).map((key) => (
                  <button
                    key={key}
                    onClick={() => handlePresetClick(key)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all duration-200 ${activePreset === key
                      ? 'bg-brand-clay border-brand-clay text-brand-beige shadow-lg scale-105'
                      : 'bg-white border-brand-earth/20 text-brand-body/60 hover:border-brand-clay hover:text-brand-clay'
                      }`}
                  >
                    <i className={`fa-solid ${presets[key].icon} mb-1 text-[10px]`}></i>
                    <span className="text-[9px] font-black uppercase text-center">{presets[key].label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10 border-t border-brand-earth/10 pt-8">
          <div className="ixia-panel p-6 rounded-2xl border">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-brand-body/70">Extras & Packaging</label>
              <span className="ixia-chip text-sm font-black px-3 py-1 rounded-lg">
                {formatValue(state.extras)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              className="w-full"
              value={state.extras}
              onChange={(e) => onUpdate('extras', Number(e.target.value))}
            />
          </div>

          <div className="ixia-panel--strong p-8 rounded-3xl text-brand-body border">
            <div className="flex justify-between items-center mb-6">
              <label className="text-sm font-black uppercase tracking-widest text-brand-muted font-heading">Business Growth & Safety</label>
              <span className="text-3xl font-black text-brand-clay">
                {state.profitMargin}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              className="w-full"
              value={state.profitMargin}
              onChange={(e) => onUpdate('profitMargin', Number(e.target.value))}
            />
            <div className="flex justify-end items-center mt-4">
              <div className="bg-white px-3 py-1 rounded-full border border-brand-earth/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted mr-2 font-heading">Status:</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${marginStatus.color} font-heading`}>
                  {marginStatus.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tips on Using this Guide"
      >
        <div className="space-y-10 font-body">
          <div className="border-b border-brand-beige-dusty pb-6">
            <h4 className="text-2xl font-black text-brand-heading leading-tight font-heading">
              How to Value Your Craft
            </h4>
            <p className="text-sm italic font-semibold text-brand-muted mt-1">
              Practical advice for creative entrepreneurs
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-brand-heading font-black flex items-center uppercase text-xs tracking-widest font-heading">
              <span className="bg-brand-clay text-brand-beige w-6 h-6 rounded-full flex items-center justify-center text-[10px] mr-2">1</span>
              Your Labor is a Real Cost
            </h4>
            <p className="pl-8 text-sm italic font-medium leading-relaxed text-brand-body/70">
              Your "Hourly Rate" is your salary for making the item. It is not your profit. If you don't pay yourself for your time, your business isn't sustainable.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-brand-heading font-black flex items-center uppercase text-xs tracking-widest font-heading">
              <span className="bg-brand-clay text-brand-beige w-6 h-6 rounded-full flex items-center justify-center text-[10px] mr-2">2</span>
              Hidden Overhead Costs
            </h4>
            <p className="pl-8 text-sm italic font-medium leading-relaxed text-brand-body/70">
              Workspace costs like electricity, heating, and internet are often forgotten. Use the presets to quickly estimate how much of your bills should be covered by each product.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-brand-heading font-black flex items-center uppercase text-xs tracking-widest font-heading">
              <span className="bg-brand-clay text-brand-beige w-6 h-6 rounded-full flex items-center justify-center text-[10px] mr-2">3</span>
              The Power of Profit Margin
            </h4>
            <p className="pl-8 text-sm italic font-medium leading-relaxed text-brand-body/70">
              "Profit" is what the business keeps after everyone (including you) is paid. This money goes toward new tools, website hosting, marketing, and a safety net for slow months.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-brand-heading font-black flex items-center uppercase text-xs tracking-widest font-heading">
              <span className="bg-brand-clay text-brand-beige w-6 h-6 rounded-full flex items-center justify-center text-[10px] mr-2">4</span>
              Rounding for Retail
            </h4>
            <p className="pl-8 text-sm italic font-medium leading-relaxed text-brand-body/70">
              The "Suggested Retail Price" automatically rounds down to the nearest .50 or .00 to give you a "friendly" price point that looks natural to customers.
            </p>
          </div>

          <div className="ixia-panel--strong p-6 border rounded-2xl mt-4">
            <p className="text-xs font-black uppercase text-brand-heading mb-2 font-heading">A message from Heather:</p>
            <p className="text-xs italic font-medium text-brand-body/80 leading-relaxed">
              "Don't be afraid to charge what you are worth. Your unique skill and time have immense value. Use this tool as your confidence booster when talking to customers!"
            </p>
          </div>
          <div className="ixia-panel--soft p-5 rounded-2xl border">
            <p className="text-xs font-black uppercase text-brand-heading mb-2 font-heading">
              Not sure this is the right tool?
            </p>
            <p className="text-xs italic font-medium text-brand-body/70 leading-relaxed">
              If you’re pricing services (sessions, appointments, packages), the Service Pricing Guide is a better fit.
            </p>

            <a
              href="https://serviceprice.ixiacreativestudio.com/"
              className="inline-flex mt-3 ixia-btn-cta font-black px-4 py-2 rounded-xl transition border"
            >
              Open Service Pricing Guide
            </a>
          </div>

        </div>
      </Modal>
    </div>
  );
};
