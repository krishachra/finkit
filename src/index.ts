// Errors
export { FinKitError, ValidationError, ConvergenceError } from './core/errors.js';

// Core Math & Validation Utilities
export {
  round,
  getPeriodsPerYear,
  parseDate,
  daysBetween,
  yearsBetween,
} from './core/math.js';

export {
  validateNumber,
  validatePositive,
  validateInteger,
  validateRate,
  validateDateRange,
  validateCashFlows,
} from './core/validation.js';

// Investments
export { calculateSIP, calculateLumpSum } from './investments/index.js';

// Returns
export {
  calculateCAGR,
  calculateAbsoluteReturn,
  calculateAnnualizedReturn,
  calculateXIRR,
} from './returns/index.js';

// Loans
export { calculateEMI, generateAmortizationSchedule } from './loans/index.js';

// Deposits
export { calculateFD, calculateRD } from './deposits/index.js';

// Inflation & Goal Planning
export {
  calculateRealRate,
  calculateInflationAdjustedValue,
  calculateTargetSIP,
} from './inflation/index.js';

// Types & Interfaces
export type {
  CompoundingFrequency,
  InvestmentSummary,
  StepUpOptions,
  SIPOptions,
  SIPYearlyBreakdown,
  SIPResult,
  LumpSumOptions,
  CAGROptions,
  AbsoluteReturnsOptions,
  AnnualizedReturnsOptions,
  CashFlow,
  XIRROptions,
  EMIOptions,
  EMIResult,
  Prepayment,
  AmortizationScheduleOptions,
  AmortizationScheduleEntry,
  AmortizationResult,
  FDPayout,
  FDOptions,
  FDResult,
  RDOptions,
  RDResult,
  RealReturnsOptions,
  RealReturnsResult,
  InflationAdjustedFutureValueOptions,
  InflationAdjustedFutureValueResult,
  TargetSIPForGoalOptions,
  TargetSIPForGoalResult,
} from './types/index.js';
