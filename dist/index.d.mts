declare class FinKitError extends Error {
    constructor(message: string);
}
declare class ValidationError extends FinKitError {
    readonly field?: string;
    readonly receivedValue?: unknown;
    constructor(message: string, field?: string, receivedValue?: unknown);
}
declare class ConvergenceError extends FinKitError {
    readonly iterations: number;
    readonly tolerance: number;
    constructor(message: string, iterations: number, tolerance: number);
}

type CompoundingFrequency = 'annually' | 'semi-annually' | 'quarterly' | 'monthly' | 'daily';
interface InvestmentSummary {
    investedAmount: number;
    totalReturns: number;
    maturityAmount: number;
}
interface StepUpOptions {
    type: 'percentage' | 'fixed';
    value: number;
}
interface SIPOptions {
    monthlyInvestment: number;
    annualRate: number;
    tenureMonths: number;
    stepUp?: StepUpOptions;
    compoundingFrequency?: CompoundingFrequency;
    timing?: 'beginning' | 'end';
}
interface SIPYearlyBreakdown {
    year: number;
    monthlyInvestment: number;
    yearlyInvested: number;
    cumulativeInvested: number;
    yearEndValue: number;
    returnsEarned: number;
}
interface SIPResult extends InvestmentSummary {
    yearlyBreakdown?: SIPYearlyBreakdown[];
}
interface LumpSumOptions {
    principal: number;
    annualRate: number;
    tenureYears: number;
    compoundingFrequency?: CompoundingFrequency;
}
interface CAGROptions {
    beginningValue: number;
    endingValue: number;
    years?: number;
    startDate?: Date | string;
    endDate?: Date | string;
}
interface AbsoluteReturnsOptions {
    initialValue: number;
    finalValue: number;
}
interface AnnualizedReturnsOptions extends AbsoluteReturnsOptions {
    years?: number;
    days?: number;
    startDate?: Date | string;
    endDate?: Date | string;
}
interface CashFlow {
    date: Date | string;
    amount: number;
}
interface XIRROptions {
    guess?: number;
    tolerance?: number;
    maxIterations?: number;
}
interface EMIOptions {
    principal: number;
    annualRate: number;
    tenureMonths: number;
}
interface EMIResult {
    emi: number;
    principal: number;
    totalInterest: number;
    totalPayment: number;
}
interface Prepayment {
    month: number;
    amount: number;
}
interface AmortizationScheduleOptions extends EMIOptions {
    prepayments?: Prepayment[];
}
interface AmortizationScheduleEntry {
    month: number;
    openingBalance: number;
    emi: number;
    principalPaid: number;
    interestPaid: number;
    prepayment: number;
    closingBalance: number;
}
interface AmortizationResult extends EMIResult {
    originalTenureMonths: number;
    actualTenureMonths: number;
    tenureReducedMonths: number;
    interestSaved: number;
    schedule: AmortizationScheduleEntry[];
}
type FDPayout = 'cumulative' | 'monthly' | 'quarterly' | 'half-yearly' | 'annually';
interface FDOptions {
    principal: number;
    annualRate: number;
    tenureMonths?: number;
    tenureDays?: number;
    payout?: FDPayout;
    seniorCitizen?: boolean;
    seniorCitizenBonusRate?: number;
    compoundingFrequency?: CompoundingFrequency;
}
interface FDResult {
    principal: number;
    interestEarned: number;
    maturityAmount: number;
    effectiveYield: number;
    periodicPayout?: number;
}
interface RDOptions {
    monthlyDeposit: number;
    annualRate: number;
    tenureMonths: number;
    compoundingFrequency?: CompoundingFrequency;
    seniorCitizen?: boolean;
    seniorCitizenBonusRate?: number;
}
interface RDResult extends InvestmentSummary {
    effectiveYield: number;
}
interface RealReturnsOptions {
    nominalRate: number;
    inflationRate: number;
}
interface RealReturnsResult {
    nominalRate: number;
    inflationRate: number;
    realRate: number;
    approximateRealRate: number;
}
interface InflationAdjustedFutureValueOptions {
    nominalFutureValue: number;
    inflationRate: number;
    tenureYears: number;
}
interface InflationAdjustedFutureValueResult {
    nominalFutureValue: number;
    realFutureValue: number;
    purchasingPowerLossPercent: number;
}
interface TargetSIPForGoalOptions {
    targetCorpusInTodayMoney: number;
    inflationRate: number;
    expectedReturnRate: number;
    tenureYears: number;
}
interface TargetSIPForGoalResult {
    targetCorpusNominal: number;
    targetCorpusTodayMoney: number;
    requiredMonthlySIP: number;
    totalInvested: number;
    wealthGained: number;
}

/**
 * Rounds a number to a specified number of decimal places without floating-point artifacts.
 * Uses scientific notation shift to prevent issues like 1.005 -> 1.00.
 */
declare function round(value: number, decimals?: number): number;
/**
 * Converts a CompoundingFrequency into periods per year.
 */
declare function getPeriodsPerYear(frequency?: CompoundingFrequency): number;
/**
 * Converts a Date instance or valid ISO date string into a clean Date object at UTC midnight.
 */
declare function parseDate(dateInput: Date | string): Date;
/**
 * Calculates day difference between two dates (Actual/365 convention).
 */
declare function daysBetween(startDate: Date | string, endDate: Date | string): number;
/**
 * Calculates exact fractional years between two dates based on Actual/365 day-count convention.
 */
declare function yearsBetween(startDate: Date | string, endDate: Date | string): number;

declare function validateNumber(name: string, value: unknown): number;
declare function validatePositive(name: string, value: unknown, allowZero?: boolean): number;
declare function validateInteger(name: string, value: unknown, allowZero?: boolean): number;
declare function validateRate(name: string, rate: unknown, allowNegative?: boolean): number;
declare function validateDateRange(startDate: Date | string, endDate: Date | string): {
    start: Date;
    end: Date;
};
interface ValidatedCashFlow {
    date: Date;
    amount: number;
}
declare function validateCashFlows(cashFlows: unknown): ValidatedCashFlow[];

/**
 * Calculates maturity value, total invested amount, and returns for a Systematic Investment Plan (SIP).
 * Supports standard fixed monthly SIP and Step-up (Top-up) SIP with percentage or fixed annual increment.
 *
 * @param options SIP configuration parameters
 * @returns SIPResult containing investedAmount, totalReturns, maturityAmount, and optional yearlyBreakdown
 */
declare function calculateSIP(options: SIPOptions): SIPResult;

/**
 * Calculates maturity amount and returns for a one-time lump-sum investment.
 *
 * Formula: FV = P * (1 + r / n)^(n * t)
 *
 * @param options Lump-sum investment configuration
 * @returns InvestmentSummary containing investedAmount, totalReturns, and maturityAmount
 */
declare function calculateLumpSum(options: LumpSumOptions): InvestmentSummary;

/**
 * Calculates Compound Annual Growth Rate (CAGR).
 *
 * Formula: CAGR = ((endingValue / beginningValue) ^ (1 / years)) - 1
 *
 * @param options CAGR options including beginningValue, endingValue, and years or date range
 * @returns CAGR as a percentage (e.g. 15.25 for 15.25%)
 */
declare function calculateCAGR(options: CAGROptions): number;

/**
 * Calculates simple absolute return percentage.
 *
 * Formula: ((finalValue - initialValue) / initialValue) * 100
 *
 * @param options initialValue and finalValue
 * @returns Absolute return percentage (e.g. 25.5 for 25.5%)
 */
declare function calculateAbsoluteReturn(options: AbsoluteReturnsOptions): number;
/**
 * Calculates annualized return over a given duration.
 *
 * For periods >= 1 year, uses compounded annualized return (CAGR convention).
 * Supports explicit years, explicit days, or startDate/endDate range.
 *
 * @param options initialValue, finalValue, and duration parameters
 * @returns Annualized return percentage
 */
declare function calculateAnnualizedReturn(options: AnnualizedReturnsOptions): number;

/**
 * Calculates Extended Internal Rate of Return (XIRR) for irregular cash flows with dates.
 * Employs a robust hybrid numerical solver combining bounded Newton-Raphson with guaranteed bisection fallback.
 *
 * @param cashFlows Array of { date, amount } cash flows
 * @param options Optional configuration: { guess, tolerance, maxIterations }
 * @returns Annualized rate of return in percent (e.g. 14.52 for 14.52%)
 */
declare function calculateXIRR(cashFlows: CashFlow[], options?: XIRROptions): number;

/**
 * Calculates Equated Monthly Installment (EMI), total interest, and total payable amount.
 * Based on the reducing balance interest method standard in Indian banking.
 *
 * Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param options principal, annualRate, tenureMonths
 * @returns EMIResult { emi, principal, totalInterest, totalPayment }
 */
declare function calculateEMI(options: EMIOptions): EMIResult;

/**
 * Generates a complete month-by-month loan amortization schedule.
 * Supports optional prepayments, calculating the resulting tenure reduction and total interest saved.
 *
 * @param options Amortization schedule options including principal, annualRate, tenureMonths, and optional prepayments
 * @returns AmortizationResult with complete schedule and savings analytics
 */
declare function generateAmortizationSchedule(options: AmortizationScheduleOptions): AmortizationResult;

/**
 * Calculates maturity amount, interest earned, and effective yield for Fixed Deposits (FD).
 * Conforms to Reserve Bank of India (RBI) conventions:
 * - Quarterly compounding for cumulative deposits (tenure >= 6 months).
 * - Simple interest for short-term deposits (< 6 months).
 * - Support for Senior Citizen interest booster (default +0.50%).
 * - Support for non-cumulative periodic interest payouts (monthly, quarterly, half-yearly, annually).
 *
 * @param options FD configuration
 * @returns FDResult with maturity value, interest earned, effective yield, and optional periodic payout
 */
declare function calculateFD(options: FDOptions): FDResult;

/**
 * Calculates maturity amount, total invested, total returns, and effective yield for Recurring Deposits (RD).
 * Conforms to the standard Indian Banking and Indian Post Office calculation model:
 * Monthly installments compounded quarterly per RBI regulations.
 *
 * @param options RD configuration options
 * @returns RDResult containing investedAmount, totalReturns, maturityAmount, and effectiveYield
 */
declare function calculateRD(options: RDOptions): RDResult;

/**
 * Calculates real (inflation-adjusted) rate of return using the exact Fisher equation.
 *
 * Exact Fisher Relation: (1 + r_nominal) = (1 + r_real) * (1 + inflation)
 * => r_real = ((1 + r_nominal) / (1 + inflation)) - 1
 *
 * @param options nominalRate and inflationRate (in percentage)
 * @returns RealReturnsResult with exact realRate, approximateRealRate, nominalRate, and inflationRate
 */
declare function calculateRealRate(options: RealReturnsOptions): RealReturnsResult;

/**
 * Calculates the inflation-adjusted purchasing power (real value) of a future sum of money.
 *
 * Real Value = Nominal Value / (1 + inflation)^years
 *
 * @param options nominalFutureValue, inflationRate, tenureYears
 * @returns InflationAdjustedFutureValueResult with real value and purchasing power loss percentage
 */
declare function calculateInflationAdjustedValue(options: InflationAdjustedFutureValueOptions): InflationAdjustedFutureValueResult;

/**
 * Calculates the monthly SIP required to achieve a target financial goal in the future,
 * fully taking into account inflation and expected portfolio return.
 *
 * 1. Computes nominal future target = Target_today * (1 + inflation)^years
 * 2. Solves for monthly SIP required to reach that nominal future target under annuity due
 *
 * @param options Target corpus in today's money, inflation rate, expected return rate, tenure years
 * @returns TargetSIPForGoalResult { targetCorpusNominal, targetCorpusTodayMoney, requiredMonthlySIP, totalInvested, wealthGained }
 */
declare function calculateTargetSIP(options: TargetSIPForGoalOptions): TargetSIPForGoalResult;

export { type AbsoluteReturnsOptions, type AmortizationResult, type AmortizationScheduleEntry, type AmortizationScheduleOptions, type AnnualizedReturnsOptions, type CAGROptions, type CashFlow, type CompoundingFrequency, ConvergenceError, type EMIOptions, type EMIResult, type FDOptions, type FDPayout, type FDResult, FinKitError, type InflationAdjustedFutureValueOptions, type InflationAdjustedFutureValueResult, type InvestmentSummary, type LumpSumOptions, type Prepayment, type RDOptions, type RDResult, type RealReturnsOptions, type RealReturnsResult, type SIPOptions, type SIPResult, type SIPYearlyBreakdown, type StepUpOptions, type TargetSIPForGoalOptions, type TargetSIPForGoalResult, ValidationError, type XIRROptions, calculateAbsoluteReturn, calculateAnnualizedReturn, calculateCAGR, calculateEMI, calculateFD, calculateInflationAdjustedValue, calculateLumpSum, calculateRD, calculateRealRate, calculateSIP, calculateTargetSIP, calculateXIRR, daysBetween, generateAmortizationSchedule, getPeriodsPerYear, parseDate, round, validateCashFlows, validateDateRange, validateInteger, validateNumber, validatePositive, validateRate, yearsBetween };
