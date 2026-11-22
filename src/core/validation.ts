import { ValidationError } from './errors.js';
import { CashFlow } from '../types/index.js';
import { parseDate } from './math.js';

export function validateNumber(name: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${name} must be a valid finite number, received: ${value}`, name, value);
  }
  return value;
}

export function validatePositive(name: string, value: unknown, allowZero = false): number {
  const num = validateNumber(name, value);
  if (allowZero ? num < 0 : num <= 0) {
    throw new ValidationError(
      `${name} must be ${allowZero ? 'greater than or equal to 0' : 'strictly positive'}, received: ${num}`,
      name,
      num
    );
  }
  return num;
}

export function validateInteger(name: string, value: unknown, allowZero = false): number {
  const num = validatePositive(name, value, allowZero);
  if (!Number.isInteger(num)) {
    throw new ValidationError(`${name} must be an integer, received: ${num}`, name, num);
  }
  return num;
}

export function validateRate(name: string, rate: unknown, allowNegative = false): number {
  const num = validateNumber(name, rate);
  if (!allowNegative && num < 0) {
    throw new ValidationError(`${name} cannot be negative, received: ${num}`, name, num);
  }
  return num;
}

export function validateDateRange(startDate: Date | string, endDate: Date | string): { start: Date; end: Date } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (end.getTime() <= start.getTime()) {
    throw new ValidationError(
      `End date (${end.toISOString().split('T')[0]}) must be strictly after start date (${start.toISOString().split('T')[0]})`
    );
  }

  return { start, end };
}

export interface ValidatedCashFlow {
  date: Date;
  amount: number;
}

export function validateCashFlows(cashFlows: unknown): ValidatedCashFlow[] {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
    throw new ValidationError('Cash flows must be an array with at least 2 entries.');
  }

  let hasInflow = false;
  let hasOutflow = false;

  const parsed: ValidatedCashFlow[] = cashFlows.map((cf, index) => {
    if (!cf || typeof cf !== 'object') {
      throw new ValidationError(`Cash flow at index ${index} must be an object.`);
    }

    const item = cf as CashFlow;
    const amount = validateNumber(`Cash flow amount at index ${index}`, item.amount);
    if (amount === 0) {
      throw new ValidationError(`Cash flow amount at index ${index} cannot be zero.`);
    }

    const date = parseDate(item.date);

    if (amount > 0) hasInflow = true;
    if (amount < 0) hasOutflow = true;

    return { date, amount };
  });

  if (!hasInflow || !hasOutflow) {
    throw new ValidationError(
      'Cash flows must contain at least one negative cash flow (investment/outflow) and at least one positive cash flow (return/inflow).'
    );
  }

  // Sort chronologically
  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Aggregate cash flows occurring on the exact same calendar day
  const aggregated: ValidatedCashFlow[] = [];
  for (const cf of parsed) {
    const last = aggregated[aggregated.length - 1];
    if (last && last.date.getTime() === cf.date.getTime()) {
      last.amount += cf.amount;
    } else {
      aggregated.push({ date: cf.date, amount: cf.amount });
    }
  }

  // Verify that after aggregation we still have at least 2 cash flows and both inflow and outflow
  const validRemaining = aggregated.filter((cf) => cf.amount !== 0);
  if (validRemaining.length < 2) {
    throw new ValidationError('Cash flows after same-day aggregation must contain at least 2 valid non-zero dates.');
  }

  const finalInflow = validRemaining.some((c) => c.amount > 0);
  const finalOutflow = validRemaining.some((c) => c.amount < 0);
  if (!finalInflow || !finalOutflow) {
    throw new ValidationError(
      'Cash flows after same-day aggregation must still contain both positive and negative cash flows.'
    );
  }

  return validRemaining;
}
