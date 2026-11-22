export type CompoundingFrequency =
  | 'annually'
  | 'semi-annually'
  | 'quarterly'
  | 'monthly'
  | 'daily';

export interface InvestmentSummary {
  investedAmount: number;
  totalReturns: number;
  maturityAmount: number;
}

export interface StepUpOptions {
  type: 'percentage' | 'fixed';
  value: number; // e.g. 10 for 10% per year, or 1000 for ₹1000 fixed increase per year
}

export interface SIPOptions {
  monthlyInvestment: number;
  annualRate: number; // in percentage, e.g. 12 for 12%
  tenureMonths: number;
  stepUp?: StepUpOptions;
  compoundingFrequency?: CompoundingFrequency;
  timing?: 'beginning' | 'end'; // SIP installment timing, defaults to 'beginning' (annuity due)
}

export interface SIPYearlyBreakdown {
  year: number;
  monthlyInvestment: number;
  yearlyInvested: number;
  cumulativeInvested: number;
  yearEndValue: number;
  returnsEarned: number;
}

export interface SIPResult extends InvestmentSummary {
  yearlyBreakdown?: SIPYearlyBreakdown[];
}

export interface LumpSumOptions {
  principal: number;
  annualRate: number; // in percentage, e.g. 12 for 12%
  tenureYears: number;
  compoundingFrequency?: CompoundingFrequency;
}

export interface CAGROptions {
  beginningValue: number;
  endingValue: number;
  years?: number;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface AbsoluteReturnsOptions {
  initialValue: number;
  finalValue: number;
}

export interface AnnualizedReturnsOptions extends AbsoluteReturnsOptions {
  years?: number;
  days?: number;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface CashFlow {
  date: Date | string;
  amount: number; // negative for investment outflows, positive for redemptions/inflows
}

export interface XIRROptions {
  guess?: number; // Initial rate guess (e.g. 0.1 for 10%)
  tolerance?: number; // Convergence tolerance, default 1e-7
  maxIterations?: number; // Max iterations, default 100
}

export interface EMIOptions {
  principal: number;
  annualRate: number; // in percentage, e.g. 8.5 for 8.5%
  tenureMonths: number;
}

export interface EMIResult {
  emi: number;
  principal: number;
  totalInterest: number;
  totalPayment: number;
}

export interface Prepayment {
  month: number;
  amount: number;
}

export interface AmortizationScheduleOptions extends EMIOptions {
  prepayments?: Prepayment[];
}

export interface AmortizationScheduleEntry {
  month: number;
  openingBalance: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  prepayment: number;
  closingBalance: number;
}

export interface AmortizationResult extends EMIResult {
  originalTenureMonths: number;
  actualTenureMonths: number;
  tenureReducedMonths: number;
  interestSaved: number;
  schedule: AmortizationScheduleEntry[];
}

export type FDPayout = 'cumulative' | 'monthly' | 'quarterly' | 'half-yearly' | 'annually';

export interface FDOptions {
  principal: number;
  annualRate: number; // in percentage
  tenureMonths?: number;
  tenureDays?: number;
  payout?: FDPayout;
  seniorCitizen?: boolean; // if true, senior citizen rate boost can be applied
  seniorCitizenBonusRate?: number; // default 0.5% (standard in Indian banks)
  compoundingFrequency?: CompoundingFrequency; // default 'quarterly' per Indian banking standard
}

export interface FDResult {
  principal: number;
  interestEarned: number;
  maturityAmount: number;
  effectiveYield: number; // percentage
  periodicPayout?: number; // for non-cumulative options
}

export interface RDOptions {
  monthlyDeposit: number;
  annualRate: number; // in percentage
  tenureMonths: number;
  compoundingFrequency?: CompoundingFrequency; // defaults to 'quarterly' (Indian bank standard)
  seniorCitizen?: boolean;
  seniorCitizenBonusRate?: number;
}

export interface RDResult extends InvestmentSummary {
  effectiveYield: number; // percentage
}

export interface RealReturnsOptions {
  nominalRate: number; // percentage
  inflationRate: number; // percentage
}

export interface RealReturnsResult {
  nominalRate: number;
  inflationRate: number;
  realRate: number; // exact Fisher equation: ((1 + n)/(1 + i) - 1) * 100
  approximateRealRate: number; // n - i
}

export interface InflationAdjustedFutureValueOptions {
  nominalFutureValue: number;
  inflationRate: number; // percentage
  tenureYears: number;
}

export interface InflationAdjustedFutureValueResult {
  nominalFutureValue: number;
  realFutureValue: number;
  purchasingPowerLossPercent: number;
}

export interface TargetSIPForGoalOptions {
  targetCorpusInTodayMoney: number;
  inflationRate: number; // percentage
  expectedReturnRate: number; // percentage
  tenureYears: number;
}

export interface TargetSIPForGoalResult {
  targetCorpusNominal: number;
  targetCorpusTodayMoney: number;
  requiredMonthlySIP: number;
  totalInvested: number;
  wealthGained: number;
}
