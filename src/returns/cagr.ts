import { round, yearsBetween } from '../core/math.js';
import { validateDateRange, validateNumber, validatePositive } from '../core/validation.js';
import { CAGROptions } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Calculates Compound Annual Growth Rate (CAGR).
 *
 * Formula: CAGR = ((endingValue / beginningValue) ^ (1 / years)) - 1
 *
 * @param options CAGR options including beginningValue, endingValue, and years or date range
 * @returns CAGR as a percentage (e.g. 15.25 for 15.25%)
 */
export function calculateCAGR(options: CAGROptions): number {
  const { beginningValue, endingValue, years: explicitYears, startDate, endDate } = options;

  validatePositive('beginningValue', beginningValue, false);
  validateNumber('endingValue', endingValue);

  if (endingValue < 0) {
    throw new ValidationError('endingValue cannot be negative for CAGR calculation', 'endingValue', endingValue);
  }

  let years: number;

  if (explicitYears !== undefined) {
    years = validatePositive('years', explicitYears, false);
  } else if (startDate !== undefined && endDate !== undefined) {
    const { start, end } = validateDateRange(startDate, endDate);
    years = yearsBetween(start, end);
    if (years <= 0) {
      throw new ValidationError('Time elapsed between start and end date must be greater than zero');
    }
  } else {
    throw new ValidationError('Either "years" or both "startDate" and "endDate" must be provided');
  }

  if (endingValue === 0) {
    return -100;
  }

  const cagr = Math.pow(endingValue / beginningValue, 1 / years) - 1;
  return round(cagr * 100, 4);
}
