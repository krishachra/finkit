import { CompoundingFrequency } from '../types/index.js';
import { ValidationError } from './errors.js';

/**
 * Rounds a number to a specified number of decimal places without floating-point artifacts.
 * Uses scientific notation shift to prevent issues like 1.005 -> 1.00.
 */
export function round(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (decimals === 0) {
    return Math.round(value);
  }
  // Use exponential string notation to handle floating point precision
  const sign = value < 0 ? -1 : 1;
  const absVal = Math.abs(value);
  const rounded = Number(Math.round(Number(`${absVal}e${decimals}`)) + `e-${decimals}`);
  // Normalize -0 to 0
  const result = sign * rounded;
  return Object.is(result, -0) ? 0 : result;
}

/**
 * Converts a CompoundingFrequency into periods per year.
 */
export function getPeriodsPerYear(frequency: CompoundingFrequency = 'annually'): number {
  switch (frequency) {
    case 'annually':
      return 1;
    case 'semi-annually':
      return 2;
    case 'quarterly':
      return 4;
    case 'monthly':
      return 12;
    case 'daily':
      return 365;
    default:
      throw new ValidationError(`Unsupported compounding frequency: ${frequency}`);
  }
}

/**
 * Converts a Date instance or valid ISO date string into a clean Date object at UTC midnight.
 */
export function parseDate(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new ValidationError(`Invalid Date object passed: ${dateInput}`);
    }
    return new Date(dateInput.getTime());
  }
  if (typeof dateInput === 'string') {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      throw new ValidationError(`Invalid date string passed: "${dateInput}"`);
    }
    return parsed;
  }
  throw new ValidationError(`Date must be a Date object or valid date string, received: ${typeof dateInput}`);
}

/**
 * Calculates day difference between two dates (Actual/365 convention).
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return diffTime / (1000 * 60 * 60 * 24);
}

/**
 * Calculates exact fractional years between two dates based on Actual/365 day-count convention.
 */
export function yearsBetween(startDate: Date | string, endDate: Date | string): number {
  const days = daysBetween(startDate, endDate);
  return days / 365;
}
