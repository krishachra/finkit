import { describe, it, expect } from 'vitest';
import { round, getPeriodsPerYear, parseDate, daysBetween, yearsBetween } from '../src/core/math.js';
import { validateNumber, validatePositive, validateInteger, validateRate, validateCashFlows } from '../src/core/validation.js';
import { ValidationError } from '../src/core/errors.js';

describe('Core Math & Validation', () => {
  describe('round()', () => {
    it('accurately rounds floating numbers without standard JS precision glitches', () => {
      // 1.005 in standard Math.round((1.005) * 100) / 100 yields 1.00 due to 1.005 = 1.0049999999999998934...
      expect(round(1.005, 2)).toBe(1.01);
      expect(round(1.004, 2)).toBe(1.0);
      expect(round(10.555, 2)).toBe(10.56);
      expect(round(123.456, 0)).toBe(123);
      expect(round(0.00001, 2)).toBe(0);
      expect(round(-0.00001, 2)).toBe(0);
      expect(round(-1.005, 2)).toBe(-1.01);
    });

    it('handles non-finite values safely', () => {
      expect(round(Infinity)).toBe(Infinity);
      expect(round(NaN)).toBeNaN();
    });
  });

  describe('getPeriodsPerYear()', () => {
    it('returns correct compounding periods', () => {
      expect(getPeriodsPerYear('annually')).toBe(1);
      expect(getPeriodsPerYear('semi-annually')).toBe(2);
      expect(getPeriodsPerYear('quarterly')).toBe(4);
      expect(getPeriodsPerYear('monthly')).toBe(12);
      expect(getPeriodsPerYear('daily')).toBe(365);
    });

    it('throws ValidationError for unsupported compounding frequency', () => {
      expect(() => getPeriodsPerYear('hourly' as any)).toThrow(ValidationError);
    });
  });

  describe('parseDate() & date math', () => {
    it('parses valid dates and strings', () => {
      const d1 = parseDate('2024-01-01');
      expect(d1).toBeInstanceOf(Date);
      expect(d1.getFullYear()).toBe(2024);

      const d2 = new Date('2024-06-01');
      expect(parseDate(d2).getTime()).toBe(d2.getTime());
    });

    it('throws ValidationError on invalid date strings', () => {
      expect(() => parseDate('not-a-date')).toThrow(ValidationError);
      expect(() => parseDate(new Date('invalid'))).toThrow(ValidationError);
    });

    it('throws ValidationError for non-string, non-Date input types', () => {
      expect(() => parseDate(123456789 as any)).toThrow(ValidationError);
      expect(() => parseDate({} as any)).toThrow(ValidationError);
    });

    it('calculates days and years accurately', () => {
      expect(daysBetween('2024-01-01', '2024-01-11')).toBe(10);
      expect(yearsBetween('2024-01-01', '2025-01-01')).toBeCloseTo(366 / 365, 4); // 2024 is leap year (366 days)
    });
  });

  describe('Validations', () => {
    it('validates positive numbers', () => {
      expect(validatePositive('test', 100)).toBe(100);
      expect(() => validatePositive('test', 0, false)).toThrow(ValidationError);
      expect(validatePositive('test', 0, true)).toBe(0);
      expect(() => validatePositive('test', -10)).toThrow(ValidationError);
      expect(() => validatePositive('test', NaN)).toThrow(ValidationError);
    });

    it('validates integers', () => {
      expect(validateInteger('months', 12)).toBe(12);
      expect(() => validateInteger('months', 12.5)).toThrow(ValidationError);
    });

    it('validates cash flows with aggregation', () => {
      const flows = [
        { date: '2024-01-01', amount: -10000 },
        { date: '2024-01-01', amount: -5000 }, // same day aggregation
        { date: '2025-01-01', amount: 18000 },
      ];
      const validated = validateCashFlows(flows);
      expect(validated).toHaveLength(2);
      expect(validated[0].amount).toBe(-15000);
      expect(validated[1].amount).toBe(18000);
    });

    it('rejects cash flows without inflow or outflow', () => {
      expect(() =>
        validateCashFlows([
          { date: '2024-01-01', amount: 1000 },
          { date: '2025-01-01', amount: 2000 },
        ])
      ).toThrow(ValidationError);

      expect(() =>
        validateCashFlows([
          { date: '2024-01-01', amount: -1000 },
          { date: '2025-01-01', amount: -2000 },
        ])
      ).toThrow(ValidationError);
    });

    it('rejects cash flows containing zero amounts', () => {
      expect(() =>
        validateCashFlows([
          { date: '2024-01-01', amount: -1000 },
          { date: '2024-06-01', amount: 0 },
          { date: '2025-01-01', amount: 2000 },
        ])
      ).toThrow(ValidationError);
    });

    it('rejects cash flows when same-day cancellation leaves fewer than 2 valid entries', () => {
      expect(() =>
        validateCashFlows([
          { date: '2024-01-01', amount: -10000 },
          { date: '2024-06-01', amount: 5000 },
          { date: '2024-06-01', amount: -5000 }, // net 0 at 2024-06-01, leaves only 1 flow!
        ])
      ).toThrow(ValidationError);
    });

    it('rejects cash flows when post-aggregation flows lack either inflow or outflow', () => {
      // Outflow on 2024-06-01 cancels completely, leaving only positive inflows
      expect(() =>
        validateCashFlows([
          { date: '2024-01-01', amount: 10000 },
          { date: '2024-06-01', amount: -5000 },
          { date: '2024-06-01', amount: 5000 },
          { date: '2024-12-01', amount: 20000 },
        ])
      ).toThrow(ValidationError);
    });

    it('rejects cash flows that are not an array or have fewer than 2 entries', () => {
      expect(() => validateCashFlows(null as any)).toThrow(ValidationError);
      expect(() => validateCashFlows('invalid' as any)).toThrow(ValidationError);
      expect(() =>
        validateCashFlows([{ date: '2024-01-01', amount: -1000 }])
      ).toThrow(ValidationError);
    });

    it('rejects a cash flow entry that is not a plain object', () => {
      expect(() =>
        validateCashFlows([42, { date: '2025-01-01', amount: 2000 }] as any)
      ).toThrow(ValidationError);
    });
  });
});
