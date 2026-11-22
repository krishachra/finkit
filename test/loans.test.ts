import { describe, it, expect } from 'vitest';
import { calculateEMI, generateAmortizationSchedule } from '../src/loans/index.js';
import { ValidationError } from '../src/core/errors.js';

describe('Loans Module', () => {
  describe('calculateEMI()', () => {
    it('calculates standard home loan EMI matching Indian banking benchmark', () => {
      const result = calculateEMI({
        principal: 1000000, // 10 Lakh
        annualRate: 8.5,
        tenureMonths: 240, // 20 years
      });

      expect(result.emi).toBe(8678.23);
      expect(result.principal).toBe(1000000);
      expect(result.totalPayment).toBe(2082775.2);
      expect(result.totalInterest).toBe(1082775.2);
    });

    it('calculates 0% interest loan correctly', () => {
      const result = calculateEMI({
        principal: 120000,
        annualRate: 0,
        tenureMonths: 12,
      });

      expect(result.emi).toBe(10000);
      expect(result.totalInterest).toBe(0);
      expect(result.totalPayment).toBe(120000);
    });

    it('throws on invalid inputs', () => {
      expect(() =>
        calculateEMI({
          principal: 0,
          annualRate: 8,
          tenureMonths: 12,
        })
      ).toThrow(ValidationError);

      expect(() =>
        calculateEMI({
          principal: 100000,
          annualRate: -2,
          tenureMonths: 12,
        })
      ).toThrow(ValidationError);

      expect(() =>
        calculateEMI({
          principal: 100000,
          annualRate: 8,
          tenureMonths: 0,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('generateAmortizationSchedule()', () => {
    it('generates a full consistent month-by-month schedule', () => {
      const result = generateAmortizationSchedule({
        principal: 100000,
        annualRate: 12,
        tenureMonths: 12,
      });

      expect(result.schedule).toHaveLength(12);
      expect(result.schedule[0].openingBalance).toBe(100000);
      expect(result.schedule[11].closingBalance).toBe(0);

      // Verify each row's mathematical integrity
      for (let i = 0; i < result.schedule.length; i++) {
        const row = result.schedule[i];
        expect(row.month).toBe(i + 1);
        expect(row.closingBalance).toBe(
          Math.max(0, Math.round((row.openingBalance - row.principalPaid) * 100) / 100)
        );
      }
    });

    it('calculates interest saved and tenure reduction on prepayment', () => {
      const result = generateAmortizationSchedule({
        principal: 1000000,
        annualRate: 9,
        tenureMonths: 120, // 10 years
        prepayments: [
          { month: 12, amount: 200000 }, // ₹2 Lakh prepayment at month 12
        ],
      });

      expect(result.actualTenureMonths).toBeLessThan(120);
      expect(result.tenureReducedMonths).toBeGreaterThan(0);
      expect(result.interestSaved).toBeGreaterThan(0);
      expect(result.schedule[result.schedule.length - 1].closingBalance).toBe(0);
    });

    it('generates correct amortization schedule for 0% interest loan', () => {
      const result = generateAmortizationSchedule({
        principal: 120000,
        annualRate: 0,
        tenureMonths: 12,
      });

      expect(result.emi).toBe(10000);
      expect(result.totalInterest).toBe(0);
      expect(result.totalPayment).toBe(120000);
      expect(result.schedule).toHaveLength(12);

      for (const row of result.schedule) {
        expect(row.interestPaid).toBe(0);
        expect(row.principalPaid).toBe(10000);
      }
      expect(result.schedule[11].closingBalance).toBe(0);
    });

    it('handles multiple prepayments in the same month correctly', () => {
      const result = generateAmortizationSchedule({
        principal: 100000,
        annualRate: 12,
        tenureMonths: 12,
        prepayments: [
          { month: 6, amount: 5000 },
          { month: 6, amount: 10000 }, // combined ₹15,000 at month 6
        ],
      });

      // Combined prepayment at month 6 reduces loan payoff to 11 months
      const month6Row = result.schedule.find((r) => r.month === 6);
      expect(month6Row).toBeDefined();
      expect(month6Row!.prepayment).toBe(15000);
      expect(result.actualTenureMonths).toBe(11);
      expect(result.tenureReducedMonths).toBe(1);
      expect(result.schedule[result.schedule.length - 1].closingBalance).toBe(0);
    });

    it('throws if prepayment month is outside tenure', () => {
      expect(() =>
        generateAmortizationSchedule({
          principal: 100000,
          annualRate: 10,
          tenureMonths: 12,
          prepayments: [{ month: 15, amount: 10000 }],
        })
      ).toThrow(ValidationError);
    });
  });
});
