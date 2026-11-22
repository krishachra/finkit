# FinKit

A financial mathematics toolkit for JavaScript and TypeScript.

Provides precise implementations of the calculations used daily in Indian fintech: SIP, EMI, CAGR, XIRR, FD/RD maturity, real returns, and goal planning — with correct compounding conventions, honest error messages, and zero production dependencies.

```
npm install @krish_achra/finkit
```

Requires Node.js 18 or later.

---

## Modules

| Module | Functions |
|---|---|
| **Investments** | `calculateSIP`, `calculateLumpSum` |
| **Returns** | `calculateCAGR`, `calculateAbsoluteReturn`, `calculateAnnualizedReturn`, `calculateXIRR` |
| **Loans** | `calculateEMI`, `generateAmortizationSchedule` |
| **Deposits** | `calculateFD`, `calculateRD` |
| **Inflation** | `calculateRealRate`, `calculateInflationAdjustedValue`, `calculateTargetSIP` |

---

## Quick start

```ts
import { calculateSIP, calculateEMI, calculateXIRR } from '@krish_achra/finkit';

// SIP: ₹5,000/month for 10 years at 12% annual return
const sip = calculateSIP({
  monthlyInvestment: 5000,
  annualRate: 12,
  tenureMonths: 120,
});
console.log(sip.maturityAmount);  // 11,616.95 (annuity due, beginning-of-month)
console.log(sip.investedAmount);  // 600,000
console.log(sip.totalReturns);    // 516,950 (approximate — see actual output)

// EMI: ₹50 lakh home loan at 8.5% for 20 years
const emi = calculateEMI({
  principal: 5_000_000,
  annualRate: 8.5,
  tenureMonths: 240,
});
console.log(emi.emi);           // monthly EMI
console.log(emi.totalInterest); // total interest over loan term

// XIRR: mutual fund investment and partial redemptions
const xirr = calculateXIRR([
  { date: '2021-01-01', amount: -100000 },
  { date: '2022-01-01', amount: -50000  },
  { date: '2023-06-15', amount:  175000 },
]);
console.log(xirr); // annualized return in percent
```

---

## API reference

### `calculateSIP(options)`

Calculates maturity value for a Systematic Investment Plan.

**Compounding convention:** monthly (rate / 12 per month).  
**Payment timing:** `'beginning'` (annuity due, default) matches Indian mutual fund industry practice. Use `'end'` for annuity immediate.  
**Step-up SIP:** annual increment applied from month 13 onwards.

```ts
import { calculateSIP } from '@krish_achra/finkit';

// Standard SIP
const result = calculateSIP({
  monthlyInvestment: 10000,  // monthly amount in ₹
  annualRate: 12,            // annual return in percent
  tenureMonths: 60,          // investment period
});
// result.investedAmount   — total amount invested
// result.maturityAmount   — corpus at end of tenure
// result.totalReturns     — returns earned

// Step-up SIP with 10% annual increment
const stepUp = calculateSIP({
  monthlyInvestment: 10000,
  annualRate: 12,
  tenureMonths: 60,
  stepUp: { type: 'percentage', value: 10 },  // or type: 'fixed', value: 1000
  timing: 'beginning',   // 'beginning' | 'end'
});
// stepUp.yearlyBreakdown — array with per-year invested, portfolio value, returns
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `monthlyInvestment` | `number` | Yes | Monthly SIP amount (must be > 0) |
| `annualRate` | `number` | Yes | Annual return rate in percent (≥ 0) |
| `tenureMonths` | `number` | Yes | Investment tenure in months (positive integer) |
| `stepUp` | `StepUpOptions` | No | Annual increment: `{ type: 'percentage' \| 'fixed', value: number }` |
| `timing` | `'beginning' \| 'end'` | No | Payment timing, default `'beginning'` |

**Returns:** `SIPResult` — `{ investedAmount, totalReturns, maturityAmount, yearlyBreakdown? }`

---

### `calculateLumpSum(options)`

Compound interest on a one-time investment.

**Formula:** FV = P × (1 + r/n)^(n×t)

```ts
import { calculateLumpSum } from '@krish_achra/finkit';

const result = calculateLumpSum({
  principal: 100000,
  annualRate: 10,
  tenureYears: 5,
  compoundingFrequency: 'annually',  // default; also: 'semi-annually', 'quarterly', 'monthly', 'daily'
});
// result.maturityAmount — ₹161,051
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `principal` | `number` | Yes | Initial investment (> 0) |
| `annualRate` | `number` | Yes | Annual rate in percent (≥ 0) |
| `tenureYears` | `number` | Yes | Investment period in years (> 0) |
| `compoundingFrequency` | `CompoundingFrequency` | No | Default `'annually'` |

**Returns:** `InvestmentSummary` — `{ investedAmount, totalReturns, maturityAmount }`

---

### `calculateCAGR(options)`

Compound Annual Growth Rate between two values.

**Formula:** CAGR = (endValue / beginValue)^(1/years) − 1

```ts
import { calculateCAGR } from '@krish_achra/finkit';

// Using explicit years
const cagr = calculateCAGR({
  beginningValue: 100000,
  endingValue: 185000,
  years: 5,
});
// cagr — 13.1109 (percent)

// Using date range (Actual/365 day-count)
const cagrByDate = calculateCAGR({
  beginningValue: 100000,
  endingValue: 185000,
  startDate: '2018-01-01',
  endDate: '2023-01-01',
});
```

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `beginningValue` | `number` | Yes | Initial value (> 0) |
| `endingValue` | `number` | Yes | Final value (≥ 0); if 0, returns −100 |
| `years` | `number` | Either `years` or date pair | Investment period (> 0) |
| `startDate` | `Date \| string` | Either date pair or `years` | ISO date string or Date object |
| `endDate` | `Date \| string` | Either date pair or `years` | Must be strictly after `startDate` |

**Returns:** `number` — CAGR in percent (e.g. 13.11 for 13.11%)

---

### `calculateAbsoluteReturn(options)`

Simple point-to-point return, unadjusted for time.

**Formula:** ((finalValue − initialValue) / initialValue) × 100

```ts
import { calculateAbsoluteReturn } from '@krish_achra/finkit';

const abs = calculateAbsoluteReturn({ initialValue: 100000, finalValue: 125000 });
// abs — 25.0 (percent)
```

**Returns:** `number` — absolute return in percent

---

### `calculateAnnualizedReturn(options)`

Compounded annualized return; equivalent to CAGR with flexible duration input.

```ts
import { calculateAnnualizedReturn } from '@krish_achra/finkit';

// By years
calculateAnnualizedReturn({ initialValue: 100000, finalValue: 150000, years: 3 });

// By days
calculateAnnualizedReturn({ initialValue: 100000, finalValue: 115000, days: 365 });

// By date range
calculateAnnualizedReturn({
  initialValue: 100000,
  finalValue: 150000,
  startDate: '2020-01-01',
  endDate: '2023-01-01',
});
```

**Returns:** `number` — annualized return in percent. Returns −100 when `finalValue` is 0; throws `ValidationError` for negative `finalValue`.

---

### `calculateXIRR(cashFlows, options?)`

Extended Internal Rate of Return for cash flows on arbitrary dates.

**Day-count convention:** Actual/365.  
**Solver:** Newton-Raphson (up to 50 iterations) with bisection fallback. Throws `ConvergenceError` if no real root is found.

> [!IMPORTANT]
> `amount` is **negative** for money invested (outflows) and **positive** for redemptions or returns (inflows). Cash flows on the same calendar day are aggregated before solving.

```ts
import { calculateXIRR, ConvergenceError } from '@krish_achra/finkit';

try {
  const rate = calculateXIRR([
    { date: '2020-01-01', amount: -500000 },
    { date: '2021-01-01', amount: -500000 },
    { date: '2023-06-30', amount:  1200000 },
  ]);
  console.log(rate); // annualized rate in percent
} catch (err) {
  if (err instanceof ConvergenceError) {
    console.error('No real IRR exists for this cash flow schedule');
  }
}

// With options
calculateXIRR(cashFlows, {
  guess: 0.15,          // initial rate guess (decimal, default 0.1)
  tolerance: 1e-7,      // convergence threshold (default 1e-7)
  maxIterations: 100,   // maximum iterations (default 100)
});
```

**Returns:** `number` — annualized rate in percent (e.g. 14.52 for 14.52%)  
**Throws:** `ValidationError` for invalid inputs; `ConvergenceError` if solver cannot converge

---

### `calculateEMI(options)`

Equated Monthly Installment using the reducing balance (diminishing balance) method, as standard in Indian banking.

**Formula:** EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)  
where r = monthly rate = annualRate / 12 / 100.

```ts
import { calculateEMI } from '@krish_achra/finkit';

const emi = calculateEMI({
  principal: 3000000,     // ₹30 lakh
  annualRate: 8.5,        // percent
  tenureMonths: 180,      // 15 years
});
// emi.emi            — monthly installment
// emi.totalInterest  — total interest paid
// emi.totalPayment   — total outflow
```

**Returns:** `EMIResult` — `{ emi, principal, totalInterest, totalPayment }`

---

### `generateAmortizationSchedule(options)`

Full month-by-month amortization table with optional prepayments.

Prepayments are applied as additional principal reduction in that month, reducing tenure and total interest paid. Multiple prepayments in the same month are summed.

```ts
import { generateAmortizationSchedule } from '@krish_achra/finkit';

const schedule = generateAmortizationSchedule({
  principal: 1000000,
  annualRate: 9,
  tenureMonths: 120,
  prepayments: [
    { month: 12, amount: 50000 },
    { month: 24, amount: 100000 },
  ],
});

console.log(schedule.actualTenureMonths);  // reduced tenure after prepayments
console.log(schedule.interestSaved);        // total interest saved
schedule.schedule.forEach(entry => {
  // entry: { month, openingBalance, emi, principalPaid, interestPaid, prepayment, closingBalance }
});
```

**Returns:** `AmortizationResult` — extends `EMIResult` with `{ originalTenureMonths, actualTenureMonths, tenureReducedMonths, interestSaved, schedule }`

---

### `calculateFD(options)`

Fixed Deposit maturity calculator conforming to Indian banking conventions.

**Compounding:** Quarterly by default for cumulative deposits (RBI standard).  
**Short-term:** Simple interest for deposits under 180 days (when specified via `tenureDays`).  
**Non-cumulative payouts:** Monthly, quarterly, half-yearly, or annually. Principal is returned intact at maturity; `effectiveYield` is annualized simple yield on total interest paid.  
**Senior citizen bonus:** Default +0.50% on `annualRate`, configurable via `seniorCitizenBonusRate`.

```ts
import { calculateFD } from '@krish_achra/finkit';

// Cumulative FD
const fd = calculateFD({
  principal: 100000,
  annualRate: 7,
  tenureMonths: 12,         // or tenureDays for short-term
  payout: 'cumulative',     // default
});
// fd.maturityAmount  — principal + compounded interest
// fd.interestEarned  — total interest
// fd.effectiveYield  — annualized simple yield

// Monthly payout FD (non-cumulative)
const monthlyFD = calculateFD({
  principal: 100000,
  annualRate: 7,
  tenureMonths: 24,
  payout: 'monthly',
  seniorCitizen: true,      // adds seniorCitizenBonusRate (default 0.5%)
});
// monthlyFD.periodicPayout — monthly interest payout amount
```

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `principal` | `number` | — | Deposit amount (> 0) |
| `annualRate` | `number` | — | Interest rate in percent (≥ 0) |
| `tenureMonths` | `number` | — | Tenure in months (mutually exclusive with `tenureDays`) |
| `tenureDays` | `number` | — | Tenure in days (mutually exclusive with `tenureMonths`) |
| `payout` | `FDPayout` | `'cumulative'` | `'cumulative' \| 'monthly' \| 'quarterly' \| 'half-yearly' \| 'annually'` |
| `seniorCitizen` | `boolean` | `false` | Apply senior citizen bonus rate |
| `seniorCitizenBonusRate` | `number` | `0.5` | Bonus rate in percent |
| `compoundingFrequency` | `CompoundingFrequency` | `'quarterly'` | Cumulative FD compounding frequency |

**Returns:** `FDResult` — `{ principal, interestEarned, maturityAmount, effectiveYield, periodicPayout? }`

---

### `calculateRD(options)`

Recurring Deposit maturity calculator using the Indian Banking / Post Office standard.

**Compounding:** Quarterly by default; monthly installments are compounded with quarterly periods — matching the standard formula used by Indian banks and the India Post.

```ts
import { calculateRD } from '@krish_achra/finkit';

const rd = calculateRD({
  monthlyDeposit: 5000,
  annualRate: 6.5,
  tenureMonths: 60,          // 5 years
  compoundingFrequency: 'quarterly',  // default
});
// rd.maturityAmount   — total corpus
// rd.investedAmount   — total deposited
// rd.totalReturns     — interest earned
// rd.effectiveYield   — annualized simple yield on amount invested
```

**Returns:** `RDResult` — extends `InvestmentSummary` with `effectiveYield`

---

### `calculateRealRate(options)`

Real rate of return using the exact Fisher equation.

**Formula (Fisher):** r_real = (1 + r_nominal) / (1 + r_inflation) − 1  
**Approximate:** r_real ≈ r_nominal − r_inflation

```ts
import { calculateRealRate } from '@krish_achra/finkit';

const result = calculateRealRate({
  nominalRate: 12,    // percent
  inflationRate: 6,   // percent
});
// result.realRate            — 5.6604 (Fisher equation)
// result.approximateRealRate — 6.0 (naive approximation)
```

**Returns:** `RealReturnsResult` — `{ nominalRate, inflationRate, realRate, approximateRealRate }`

---

### `calculateInflationAdjustedValue(options)`

Purchasing power erosion: what is a future nominal amount worth in today's money?

**Formula:** Real Value = Nominal Value / (1 + inflationRate)^years

```ts
import { calculateInflationAdjustedValue } from '@krish_achra/finkit';

const result = calculateInflationAdjustedValue({
  nominalFutureValue: 1000000,  // ₹10 lakh in 10 years
  inflationRate: 6,              // percent per year
  tenureYears: 10,
});
// result.realFutureValue          — present equivalent purchasing power
// result.purchasingPowerLossPercent
```

**Returns:** `InflationAdjustedFutureValueResult` — `{ nominalFutureValue, realFutureValue, purchasingPowerLossPercent }`

---

### `calculateTargetSIP(options)`

Monthly SIP required to meet an inflation-adjusted future corpus target.

Steps:
1. Inflates the target corpus from today's value to future nominal value.
2. Solves for the monthly SIP (annuity due) needed to reach that nominal target at the given expected return rate.

```ts
import { calculateTargetSIP } from '@krish_achra/finkit';

const goal = calculateTargetSIP({
  targetCorpusInTodayMoney: 10000000,  // ₹1 crore in today's purchasing power
  inflationRate: 6,                     // percent
  expectedReturnRate: 12,               // percent
  tenureYears: 20,
});
// goal.targetCorpusNominal  — inflation-adjusted corpus to target
// goal.requiredMonthlySIP   — monthly investment needed
// goal.totalInvested        — total SIP payments over tenure
// goal.wealthGained         — corpus minus invested
```

**Returns:** `TargetSIPForGoalResult` — `{ targetCorpusNominal, targetCorpusTodayMoney, requiredMonthlySIP, totalInvested, wealthGained }`

---

## Utility functions

The following are exported for use in custom calculations:

| Function | Description |
|---|---|
| `round(value, decimals)` | Rounds a number to the given decimal places without floating-point artifacts |
| `parseDate(dateInput)` | Accepts a `Date` or ISO date string; returns a clean `Date` |
| `daysBetween(start, end)` | Returns exact days between two dates (Actual/365) |
| `yearsBetween(start, end)` | Returns fractional years (Actual/365) |
| `getPeriodsPerYear(freq)` | Maps `CompoundingFrequency` to integer periods per year |

---

## Error handling

All functions throw typed errors extending `FinKitError`:

```ts
import { ValidationError, ConvergenceError, FinKitError } from '@krish_achra/finkit';

try {
  calculateSIP({ monthlyInvestment: -1000, annualRate: 12, tenureMonths: 60 });
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.message);       // human-readable description
    console.log(err.field);         // 'monthlyInvestment'
    console.log(err.receivedValue); // -1000
  }
}

try {
  calculateXIRR(allNegativeCashFlows);
} catch (err) {
  if (err instanceof ConvergenceError) {
    console.log(err.iterations);  // iterations attempted
    console.log(err.tolerance);   // tolerance used
  }
}
```

**`ValidationError`** — thrown for bad inputs (negative values, non-integer tenure, missing required fields, unsupported enum values, invalid dates, cash flows without both inflows and outflows).

**`ConvergenceError`** — thrown by `calculateXIRR` when the hybrid solver cannot find a real root. This typically means the cash flow schedule has no meaningful internal rate of return (e.g. all cash flows on the same day, or no sign change in NPV across any realistic rate range).

---

## TypeScript

All types and interfaces are exported as named type exports:

```ts
import type {
  SIPOptions, SIPResult, SIPYearlyBreakdown,
  LumpSumOptions,
  CAGROptions,
  AbsoluteReturnsOptions,
  AnnualizedReturnsOptions,
  CashFlow, XIRROptions,
  EMIOptions, EMIResult,
  Prepayment, AmortizationScheduleOptions, AmortizationScheduleEntry, AmortizationResult,
  FDOptions, FDResult, FDPayout,
  RDOptions, RDResult,
  RealReturnsOptions, RealReturnsResult,
  InflationAdjustedFutureValueOptions, InflationAdjustedFutureValueResult,
  TargetSIPForGoalOptions, TargetSIPForGoalResult,
  CompoundingFrequency, InvestmentSummary, StepUpOptions,
} from '@krish_achra/finkit';
```

The package ships dual declarations: `.d.ts` for ESM consumers and `.d.cts` for CommonJS consumers.

---

## CommonJS

```js
const { calculateSIP, calculateEMI } = require('@krish_achra/finkit');
```

---

## Assumptions and conventions

| Area | Convention |
|---|---|
| **SIP payment timing** | Annuity due (beginning-of-month) by default; annuity immediate available via `timing: 'end'` |
| **SIP step-up** | Annual increment applied from month 13, 25, 37, … |
| **FD compounding** | Quarterly for cumulative deposits (RBI standard); simple interest for deposits < 180 days specified via `tenureDays` |
| **FD monthly payout** | Discounted effective monthly rate: (1 + r/400)^(1/3) − 1, per Indian banking convention |
| **FD effective yield** | Annualized simple yield on interest paid over total invested amount and tenure; not effective annual rate (EAR) |
| **RD compounding** | Quarterly (Indian Banking and India Post standard); each installment accumulates as P × (1 + r/400)^(remaining quarters) |
| **RD effective yield** | Annualized simple yield on total invested (not EAR) |
| **XIRR day-count** | Actual/365; dates are sorted chronologically and same-day cash flows are aggregated |
| **CAGR / annualized return** | Uses Actual/365 when computing years from a date range |
| **EMI** | Reducing balance (diminishing balance) method; standard in Indian banking |
| **Senior citizen bonus** | Default +0.50% on base rate; customizable via `seniorCitizenBonusRate` |
| **Real rate** | Exact Fisher equation; approximate (n − i) also returned for comparison |

---

## Limitations

- **No TDS calculations.** Tax Deducted at Source on FD/RD interest is outside scope.
- **No tax-adjusted returns.** LTCG, STCG, and income tax on returns are not computed.
- **No NAV-based SIP simulation.** This package operates on rate-of-return, not live market prices.
- **No inflation indexation for debt funds.** Cost inflation index calculations are not included.
- **XIRR requires both inflows and outflows.** Validation rejects cash flow schedules that do not contain at least one negative and one positive amount after same-day aggregation.
- **XIRR convergence is not guaranteed** for pathological inputs (e.g. very large amounts on very short intervals, or schedules with multiple positive roots). A `ConvergenceError` is thrown instead of silently returning a misleading rate.
- **Floating-point arithmetic.** Results are rounded to 2 decimal places for monetary amounts and 4 decimal places for rates. Underlying calculations use JavaScript's IEEE 754 double precision. For regulatory or tax filings, verify independently.

---

## License

MIT © Krish Achra
