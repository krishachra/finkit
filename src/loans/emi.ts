import { round } from '../core/math.js';
import { validateInteger, validatePositive, validateRate } from '../core/validation.js';
import { EMIOptions, EMIResult } from '../types/index.js';

/**
 * Calculates Equated Monthly Installment (EMI), total interest, and total payable amount.
 * Based on the reducing balance interest method standard in Indian banking.
 *
 * Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param options principal, annualRate, tenureMonths
 * @returns EMIResult { emi, principal, totalInterest, totalPayment }
 */
export function calculateEMI(options: EMIOptions): EMIResult {
  const { principal, annualRate, tenureMonths } = options;

  validatePositive('principal', principal, false);
  validateRate('annualRate', annualRate, false);
  validateInteger('tenureMonths', tenureMonths, false);

  if (annualRate === 0) {
    const emi = round(principal / tenureMonths, 2);
    const totalPayment = round(principal, 2);
    return {
      emi,
      principal: round(principal, 2),
      totalInterest: 0,
      totalPayment,
    };
  }

  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = round((principal * monthlyRate * factor) / (factor - 1), 2);
  const totalPayment = round(emi * tenureMonths, 2);
  const totalInterest = round(totalPayment - principal, 2);

  return {
    emi,
    principal: round(principal, 2),
    totalInterest,
    totalPayment,
  };
}
