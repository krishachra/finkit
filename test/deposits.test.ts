import { describe, it, expect } from 'vitest';
import { calculateFD, calculateRD } from '../src/deposits/index.js';
import { ValidationError } from '../src/core/errors.js';

describe('Deposits Module', () => {
  describe('calculateFD()', () => {
    it('calculates standard 1-year cumulative FD with quarterly compounding', () => {
      const result = calculateFD({
        principal: 100000,
        annualRate: 7.0,
        tenureMonths: 12,
      });

      // 100,000 * (1 + 0.07/4)^4 = 107,185.90
      expect(result.principal).toBe(100000);
      expect(result.maturityAmount).toBe(107185.9);
      expect(result.interestEarned).toBe(7185.9);
      expect(result.effectiveYield).toBe(7.1859);
    });

    it('calculates Senior Citizen FD with rate booster', () => {
      const regular = calculateFD({
        principal: 100000,
        annualRate: 7.0,
        tenureMonths: 12,
        seniorCitizen: false,
      });

      const senior = calculateFD({
        principal: 100000,
        annualRate: 7.0,
        tenureMonths: 12,
        seniorCitizen: true, // +0.50% -> 7.50%
      });

      expect(senior.maturityAmount).toBeGreaterThan(regular.maturityAmount);
      // 100,000 * (1 + 0.075/4)^4 = 107,713.59
      expect(senior.maturityAmount).toBe(107713.59);
    });

    it('calculates quarterly payout non-cumulative FD', () => {
      const result = calculateFD({
        principal: 100000,
        annualRate: 8.0,
        tenureMonths: 12,
        payout: 'quarterly',
      });

      expect(result.periodicPayout).toBe(2000);
      expect(result.interestEarned).toBe(8000);
      expect(result.maturityAmount).toBe(100000);
    });

    it('calculates monthly payout non-cumulative FD using discounted formula', () => {
      // RBI standard discounted monthly payout: P * ((1 + r/400)^(1/3) - 1)
      // 100,000 * ((1 + 0.02)^(1/3) - 1) = 662.27 per month
      const result = calculateFD({
        principal: 100000,
        annualRate: 8.0,
        tenureMonths: 12,
        payout: 'monthly',
      });

      expect(result.periodicPayout).toBe(662.27);
      expect(result.interestEarned).toBe(7947.24);
      expect(result.effectiveYield).toBe(7.9472);
      expect(result.maturityAmount).toBe(100000);
    });

    it('calculates half-yearly payout non-cumulative FD', () => {
      const result = calculateFD({
        principal: 100000,
        annualRate: 8.0,
        tenureMonths: 12,
        payout: 'half-yearly',
      });

      expect(result.periodicPayout).toBe(4000);
      expect(result.interestEarned).toBe(8000);
      expect(result.effectiveYield).toBe(8.0);
      expect(result.maturityAmount).toBe(100000);
    });

    it('calculates annual payout non-cumulative FD', () => {
      const result = calculateFD({
        principal: 100000,
        annualRate: 8.0,
        tenureMonths: 12,
        payout: 'annually',
      });

      expect(result.periodicPayout).toBe(8000);
      expect(result.interestEarned).toBe(8000);
      expect(result.effectiveYield).toBe(8.0);
      expect(result.maturityAmount).toBe(100000);
    });

    it('handles 0% annual interest rate FD correctly', () => {
      const result = calculateFD({
        principal: 100000,
        annualRate: 0,
        tenureMonths: 12,
      });

      expect(result.principal).toBe(100000);
      expect(result.interestEarned).toBe(0);
      expect(result.maturityAmount).toBe(100000);
      expect(result.effectiveYield).toBe(0);
    });

    it('throws ValidationError for unsupported FD payout type', () => {
      expect(() =>
        calculateFD({
          principal: 100000,
          annualRate: 7.0,
          tenureMonths: 12,
          payout: 'bi-weekly' as any,
        })
      ).toThrow(ValidationError);
    });

    it('calculates FD with tenureDays >= 180 days using quarterly compounding', () => {
      // For tenureDays >= 180, compounding applies rather than simple interest
      const result = calculateFD({
        principal: 100000,
        annualRate: 7.0,
        tenureDays: 365,
        compoundingFrequency: 'quarterly',
      });

      expect(result.maturityAmount).toBe(107185.9);
      expect(result.interestEarned).toBe(7185.9);
    });

    it('calculates short term FD (< 180 days) using simple interest', () => {
      const result = calculateFD({
        principal: 100000,
        annualRate: 6.0,
        tenureDays: 90,
      });

      // Simple interest: 100,000 * 0.06 * (90/365) = 1479.45
      expect(result.interestEarned).toBe(1479.45);
      expect(result.maturityAmount).toBe(101479.45);
    });

    it('throws when neither tenureMonths nor tenureDays is provided', () => {
      expect(() =>
        calculateFD({
          principal: 100000,
          annualRate: 7.0,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('calculateRD()', () => {
    it('calculates standard 12-month recurring deposit matching RBI model', () => {
      const result = calculateRD({
        monthlyDeposit: 5000,
        annualRate: 7.0,
        tenureMonths: 12,
      });

      expect(result.investedAmount).toBe(60000);
      expect(result.maturityAmount).toBe(62310.66);
      expect(result.totalReturns).toBe(2310.66);
      expect(result.effectiveYield).toBeCloseTo(3.851, 2);
    });

    it('handles senior citizen rate in recurring deposit', () => {
      const regular = calculateRD({
        monthlyDeposit: 5000,
        annualRate: 7.0,
        tenureMonths: 12,
      });

      const senior = calculateRD({
        monthlyDeposit: 5000,
        annualRate: 7.0,
        tenureMonths: 12,
        seniorCitizen: true,
      });

      expect(senior.maturityAmount).toBeGreaterThan(regular.maturityAmount);
      expect(senior.investedAmount).toBe(60000);
    });

    it('handles 0% annual rate in RD', () => {
      const result = calculateRD({
        monthlyDeposit: 2000,
        annualRate: 0,
        tenureMonths: 6,
      });

      expect(result.investedAmount).toBe(12000);
      expect(result.maturityAmount).toBe(12000);
      expect(result.totalReturns).toBe(0);
    });

    it('calculates RD with annual compounding frequency', () => {
      const result = calculateRD({
        monthlyDeposit: 5000,
        annualRate: 7.0,
        tenureMonths: 12,
        compoundingFrequency: 'annually',
      });

      expect(result.investedAmount).toBe(60000);
      expect(result.maturityAmount).toBe(62251.49);
      expect(result.totalReturns).toBe(2251.49);
      expect(result.effectiveYield).toBeCloseTo(3.7525, 3);
    });

    it('calculates RD with monthly compounding frequency', () => {
      const result = calculateRD({
        monthlyDeposit: 5000,
        annualRate: 7.0,
        tenureMonths: 12,
        compoundingFrequency: 'monthly',
      });

      expect(result.investedAmount).toBe(60000);
      expect(result.maturityAmount).toBe(62324.38);
      expect(result.totalReturns).toBe(2324.38);
      expect(result.effectiveYield).toBeCloseTo(3.874, 3);
    });
  });
});
