import { round } from '../core/math.js';
import { validatePositive, validateRate } from '../core/validation.js';
import { TargetSIPForGoalOptions, TargetSIPForGoalResult } from '../types/index.js';

/**
 * Calculates the monthly SIP required to achieve a target financial goal in the future,
 * fully taking into account inflation and expected portfolio return.
 *
 * 1. Computes nominal future target = Target_today * (1 + inflation)^years
 * 2. Solves for monthly SIP required to reach that nominal future target under annuity due
 *
 * @param options Target corpus in today's money, inflation rate, expected return rate, tenure years
 * @returns TargetSIPForGoalResult { targetCorpusNominal, targetCorpusTodayMoney, requiredMonthlySIP, totalInvested, wealthGained }
 */
export function calculateTargetSIP(options: TargetSIPForGoalOptions): TargetSIPForGoalResult {
  const { targetCorpusInTodayMoney, inflationRate, expectedReturnRate, tenureYears } = options;

  validatePositive('targetCorpusInTodayMoney', targetCorpusInTodayMoney, false);
  validateRate('inflationRate', inflationRate, false);
  validateRate('expectedReturnRate', expectedReturnRate, false);
  validatePositive('tenureYears', tenureYears, false);

  // Future nominal requirement
  const inflationFactor = Math.pow(1 + inflationRate / 100, tenureYears);
  const targetCorpusNominal = round(targetCorpusInTodayMoney * inflationFactor, 2);

  const totalMonths = Math.round(tenureYears * 12);
  const monthlyRate = expectedReturnRate / 12 / 100;

  let requiredMonthlySIP: number;

  if (monthlyRate === 0) {
    requiredMonthlySIP = round(targetCorpusNominal / totalMonths, 2);
  } else {
    // Annuity due formula:
    // Target = P * [((1 + i)^n - 1) / i] * (1 + i)
    // => P = Target / ( [((1 + i)^n - 1) / i] * (1 + i) )
    const growth = Math.pow(1 + monthlyRate, totalMonths);
    const annuityFactor = ((growth - 1) / monthlyRate) * (1 + monthlyRate);
    requiredMonthlySIP = round(targetCorpusNominal / annuityFactor, 2);
  }

  const totalInvested = round(requiredMonthlySIP * totalMonths, 2);
  const wealthGained = round(targetCorpusNominal - totalInvested, 2);

  return {
    targetCorpusNominal,
    targetCorpusTodayMoney: round(targetCorpusInTodayMoney, 2),
    requiredMonthlySIP,
    totalInvested,
    wealthGained,
  };
}
