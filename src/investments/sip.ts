import { round } from '../core/math.js';
import { validateInteger, validatePositive, validateRate } from '../core/validation.js';
import { SIPOptions, SIPResult, SIPYearlyBreakdown } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Calculates maturity value, total invested amount, and returns for a Systematic Investment Plan (SIP).
 * Supports standard fixed monthly SIP and Step-up (Top-up) SIP with percentage or fixed annual increment.
 *
 * @param options SIP configuration parameters
 * @returns SIPResult containing investedAmount, totalReturns, maturityAmount, and optional yearlyBreakdown
 */
export function calculateSIP(options: SIPOptions): SIPResult {
  const {
    monthlyInvestment: initialMonthly,
    annualRate,
    tenureMonths,
    stepUp,
    timing = 'beginning',
  } = options;

  validatePositive('monthlyInvestment', initialMonthly);
  validateRate('annualRate', annualRate, false);
  validateInteger('tenureMonths', tenureMonths);

  if (stepUp) {
    if (stepUp.type !== 'percentage' && stepUp.type !== 'fixed') {
      throw new ValidationError(`Invalid stepUp type: ${stepUp.type}. Must be 'percentage' or 'fixed'.`);
    }
    validatePositive('stepUp.value', stepUp.value, true);
  }

  const monthlyRate = annualRate / 12 / 100;

  // Zero rate case
  if (annualRate === 0 && !stepUp) {
    const investedAmount = round(initialMonthly * tenureMonths, 2);
    return {
      investedAmount,
      totalReturns: 0,
      maturityAmount: investedAmount,
    };
  }

  // If no step-up, use the closed-form annuity formula for maximum speed and precision
  if (!stepUp) {
    let maturity: number;
    if (annualRate === 0) {
      maturity = initialMonthly * tenureMonths;
    } else {
      const growthFactor = Math.pow(1 + monthlyRate, tenureMonths);
      // Annuity immediate vs Annuity due
      const base = initialMonthly * ((growthFactor - 1) / monthlyRate);
      maturity = timing === 'beginning' ? base * (1 + monthlyRate) : base;
    }

    const investedAmount = round(initialMonthly * tenureMonths, 2);
    const maturityAmount = round(maturity, 2);
    const totalReturns = round(maturityAmount - investedAmount, 2);

    return {
      investedAmount,
      totalReturns,
      maturityAmount,
    };
  }

  // Step-Up SIP: Month-by-month compounding simulation
  let totalInvested = 0;
  let portfolioValue = 0;
  let currentMonthly = initialMonthly;

  const yearlyBreakdown: SIPYearlyBreakdown[] = [];

  let currentYearInvested = 0;

  for (let month = 1; month <= tenureMonths; month++) {
    // Check if new year begins and step-up applies (from month 13, 25, 37, ...)
    if (month > 1 && (month - 1) % 12 === 0) {
      if (stepUp.type === 'percentage') {
        currentMonthly = currentMonthly * (1 + stepUp.value / 100);
      } else {
        currentMonthly = currentMonthly + stepUp.value;
      }
    }

    totalInvested += currentMonthly;
    currentYearInvested += currentMonthly;

    if (timing === 'beginning') {
      portfolioValue = (portfolioValue + currentMonthly) * (1 + monthlyRate);
    } else {
      portfolioValue = portfolioValue * (1 + monthlyRate) + currentMonthly;
    }

    // Capture end-of-year milestone or final month
    if (month % 12 === 0 || month === tenureMonths) {
      const yearIndex = Math.ceil(month / 12);
      yearlyBreakdown.push({
        year: yearIndex,
        monthlyInvestment: round(currentMonthly, 2),
        yearlyInvested: round(currentYearInvested, 2),
        cumulativeInvested: round(totalInvested, 2),
        yearEndValue: round(portfolioValue, 2),
        returnsEarned: round(portfolioValue - totalInvested, 2),
      });
      currentYearInvested = 0;
    }
  }

  const investedAmount = round(totalInvested, 2);
  const maturityAmount = round(portfolioValue, 2);
  const totalReturns = round(maturityAmount - investedAmount, 2);

  return {
    investedAmount,
    totalReturns,
    maturityAmount,
    yearlyBreakdown,
  };
}
