# Changelog

All notable changes to FinKit are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-22

### Added

**Investment calculations**
- `calculateSIP` — SIP with annuity due / annuity immediate timing, plus yearly breakdown
- `calculateSIP` with step-up — percentage and fixed annual increment variants
- `calculateLumpSum` — one-time investment with five compounding frequencies

**Returns calculations**
- `calculateCAGR` — compound annual growth rate by years or date range
- `calculateAbsoluteReturn` — simple point-to-point return percentage
- `calculateAnnualizedReturn` — compounded annualized return by years, days, or date range
- `calculateXIRR` — extended IRR for irregular cash flows; hybrid Newton-Raphson + bisection solver

**Loan calculations**
- `calculateEMI` — equated monthly installment using reducing balance method
- `generateAmortizationSchedule` — full month-by-month schedule with optional prepayments

**Deposit calculations**
- `calculateFD` — fixed deposit; cumulative (quarterly compound), short-term (simple interest), and four non-cumulative payout types; senior citizen rate support
- `calculateRD` — recurring deposit using Indian quarterly compounding standard

**Inflation and goal planning**
- `calculateRealRate` — exact real rate via Fisher equation plus naive approximation
- `calculateInflationAdjustedValue` — purchasing power erosion over time
- `calculateTargetSIP` — monthly SIP required to meet an inflation-adjusted future corpus

**Developer experience**
- Full TypeScript declarations with named exports for every function and type
- Dual ESM + CommonJS output via tsup
- Zero production dependencies
- `ValidationError` and `ConvergenceError` with typed fields for programmatic handling

**Quality**
- 88 unit tests across 6 test suites
- Statement coverage: 97.20%, Branch coverage: 94.16%, Function coverage: 100%
