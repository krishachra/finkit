import { describe, it, expect } from 'vitest';
import { calculateRealRate, calculateInflationAdjustedValue, calculateTargetSIP } from '../src/inflation/index.js';
import { ValidationError } from '../src/core/errors.js';

describe('Inflation Module', () => {
  describe('calculateRealRate()', () => {
    it('calculates exact real rate using Fisher equation', () => {
      const result = calculateRealRate({
        nominalRate: 12,
        inflationRate: 6,
      });

      // (1.12 / 1.06 - 1) * 100 = 5.6604%
      expect(result.realRate).toBe(5.6604);
      expect(result.approximateRealRate).toBe(6.0);
    });

    it('handles negative real returns when inflation exceeds nominal returns', () => {
      const result = calculateRealRate({
        nominalRate: 5,
        inflationRate: 8,
      });

      // (1.05 / 1.08 - 1) * 100 = -2.7778%
      expect(result.realRate).toBe(-2.7778);
      expect(result.approximateRealRate).toBe(-3.0);
    });

    it('throws when inflation rate is <= -100%', () => {
      expect(() =>
        calculateRealRate({
          nominalRate: 10,
          inflationRate: -100,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('calculateInflationAdjustedValue()', () => {
    it('calculates purchasing power degradation accurately', () => {
      const result = calculateInflationAdjustedValue({
        nominalFutureValue: 1000000,
        inflationRate: 6,
        tenureYears: 10,
      });

      // 1,000,000 / (1.06^10) = 558,394.78
      expect(result.realFutureValue).toBe(558394.78);
      expect(result.purchasingPowerLossPercent).toBe(44.16);
    });

    it('handles 0% inflation', () => {
      const result = calculateInflationAdjustedValue({
        nominalFutureValue: 500000,
        inflationRate: 0,
        tenureYears: 5,
      });

      expect(result.realFutureValue).toBe(500000);
      expect(result.purchasingPowerLossPercent).toBe(0);
    });

    it('handles zero nominal future value correctly', () => {
      const result = calculateInflationAdjustedValue({
        nominalFutureValue: 0,
        inflationRate: 6,
        tenureYears: 10,
      });

      expect(result.nominalFutureValue).toBe(0);
      expect(result.realFutureValue).toBe(0);
      expect(result.purchasingPowerLossPercent).toBe(0);
    });

    it('throws when inflation rate is <= -100%', () => {
      expect(() =>
        calculateInflationAdjustedValue({
          nominalFutureValue: 100000,
          inflationRate: -100,
          tenureYears: 5,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('calculateTargetSIP()', () => {
    it('calculates required monthly SIP to achieve 15-year future goal', () => {
      const result = calculateTargetSIP({
        targetCorpusInTodayMoney: 10000000, // 1 Crore today
        inflationRate: 6,
        expectedReturnRate: 12,
        tenureYears: 15,
      });

      expect(result.targetCorpusNominal).toBe(23965581.93);
      expect(result.targetCorpusTodayMoney).toBe(10000000);
      expect(result.requiredMonthlySIP).toBe(47496.48);
      expect(result.totalInvested).toBe(8549366.4);
      expect(result.wealthGained).toBe(15416215.53);
    });

    it('calculates target SIP with 0% expected portfolio return rate', () => {
      // With 0% returns, required SIP is purely nominal goal divided by total months
      const result = calculateTargetSIP({
        targetCorpusInTodayMoney: 1000000,
        inflationRate: 5,
        expectedReturnRate: 0,
        tenureYears: 10,
      });

      expect(result.targetCorpusNominal).toBe(1628894.63);
      expect(result.requiredMonthlySIP).toBe(13574.12);
      expect(result.totalInvested).toBe(1628894.4);
      expect(result.wealthGained).toBe(0.23); // small rounding difference
    });

    it('throws on invalid goal inputs', () => {
      expect(() =>
        calculateTargetSIP({
          targetCorpusInTodayMoney: -100,
          inflationRate: 6,
          expectedReturnRate: 12,
          tenureYears: 5,
        })
      ).toThrow(ValidationError);
    });
  });
});
