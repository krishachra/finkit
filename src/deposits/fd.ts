import { getPeriodsPerYear, round } from '../core/math.js';
import { validateInteger, validatePositive, validateRate } from '../core/validation.js';
import { FDOptions, FDResult } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Calculates maturity amount, interest earned, and effective yield for Fixed Deposits (FD).
 * Conforms to Reserve Bank of India (RBI) conventions:
 * - Quarterly compounding for cumulative deposits (tenure >= 6 months).
 * - Simple interest for short-term deposits (< 6 months).
 * - Support for Senior Citizen interest booster (default +0.50%).
 * - Support for non-cumulative periodic interest payouts (monthly, quarterly, half-yearly, annually).
 *
 * @param options FD configuration
 * @returns FDResult with maturity value, interest earned, effective yield, and optional periodic payout
 */
export function calculateFD(options: FDOptions): FDResult {
  const {
    principal,
    annualRate: baseRate,
    tenureMonths,
    tenureDays,
    payout = 'cumulative',
    seniorCitizen = false,
    seniorCitizenBonusRate = 0.5,
    compoundingFrequency = 'quarterly',
  } = options;

  validatePositive('principal', principal, false);
  validateRate('annualRate', baseRate, false);

  if (tenureMonths === undefined && tenureDays === undefined) {
    throw new ValidationError('Either "tenureMonths" or "tenureDays" must be specified for FD calculation');
  }

  let totalYears: number;
  let totalDays: number;

  if (tenureDays !== undefined) {
    validateInteger('tenureDays', tenureDays, false);
    totalDays = tenureDays;
    totalYears = tenureDays / 365;
  } else {
    validateInteger('tenureMonths', tenureMonths!, false);
    totalDays = (tenureMonths! * 365) / 12;
    totalYears = tenureMonths! / 12;
  }

  const effectiveRate = seniorCitizen ? baseRate + seniorCitizenBonusRate : baseRate;

  if (effectiveRate === 0) {
    return {
      principal: round(principal, 2),
      interestEarned: 0,
      maturityAmount: round(principal, 2),
      effectiveYield: 0,
    };
  }

  // Non-cumulative payout calculation
  if (payout !== 'cumulative') {
    let periodicPayout: number;
    let periodsPerYear: number;

    switch (payout) {
      case 'monthly':
        periodsPerYear = 12;
        // Discounted monthly payout standard per Indian banking convention
        // r_monthly = (1 + r/400)^(1/3) - 1 or discounted: P * (r/1200) / (1 + (r/1200) * 2/3)
        // Standard RBI formula for monthly interest payout:
        periodicPayout = round(principal * (Math.pow(1 + effectiveRate / 400, 1 / 3) - 1), 2);
        break;
      case 'quarterly':
        periodsPerYear = 4;
        periodicPayout = round((principal * (effectiveRate / 100)) / 4, 2);
        break;
      case 'half-yearly':
        periodsPerYear = 2;
        periodicPayout = round((principal * (effectiveRate / 100)) / 2, 2);
        break;
      case 'annually':
        periodsPerYear = 1;
        periodicPayout = round(principal * (effectiveRate / 100), 2);
        break;
      default:
        throw new ValidationError(`Unsupported FD payout type: ${payout}`);
    }

    const totalPayoutsCount = periodsPerYear * totalYears;
    const totalInterestEarned = round(periodicPayout * totalPayoutsCount, 2);
    const effectiveYield = round((totalInterestEarned / principal / totalYears) * 100, 4);

    return {
      principal: round(principal, 2),
      interestEarned: totalInterestEarned,
      maturityAmount: round(principal, 2), // Principal returned at maturity
      effectiveYield,
      periodicPayout,
    };
  }

  // Cumulative FD:
  // Short term deposits (< 180 days or < 6 months) earn simple interest per RBI rules
  let maturity: number;
  if (totalDays < 180 && tenureDays !== undefined) {
    const simpleInterest = principal * (effectiveRate / 100) * (totalDays / 365);
    maturity = principal + simpleInterest;
  } else {
    const freq = getPeriodsPerYear(compoundingFrequency);
    const periodicRate = effectiveRate / 100 / freq;
    const totalPeriods = freq * totalYears;
    maturity = principal * Math.pow(1 + periodicRate, totalPeriods);
  }

  const maturityAmount = round(maturity, 2);
  const interestEarned = round(maturityAmount - principal, 2);
  const effectiveYield = round(((maturityAmount - principal) / principal / totalYears) * 100, 4);

  return {
    principal: round(principal, 2),
    interestEarned,
    maturityAmount,
    effectiveYield,
  };
}
