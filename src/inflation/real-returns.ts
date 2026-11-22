import { round } from '../core/math.js';
import { validateRate } from '../core/validation.js';
import { RealReturnsOptions, RealReturnsResult } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Calculates real (inflation-adjusted) rate of return using the exact Fisher equation.
 *
 * Exact Fisher Relation: (1 + r_nominal) = (1 + r_real) * (1 + inflation)
 * => r_real = ((1 + r_nominal) / (1 + inflation)) - 1
 *
 * @param options nominalRate and inflationRate (in percentage)
 * @returns RealReturnsResult with exact realRate, approximateRealRate, nominalRate, and inflationRate
 */
export function calculateRealRate(options: RealReturnsOptions): RealReturnsResult {
  const { nominalRate, inflationRate } = options;

  validateRate('nominalRate', nominalRate, true);
  validateRate('inflationRate', inflationRate, true);

  if (inflationRate <= -100) {
    throw new ValidationError('Inflation rate cannot be less than or equal to -100%');
  }

  const nominalDec = nominalRate / 100;
  const inflationDec = inflationRate / 100;

  const exactRealDec = (1 + nominalDec) / (1 + inflationDec) - 1;
  const exactRealRate = round(exactRealDec * 100, 4);
  const approximateRealRate = round(nominalRate - inflationRate, 4);

  return {
    nominalRate: round(nominalRate, 4),
    inflationRate: round(inflationRate, 4),
    realRate: exactRealRate,
    approximateRealRate,
  };
}
