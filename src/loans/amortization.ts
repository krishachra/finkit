import { round } from '../core/math.js';
import { validateInteger, validatePositive, validateRate } from '../core/validation.js';
import { calculateEMI } from './emi.js';
import { AmortizationResult, AmortizationScheduleEntry, AmortizationScheduleOptions } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Generates a complete month-by-month loan amortization schedule.
 * Supports optional prepayments, calculating the resulting tenure reduction and total interest saved.
 *
 * @param options Amortization schedule options including principal, annualRate, tenureMonths, and optional prepayments
 * @returns AmortizationResult with complete schedule and savings analytics
 */
export function generateAmortizationSchedule(options: AmortizationScheduleOptions): AmortizationResult {
  const { principal, annualRate, tenureMonths, prepayments = [] } = options;

  validatePositive('principal', principal, false);
  validateRate('annualRate', annualRate, false);
  validateInteger('tenureMonths', tenureMonths, false);

  // Validate prepayments if any
  const prepaymentMap = new Map<number, number>();
  for (const prep of prepayments) {
    validateInteger('prepayment month', prep.month, false);
    validatePositive('prepayment amount', prep.amount, false);

    if (prep.month > tenureMonths) {
      throw new ValidationError(`Prepayment month ${prep.month} exceeds loan tenure of ${tenureMonths} months`);
    }

    const existing = prepaymentMap.get(prep.month) ?? 0;
    prepaymentMap.set(prep.month, existing + prep.amount);
  }

  // Baseline EMI calculation without prepayments
  const baseline = calculateEMI({ principal, annualRate, tenureMonths });
  const scheduledEMI = baseline.emi;
  const monthlyRate = annualRate / 12 / 100;

  let currentBalance = principal;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  const schedule: AmortizationScheduleEntry[] = [];

  for (let month = 1; month <= tenureMonths; month++) {
    if (currentBalance <= 0) break;

    const openingBalance = round(currentBalance, 2);
    const interest = annualRate === 0 ? 0 : round(openingBalance * monthlyRate, 2);

    let principalPortion = round(scheduledEMI - interest, 2);
    const prepayment = prepaymentMap.get(month) ?? 0;

    let totalPrincipalThisMonth = principalPortion + prepayment;

    // Last month adjustment if balance is smaller than payment
    let emiPaidThisMonth = scheduledEMI;
    if (openingBalance + interest <= scheduledEMI + prepayment) {
      // Loan will be completely paid off this month
      principalPortion = openingBalance;
      totalPrincipalThisMonth = openingBalance;
      emiPaidThisMonth = round(openingBalance + interest, 2);
    } else if (openingBalance < totalPrincipalThisMonth) {
      totalPrincipalThisMonth = openingBalance;
    }

    const closingBalance = round(Math.max(0, openingBalance - totalPrincipalThisMonth), 2);

    totalInterestPaid += interest;
    totalPrincipalPaid += totalPrincipalThisMonth;
    currentBalance = closingBalance;

    schedule.push({
      month,
      openingBalance,
      emi: emiPaidThisMonth,
      principalPaid: totalPrincipalThisMonth,
      interestPaid: interest,
      prepayment,
      closingBalance,
    });

    if (closingBalance <= 0) break;
  }

  const finalTotalInterest = round(totalInterestPaid, 2);
  const finalTotalPrincipal = round(totalPrincipalPaid, 2);
  const finalTotalPayment = round(finalTotalPrincipal + finalTotalInterest, 2);
  const actualTenureMonths = schedule.length;
  const tenureReducedMonths = tenureMonths - actualTenureMonths;
  const interestSaved = round(Math.max(0, baseline.totalInterest - finalTotalInterest), 2);

  return {
    emi: scheduledEMI,
    principal: round(principal, 2),
    totalInterest: finalTotalInterest,
    totalPayment: finalTotalPayment,
    originalTenureMonths: tenureMonths,
    actualTenureMonths,
    tenureReducedMonths,
    interestSaved,
    schedule,
  };
}
