import { describe, it, expect } from 'vitest';
import { calculateSIP, calculateLumpSum } from '../src/investments/index.js';
import { ValidationError } from '../src/core/errors.js';

describe('Investments Module', () => {
  describe('calculateSIP()', () => {
    it('calculates standard Indian SIP accurately (annuity due)', () => {
      const result = calculateSIP({
        monthlyInvestment: 10000,
        annualRate: 12,
        tenureMonths: 120, // 10 years
      });

      expect(result.investedAmount).toBe(1200000);
      expect(result.maturityAmount).toBe(2323390.76);
      expect(result.totalReturns).toBe(1123390.76);
    });

    it('calculates SIP with timing = "end" (annuity immediate)', () => {
      const result = calculateSIP({
        monthlyInvestment: 10000,
        annualRate: 12,
        tenureMonths: 120,
        timing: 'end',
      });

      expect(result.investedAmount).toBe(1200000);
      // M = 10000 * ((1.01^120 - 1) / 0.01) = 2,300,386.89
      expect(result.maturityAmount).toBe(2300386.89);
      expect(result.totalReturns).toBe(1100386.89);
    });

    it('handles 0% annual rate correctly', () => {
      const result = calculateSIP({
        monthlyInvestment: 5000,
        annualRate: 0,
        tenureMonths: 24,
      });

      expect(result.investedAmount).toBe(120000);
      expect(result.maturityAmount).toBe(120000);
      expect(result.totalReturns).toBe(0);
    });

    it('calculates Step-Up SIP with percentage increment', () => {
      const result = calculateSIP({
        monthlyInvestment: 10000,
        annualRate: 12,
        tenureMonths: 24, // 2 years
        stepUp: {
          type: 'percentage',
          value: 10, // 10% annual step-up
        },
      });

      // Year 1: 10,000 * 12 = 120,000
      // Year 2: 11,000 * 12 = 132,000
      // Total Invested = 252,000
      expect(result.investedAmount).toBe(252000);
      expect(result.maturityAmount).toBeGreaterThan(252000);
      expect(result.yearlyBreakdown).toHaveLength(2);
      expect(result.yearlyBreakdown![0].monthlyInvestment).toBe(10000);
      expect(result.yearlyBreakdown![1].monthlyInvestment).toBe(11000);
    });

    it('calculates Step-Up SIP with fixed amount increment', () => {
      const result = calculateSIP({
        monthlyInvestment: 5000,
        annualRate: 10,
        tenureMonths: 24,
        stepUp: {
          type: 'fixed',
          value: 1000, // ₹1,000 step-up per year
        },
      });

      // Year 1: 5,000 * 12 = 60,000
      // Year 2: 6,000 * 12 = 72,000
      // Total Invested = 132,000
      expect(result.investedAmount).toBe(132000);
      expect(result.yearlyBreakdown![0].monthlyInvestment).toBe(5000);
      expect(result.yearlyBreakdown![1].monthlyInvestment).toBe(6000);
    });

    it('calculates Step-Up SIP with timing = "end" (annuity immediate)', () => {
      // Month-by-month compounding with payments made at end of month
      const result = calculateSIP({
        monthlyInvestment: 10000,
        annualRate: 12,
        tenureMonths: 24,
        stepUp: {
          type: 'percentage',
          value: 10,
        },
        timing: 'end',
      });

      expect(result.investedAmount).toBe(252000);
      expect(result.maturityAmount).toBe(282417.15);
      expect(result.totalReturns).toBe(30417.15);
    });

    it('throws on invalid inputs', () => {
      expect(() =>
        calculateSIP({
          monthlyInvestment: 10000,
          annualRate: 12,
          tenureMonths: 12,
          stepUp: {
            type: 'multiplier' as any,
            value: 2,
          },
        })
      ).toThrow(ValidationError);
      expect(() =>
        calculateSIP({
          monthlyInvestment: -1000,
          annualRate: 12,
          tenureMonths: 12,
        })
      ).toThrow(ValidationError);

      expect(() =>
        calculateSIP({
          monthlyInvestment: 1000,
          annualRate: -5,
          tenureMonths: 12,
        })
      ).toThrow(ValidationError);

      expect(() =>
        calculateSIP({
          monthlyInvestment: 1000,
          annualRate: 12,
          tenureMonths: 0,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('calculateLumpSum()', () => {
    it('calculates annual compounding correctly', () => {
      const result = calculateLumpSum({
        principal: 100000,
        annualRate: 10,
        tenureYears: 5,
        compoundingFrequency: 'annually',
      });

      expect(result.investedAmount).toBe(100000);
      expect(result.maturityAmount).toBe(161051);
      expect(result.totalReturns).toBe(61051);
    });

    it('calculates quarterly compounding correctly', () => {
      const result = calculateLumpSum({
        principal: 100000,
        annualRate: 10,
        tenureYears: 5,
        compoundingFrequency: 'quarterly',
      });

      expect(result.investedAmount).toBe(100000);
      expect(result.maturityAmount).toBe(163861.64);
      expect(result.totalReturns).toBe(63861.64);
    });

    it('calculates semi-annual compounding correctly', () => {
      const result = calculateLumpSum({
        principal: 100000,
        annualRate: 10,
        tenureYears: 5,
        compoundingFrequency: 'semi-annually',
      });

      expect(result.investedAmount).toBe(100000);
      expect(result.maturityAmount).toBe(162889.46);
      expect(result.totalReturns).toBe(62889.46);
    });

    it('calculates monthly compounding correctly', () => {
      const result = calculateLumpSum({
        principal: 100000,
        annualRate: 10,
        tenureYears: 5,
        compoundingFrequency: 'monthly',
      });

      expect(result.investedAmount).toBe(100000);
      expect(result.maturityAmount).toBe(164530.89);
      expect(result.totalReturns).toBe(64530.89);
    });

    it('calculates daily compounding correctly', () => {
      const result = calculateLumpSum({
        principal: 100000,
        annualRate: 10,
        tenureYears: 5,
        compoundingFrequency: 'daily',
      });

      expect(result.investedAmount).toBe(100000);
      expect(result.maturityAmount).toBe(164860.84);
      expect(result.totalReturns).toBe(64860.84);
    });

    it('handles 0% interest rate', () => {
      const result = calculateLumpSum({
        principal: 50000,
        annualRate: 0,
        tenureYears: 3,
      });

      expect(result.investedAmount).toBe(50000);
      expect(result.maturityAmount).toBe(50000);
      expect(result.totalReturns).toBe(0);
    });

    it('throws on invalid principal or rate', () => {
      expect(() =>
        calculateLumpSum({
          principal: 0,
          annualRate: 10,
          tenureYears: 5,
        })
      ).toThrow(ValidationError);
    });
  });
});
