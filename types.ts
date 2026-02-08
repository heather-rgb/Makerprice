
export type CurrencyType = 'DOLLAR' | 'POUND' | 'EURO';

export const CURRENCY_CONFIG: Record<CurrencyType, { locale: string; symbol: string, label: string }> = {
  DOLLAR: { locale: 'en-US', symbol: '$', label: 'Dollars ($)' },
  POUND: { locale: 'en-GB', symbol: '£', label: 'Pounds (£)' },
  EURO: { locale: 'de-DE', symbol: '€', label: 'Euros (€)' },
};

export interface PricingState {
  productName: string;
  hourlyRate: number;
  timeTaken: number;
  materials: number;
  overheads: number;
  extras: number;
  profitMargin: number;
}

export interface PricingBreakdown {
  laborCost: number;
  baseCost: number;
  profitAmount: number;
  suggestedPrice: number;
}
