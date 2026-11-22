import { round, yearsBetween } from '../core/math.js';
import { validateDateRange, validateNumber, validatePositive } from '../core/validation.js';
import { AbsoluteReturnsOptions, AnnualizedReturnsOptions } from '../types/index.js';
import { ValidationError } from '../core/errors.js';

/**
 * Calculates simple absolute return percentage.
 *
 * Formula: ((finalValue - initialValue) / initialValue) * 100
 *
 * @param options initialValue and finalValue
 * @returns Absolute return percentage (e.g. 25.5 for 25.5%)
 */
export function calculateAbsoluteReturn(options: AbsoluteReturnsOptions): number {
  const { initialValue, finalValue } = options;

  validatePositive('initialValue', initialValue, false);
  validateNumber('finalValue', finalValue);

  const absReturn = ((finalValue - initialValue) / initialValue) * 100;
  return round(absReturn, 4);
}

/**
 * Calculates annualized return over a given duration.
 *
 * For periods >= 1 year, uses compounded annualized return (CAGR convention).
 * Supports explicit years, explicit days, or startDate/endDate range.
 *
 * @param options initialValue, finalValue, and duration parameters
 * @returns Annualized return percentage
 */
export function calculateAnnualizedReturn(options: AnnualizedReturnsOptions): number {
  const { initialValue, finalValue, years: explicitYears, days: explicitDays, startDate, endDate } = options;

  validatePositive('initialValue', initialValue, false);
  validateNumber('finalValue', finalValue);

  let years: number;

  if (explicitYears !== undefined) {
    years = validatePositive('years', explicitYears, false);
  } else if (explicitDays !== undefined) {
    validatePositive('days', explicitDays, false);
    years = explicitDays / 365;
  } else if (startDate !== undefined && endDate !== undefined) {
    const { start, end } = validateDateRange(startDate, endDate);
    years = yearsBetween(start, end);
  } else {
    throw new ValidationError('Either "years", "days", or both "startDate" and "endDate" must be provided');
  }

  if (finalValue <= 0) {
    if (finalValue === 0) return -100;
    throw new ValidationError('finalValue cannot be negative for compounded annualized return', 'finalValue', finalValue);
  }

  const annualized = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  return round(annualized, 4);
}
