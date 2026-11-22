import { getPeriodsPerYear, round } from '../core/math.js';
import { validatePositive, validateRate } from '../core/validation.js';
import { InvestmentSummary, LumpSumOptions } from '../types/index.js';

/**
 * Calculates maturity amount and returns for a one-time lump-sum investment.
 *
 * Formula: FV = P * (1 + r / n)^(n * t)
 *
 * @param options Lump-sum investment configuration
 * @returns InvestmentSummary containing investedAmount, totalReturns, and maturityAmount
 */
export function calculateLumpSum(options: LumpSumOptions): InvestmentSummary {
  const {
    principal,
    annualRate,
    tenureYears,
    compoundingFrequency = 'annually',
  } = options;

  validatePositive('principal', principal);
  validateRate('annualRate', annualRate, false);
  validatePositive('tenureYears', tenureYears, false);

  if (annualRate === 0) {
    const investedAmount = round(principal, 2);
    return {
      investedAmount,
      totalReturns: 0,
      maturityAmount: investedAmount,
    };
  }

  const periodsPerYear = getPeriodsPerYear(compoundingFrequency);
  const periodicRate = (annualRate / 100) / periodsPerYear;
  const totalPeriods = periodsPerYear * tenureYears;

  const maturity = principal * Math.pow(1 + periodicRate, totalPeriods);

  const investedAmount = round(principal, 2);
  const maturityAmount = round(maturity, 2);
  const totalReturns = round(maturityAmount - investedAmount, 2);

  return {
    investedAmount,
    totalReturns,
    maturityAmount,
  };
}
