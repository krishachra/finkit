import { getPeriodsPerYear, round } from '../core/math.js';
import { validateInteger, validatePositive, validateRate } from '../core/validation.js';
import { RDOptions, RDResult } from '../types/index.js';

/**
 * Calculates maturity amount, total invested, total returns, and effective yield for Recurring Deposits (RD).
 * Conforms to the standard Indian Banking and Indian Post Office calculation model:
 * Monthly installments compounded quarterly per RBI regulations.
 *
 * @param options RD configuration options
 * @returns RDResult containing investedAmount, totalReturns, maturityAmount, and effectiveYield
 */
export function calculateRD(options: RDOptions): RDResult {
  const {
    monthlyDeposit,
    annualRate: baseRate,
    tenureMonths,
    compoundingFrequency = 'quarterly',
    seniorCitizen = false,
    seniorCitizenBonusRate = 0.5,
  } = options;

  validatePositive('monthlyDeposit', monthlyDeposit, false);
  validateRate('annualRate', baseRate, false);
  validateInteger('tenureMonths', tenureMonths, false);

  const effectiveRate = seniorCitizen ? baseRate + seniorCitizenBonusRate : baseRate;
  const totalInvested = round(monthlyDeposit * tenureMonths, 2);

  if (effectiveRate === 0) {
    return {
      investedAmount: totalInvested,
      totalReturns: 0,
      maturityAmount: totalInvested,
      effectiveYield: 0,
    };
  }

  const tenureYears = tenureMonths / 12;
  let maturity = 0;

  if (compoundingFrequency === 'quarterly') {
    // Indian Banking & Post Office Standard: Quarterly compounding of monthly deposits
    const quarterlyRate = effectiveRate / 400;

    for (let m = 1; m <= tenureMonths; m++) {
      const remainingMonths = tenureMonths - m + 1;
      const quartersRemaining = remainingMonths / 3;
      maturity += monthlyDeposit * Math.pow(1 + quarterlyRate, quartersRemaining);
    }
  } else {
    // General compounding frequency
    const freq = getPeriodsPerYear(compoundingFrequency);
    const periodicRate = effectiveRate / 100 / freq;

    for (let m = 1; m <= tenureMonths; m++) {
      const remainingYears = (tenureMonths - m + 1) / 12;
      const periodsRemaining = remainingYears * freq;
      maturity += monthlyDeposit * Math.pow(1 + periodicRate, periodsRemaining);
    }
  }

  const maturityAmount = round(maturity, 2);
  const totalReturns = round(maturityAmount - totalInvested, 2);
  const effectiveYield = round((totalReturns / totalInvested / tenureYears) * 100, 4);

  return {
    investedAmount: totalInvested,
    totalReturns,
    maturityAmount,
    effectiveYield,
  };
}
