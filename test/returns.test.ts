import { describe, it, expect } from 'vitest';
import { calculateCAGR, calculateAbsoluteReturn, calculateAnnualizedReturn, calculateXIRR } from '../src/returns/index.js';
import { ValidationError, ConvergenceError } from '../src/core/errors.js';
import { validateDateRange } from '../src/core/validation.js';

describe('Returns Module', () => {
  describe('calculateCAGR()', () => {
    it('calculates 5-year doubling CAGR accurately', () => {
      const cagr = calculateCAGR({
        beginningValue: 100000,
        endingValue: 200000,
        years: 5,
      });

      // 2^(1/5) - 1 = 14.8698%
      expect(cagr).toBe(14.8698);
    });

    it('calculates CAGR using start and end date', () => {
      const cagr = calculateCAGR({
        beginningValue: 100000,
        endingValue: 161051,
        startDate: '2020-01-01',
        endDate: '2025-01-01', // ~5.0027 years
      });

      expect(cagr).toBeCloseTo(10, 0);
    });

    it('handles total loss (endingValue = 0)', () => {
      const cagr = calculateCAGR({
        beginningValue: 50000,
        endingValue: 0,
        years: 2,
      });

      expect(cagr).toBe(-100);
    });

    it('throws when missing duration or invalid values', () => {
      expect(() =>
        calculateCAGR({
          beginningValue: 0,
          endingValue: 100,
          years: 1,
        })
      ).toThrow(ValidationError);

      expect(() =>
        calculateCAGR({
          beginningValue: 100,
          endingValue: -50,
          years: 1,
        })
      ).toThrow(ValidationError);
    });

    it('throws when neither years nor dates are provided', () => {
      // Both duration arguments omitted entirely — must throw, not silently compute NaN
      expect(() =>
        calculateCAGR({
          beginningValue: 100000,
          endingValue: 200000,
        } as any)
      ).toThrow(ValidationError);
    });
  });

  describe('calculateAbsoluteReturn() & calculateAnnualizedReturn()', () => {
    it('calculates absolute returns accurately', () => {
      expect(
        calculateAbsoluteReturn({
          initialValue: 100000,
          finalValue: 135000,
        })
      ).toBe(35);

      expect(
        calculateAbsoluteReturn({
          initialValue: 100000,
          finalValue: 80000,
        })
      ).toBe(-20);
    });

    it('calculates annualized returns accurately', () => {
      const annualized = calculateAnnualizedReturn({
        initialValue: 100000,
        finalValue: 150000,
        years: 2,
      });

      // (1.5)^(1/2) - 1 = 22.4745%
      expect(annualized).toBe(22.4745);
    });

    it('calculates annualized return using explicit days parameter', () => {
      // 100000 -> 112000 over exactly 365 days (1 year) = 12.0% annualized
      const result = calculateAnnualizedReturn({
        initialValue: 100000,
        finalValue: 112000,
        days: 365,
      });

      expect(result).toBe(12.0);
    });

    it('calculates annualized return using startDate and endDate', () => {
      // 2022-01-01 to 2024-01-01 = 730 days exactly (2 non-leap years)
      // 100000 -> 121000 = (1.21)^(1/2) - 1 = 10.0% per year
      const result = calculateAnnualizedReturn({
        initialValue: 100000,
        finalValue: 121000,
        startDate: '2022-01-01',
        endDate: '2024-01-01',
      });

      expect(result).toBe(10.0);
    });

    it('returns -100 when finalValue is exactly zero (total loss)', () => {
      const result = calculateAnnualizedReturn({
        initialValue: 100000,
        finalValue: 0,
        years: 3,
      });

      expect(result).toBe(-100);
    });

    it('throws ValidationError when finalValue is negative', () => {
      // Negative final value has no meaningful compounded annualized return
      expect(() =>
        calculateAnnualizedReturn({
          initialValue: 100000,
          finalValue: -5000,
          years: 2,
        })
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when no duration parameter is provided', () => {
      expect(() =>
        calculateAnnualizedReturn({
          initialValue: 100000,
          finalValue: 150000,
        } as any)
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when validateDateRange receives same start and end date', () => {
      expect(() =>
        validateDateRange('2024-01-01', '2024-01-01')
      ).toThrow(ValidationError);
    });
  });

  describe('calculateXIRR()', () => {
    it('calculates exact 1-year 10% cash flow', () => {
      const rate = calculateXIRR([
        { date: '2023-01-01', amount: -100000 },
        { date: '2024-01-01', amount: 110000 },
      ]);

      // Exactly 365 days = 10.0000%
      expect(rate).toBeCloseTo(10.0, 2);
    });

    it('calculates multiple periodic investments with positive return', () => {
      const rate = calculateXIRR([
        { date: '2023-01-01', amount: -10000 },
        { date: '2023-02-01', amount: -10000 },
        { date: '2023-03-01', amount: -10000 },
        { date: '2023-04-01', amount: 31000 },
      ]);

      expect(rate).toBeGreaterThan(0);
      expect(Number.isFinite(rate)).toBe(true);
    });

    it('handles out-of-order dates and same-day flows', () => {
      const rate = calculateXIRR([
        { date: '2024-01-01', amount: 115000 },
        { date: '2023-01-01', amount: -50000 },
        { date: '2023-01-01', amount: -50000 }, // same day combined to -100,000
      ]);

      expect(rate).toBeCloseTo(15.0, 2);
    });

    it('handles high return scenarios cleanly', () => {
      const rate = calculateXIRR([
        { date: '2022-01-01', amount: -10000 },
        { date: '2024-01-01', amount: 40000 }, // 4x in 2 years ~ 100% per year
      ]);

      expect(rate).toBeCloseTo(100.0, 1);
    });

    it('handles negative XIRR (losses)', () => {
      const rate = calculateXIRR([
        { date: '2023-01-01', amount: -100000 },
        { date: '2024-01-01', amount: 80000 }, // -20% return
      ]);

      expect(rate).toBeCloseTo(-20.0, 2);
    });

    it('throws ValidationError for invalid cash flows', () => {
      expect(() =>
        calculateXIRR([
          { date: '2023-01-01', amount: -100000 },
          { date: '2023-01-01', amount: 100000 }, // cancels out on same day!
        ])
      ).toThrow(ValidationError);
    });

    it('forces bisection fallback when Newton-Raphson cannot converge within limited iterations', () => {
      // With maxIterations:10 and a deliberately extreme initial guess (500%), NR takes 10
      // damped steps (0.5 each) and stalls before reaching the 12% root.
      // converged=false triggers the bisection fallback which refines the bracket to 12.0%.
      // -100000 invested Jan 1 2023, +112000 redeemed Jan 1 2024 -> exact 12% XIRR.
      const rate = calculateXIRR(
        [
          { date: '2023-01-01', amount: -100000 },
          { date: '2024-01-01', amount: 112000 },
        ],
        { guess: 5.0, maxIterations: 10 },
      );

      expect(rate).toBeCloseTo(12.0, 1);
    });

    it('calculates XIRR for a loan/borrowing pattern (inflow then outflow)', () => {
      // Receiving a loan is a positive inflow; repaying is a negative outflow.
      // +100000 at start, -110000 one year later implies 10% borrowing cost.
      const rate = calculateXIRR([
        { date: '2023-01-01', amount: 100000 },
        { date: '2024-01-01', amount: -110000 },
      ]);

      expect(rate).toBeCloseTo(10.0, 2);
    });

    it('throws ConvergenceError when XIRR cannot be bracketed', () => {
      // Investing ₹1 on day 0 and receiving ₹1,000,000 on day 1 implies an XIRR so
      // astronomically large that NPV(r) is positive at every test point up to r=100
      // (10,000%). findBracket() returns null and ConvergenceError is thrown.
      expect(() =>
        calculateXIRR([
          { date: '2024-01-01', amount: -1 },
          { date: '2024-01-02', amount: 1000000 },
        ])
      ).toThrow(ConvergenceError);
    });

    it('ConvergenceError carries correct iterations and tolerance properties', () => {
      // Verify that the error object exposes the values it was constructed with,
      // so callers can inspect why convergence failed.
      let caughtErr: ConvergenceError | null = null;
      try {
        calculateXIRR([
          { date: '2024-01-01', amount: -1 },
          { date: '2024-01-02', amount: 1000000 },
        ]);
      } catch (err) {
        if (err instanceof ConvergenceError) caughtErr = err;
      }

      expect(caughtErr).not.toBeNull();
      expect(caughtErr!.name).toBe('ConvergenceError');
      // Default maxIterations=100 and tolerance=1e-7 must be reflected on the error
      expect(caughtErr!.iterations).toBe(100);
      expect(caughtErr!.tolerance).toBe(1e-7);
    });
  });
});
