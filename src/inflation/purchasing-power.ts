import { round } from '../core/math.js';
import { validatePositive, validateRate } from '../core/validation.js';
import { InflationAdjustedFutureValueOptions, InflationAdjustedFutureValueResult } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Calculates the inflation-adjusted purchasing power (real value) of a future sum of money.
 *
 * Real Value = Nominal Value / (1 + inflation)^years
 *
 * @param options nominalFutureValue, inflationRate, tenureYears
 * @returns InflationAdjustedFutureValueResult with real value and purchasing power loss percentage
 */
export function calculateInflationAdjustedValue(
  options: InflationAdjustedFutureValueOptions
): InflationAdjustedFutureValueResult {
  const { nominalFutureValue, inflationRate, tenureYears } = options;

  validatePositive('nominalFutureValue', nominalFutureValue, true);
  validateRate('inflationRate', inflationRate, true);
  validatePositive('tenureYears', tenureYears, true);

  if (inflationRate <= -100) {
    throw new ValidationError('Inflation rate cannot be less than or equal to -100%');
  }

  const inflationFactor = Math.pow(1 + inflationRate / 100, tenureYears);
  const realFutureValue = round(nominalFutureValue / inflationFactor, 2);

  const purchasingPowerLossPercent =
    nominalFutureValue === 0
      ? 0
      : round(((nominalFutureValue - realFutureValue) / nominalFutureValue) * 100, 2);

  return {
    nominalFutureValue: round(nominalFutureValue, 2),
    realFutureValue,
    purchasingPowerLossPercent,
  };
}
