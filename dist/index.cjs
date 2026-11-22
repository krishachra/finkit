'use strict';

// src/core/errors.ts
var FinKitError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "FinKitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var ValidationError = class extends FinKitError {
  field;
  receivedValue;
  constructor(message, field, receivedValue) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.receivedValue = receivedValue;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var ConvergenceError = class extends FinKitError {
  iterations;
  tolerance;
  constructor(message, iterations, tolerance) {
    super(message);
    this.name = "ConvergenceError";
    this.iterations = iterations;
    this.tolerance = tolerance;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};

// src/core/math.ts
function round(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (decimals === 0) {
    return Math.round(value);
  }
  const sign = value < 0 ? -1 : 1;
  const absVal = Math.abs(value);
  const rounded = Number(Math.round(Number(`${absVal}e${decimals}`)) + `e-${decimals}`);
  const result = sign * rounded;
  return Object.is(result, -0) ? 0 : result;
}
function getPeriodsPerYear(frequency = "annually") {
  switch (frequency) {
    case "annually":
      return 1;
    case "semi-annually":
      return 2;
    case "quarterly":
      return 4;
    case "monthly":
      return 12;
    case "daily":
      return 365;
    default:
      throw new ValidationError(`Unsupported compounding frequency: ${frequency}`);
  }
}
function parseDate(dateInput) {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new ValidationError(`Invalid Date object passed: ${dateInput}`);
    }
    return new Date(dateInput.getTime());
  }
  if (typeof dateInput === "string") {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      throw new ValidationError(`Invalid date string passed: "${dateInput}"`);
    }
    return parsed;
  }
  throw new ValidationError(`Date must be a Date object or valid date string, received: ${typeof dateInput}`);
}
function daysBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return diffTime / (1e3 * 60 * 60 * 24);
}
function yearsBetween(startDate, endDate) {
  const days = daysBetween(startDate, endDate);
  return days / 365;
}

// src/core/validation.ts
function validateNumber(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${name} must be a valid finite number, received: ${value}`, name, value);
  }
  return value;
}
function validatePositive(name, value, allowZero = false) {
  const num = validateNumber(name, value);
  if (allowZero ? num < 0 : num <= 0) {
    throw new ValidationError(
      `${name} must be ${allowZero ? "greater than or equal to 0" : "strictly positive"}, received: ${num}`,
      name,
      num
    );
  }
  return num;
}
function validateInteger(name, value, allowZero = false) {
  const num = validatePositive(name, value, allowZero);
  if (!Number.isInteger(num)) {
    throw new ValidationError(`${name} must be an integer, received: ${num}`, name, num);
  }
  return num;
}
function validateRate(name, rate, allowNegative = false) {
  const num = validateNumber(name, rate);
  if (!allowNegative && num < 0) {
    throw new ValidationError(`${name} cannot be negative, received: ${num}`, name, num);
  }
  return num;
}
function validateDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (end.getTime() <= start.getTime()) {
    throw new ValidationError(
      `End date (${end.toISOString().split("T")[0]}) must be strictly after start date (${start.toISOString().split("T")[0]})`
    );
  }
  return { start, end };
}
function validateCashFlows(cashFlows) {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
    throw new ValidationError("Cash flows must be an array with at least 2 entries.");
  }
  let hasInflow = false;
  let hasOutflow = false;
  const parsed = cashFlows.map((cf, index) => {
    if (!cf || typeof cf !== "object") {
      throw new ValidationError(`Cash flow at index ${index} must be an object.`);
    }
    const item = cf;
    const amount = validateNumber(`Cash flow amount at index ${index}`, item.amount);
    if (amount === 0) {
      throw new ValidationError(`Cash flow amount at index ${index} cannot be zero.`);
    }
    const date = parseDate(item.date);
    if (amount > 0) hasInflow = true;
    if (amount < 0) hasOutflow = true;
    return { date, amount };
  });
  if (!hasInflow || !hasOutflow) {
    throw new ValidationError(
      "Cash flows must contain at least one negative cash flow (investment/outflow) and at least one positive cash flow (return/inflow)."
    );
  }
  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
  const aggregated = [];
  for (const cf of parsed) {
    const last = aggregated[aggregated.length - 1];
    if (last && last.date.getTime() === cf.date.getTime()) {
      last.amount += cf.amount;
    } else {
      aggregated.push({ date: cf.date, amount: cf.amount });
    }
  }
  const validRemaining = aggregated.filter((cf) => cf.amount !== 0);
  if (validRemaining.length < 2) {
    throw new ValidationError("Cash flows after same-day aggregation must contain at least 2 valid non-zero dates.");
  }
  const finalInflow = validRemaining.some((c) => c.amount > 0);
  const finalOutflow = validRemaining.some((c) => c.amount < 0);
  if (!finalInflow || !finalOutflow) {
    throw new ValidationError(
      "Cash flows after same-day aggregation must still contain both positive and negative cash flows."
    );
  }
  return validRemaining;
}

// src/investments/sip.ts
function calculateSIP(options) {
  const {
    monthlyInvestment: initialMonthly,
    annualRate,
    tenureMonths,
    stepUp,
    timing = "beginning"
  } = options;
  validatePositive("monthlyInvestment", initialMonthly);
  validateRate("annualRate", annualRate, false);
  validateInteger("tenureMonths", tenureMonths);
  if (stepUp) {
    if (stepUp.type !== "percentage" && stepUp.type !== "fixed") {
      throw new ValidationError(`Invalid stepUp type: ${stepUp.type}. Must be 'percentage' or 'fixed'.`);
    }
    validatePositive("stepUp.value", stepUp.value, true);
  }
  const monthlyRate = annualRate / 12 / 100;
  if (annualRate === 0 && !stepUp) {
    const investedAmount2 = round(initialMonthly * tenureMonths, 2);
    return {
      investedAmount: investedAmount2,
      totalReturns: 0,
      maturityAmount: investedAmount2
    };
  }
  if (!stepUp) {
    let maturity;
    if (annualRate === 0) {
      maturity = initialMonthly * tenureMonths;
    } else {
      const growthFactor = Math.pow(1 + monthlyRate, tenureMonths);
      const base = initialMonthly * ((growthFactor - 1) / monthlyRate);
      maturity = timing === "beginning" ? base * (1 + monthlyRate) : base;
    }
    const investedAmount2 = round(initialMonthly * tenureMonths, 2);
    const maturityAmount2 = round(maturity, 2);
    const totalReturns2 = round(maturityAmount2 - investedAmount2, 2);
    return {
      investedAmount: investedAmount2,
      totalReturns: totalReturns2,
      maturityAmount: maturityAmount2
    };
  }
  let totalInvested = 0;
  let portfolioValue = 0;
  let currentMonthly = initialMonthly;
  const yearlyBreakdown = [];
  let currentYearInvested = 0;
  for (let month = 1; month <= tenureMonths; month++) {
    if (month > 1 && (month - 1) % 12 === 0) {
      if (stepUp.type === "percentage") {
        currentMonthly = currentMonthly * (1 + stepUp.value / 100);
      } else {
        currentMonthly = currentMonthly + stepUp.value;
      }
    }
    totalInvested += currentMonthly;
    currentYearInvested += currentMonthly;
    if (timing === "beginning") {
      portfolioValue = (portfolioValue + currentMonthly) * (1 + monthlyRate);
    } else {
      portfolioValue = portfolioValue * (1 + monthlyRate) + currentMonthly;
    }
    if (month % 12 === 0 || month === tenureMonths) {
      const yearIndex = Math.ceil(month / 12);
      yearlyBreakdown.push({
        year: yearIndex,
        monthlyInvestment: round(currentMonthly, 2),
        yearlyInvested: round(currentYearInvested, 2),
        cumulativeInvested: round(totalInvested, 2),
        yearEndValue: round(portfolioValue, 2),
        returnsEarned: round(portfolioValue - totalInvested, 2)
      });
      currentYearInvested = 0;
    }
  }
  const investedAmount = round(totalInvested, 2);
  const maturityAmount = round(portfolioValue, 2);
  const totalReturns = round(maturityAmount - investedAmount, 2);
  return {
    investedAmount,
    totalReturns,
    maturityAmount,
    yearlyBreakdown
  };
}

// src/investments/lumpsum.ts
function calculateLumpSum(options) {
  const {
    principal,
    annualRate,
    tenureYears,
    compoundingFrequency = "annually"
  } = options;
  validatePositive("principal", principal);
  validateRate("annualRate", annualRate, false);
  validatePositive("tenureYears", tenureYears, false);
  if (annualRate === 0) {
    const investedAmount2 = round(principal, 2);
    return {
      investedAmount: investedAmount2,
      totalReturns: 0,
      maturityAmount: investedAmount2
    };
  }
  const periodsPerYear = getPeriodsPerYear(compoundingFrequency);
  const periodicRate = annualRate / 100 / periodsPerYear;
  const totalPeriods = periodsPerYear * tenureYears;
  const maturity = principal * Math.pow(1 + periodicRate, totalPeriods);
  const investedAmount = round(principal, 2);
  const maturityAmount = round(maturity, 2);
  const totalReturns = round(maturityAmount - investedAmount, 2);
  return {
    investedAmount,
    totalReturns,
    maturityAmount
  };
}

// src/returns/cagr.ts
function calculateCAGR(options) {
  const { beginningValue, endingValue, years: explicitYears, startDate, endDate } = options;
  validatePositive("beginningValue", beginningValue, false);
  validateNumber("endingValue", endingValue);
  if (endingValue < 0) {
    throw new ValidationError("endingValue cannot be negative for CAGR calculation", "endingValue", endingValue);
  }
  let years;
  if (explicitYears !== void 0) {
    years = validatePositive("years", explicitYears, false);
  } else if (startDate !== void 0 && endDate !== void 0) {
    const { start, end } = validateDateRange(startDate, endDate);
    years = yearsBetween(start, end);
    if (years <= 0) {
      throw new ValidationError("Time elapsed between start and end date must be greater than zero");
    }
  } else {
    throw new ValidationError('Either "years" or both "startDate" and "endDate" must be provided');
  }
  if (endingValue === 0) {
    return -100;
  }
  const cagr = Math.pow(endingValue / beginningValue, 1 / years) - 1;
  return round(cagr * 100, 4);
}

// src/returns/absolute.ts
function calculateAbsoluteReturn(options) {
  const { initialValue, finalValue } = options;
  validatePositive("initialValue", initialValue, false);
  validateNumber("finalValue", finalValue);
  const absReturn = (finalValue - initialValue) / initialValue * 100;
  return round(absReturn, 4);
}
function calculateAnnualizedReturn(options) {
  const { initialValue, finalValue, years: explicitYears, days: explicitDays, startDate, endDate } = options;
  validatePositive("initialValue", initialValue, false);
  validateNumber("finalValue", finalValue);
  let years;
  if (explicitYears !== void 0) {
    years = validatePositive("years", explicitYears, false);
  } else if (explicitDays !== void 0) {
    validatePositive("days", explicitDays, false);
    years = explicitDays / 365;
  } else if (startDate !== void 0 && endDate !== void 0) {
    const { start, end } = validateDateRange(startDate, endDate);
    years = yearsBetween(start, end);
  } else {
    throw new ValidationError('Either "years", "days", or both "startDate" and "endDate" must be provided');
  }
  if (finalValue <= 0) {
    if (finalValue === 0) return -100;
    throw new ValidationError("finalValue cannot be negative for compounded annualized return", "finalValue", finalValue);
  }
  const annualized = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  return round(annualized, 4);
}

// src/returns/xirr.ts
function npv(flows, r) {
  if (r <= -1) return Infinity;
  let total = 0;
  for (let i = 0; i < flows.length; i++) {
    const { timeYears, amount } = flows[i];
    total += amount * Math.pow(1 + r, -timeYears);
  }
  return total;
}
function npvDerivative(flows, r) {
  if (r <= -1) return -Infinity;
  let total = 0;
  for (let i = 0; i < flows.length; i++) {
    const { timeYears, amount } = flows[i];
    if (timeYears === 0) continue;
    total += -timeYears * amount * Math.pow(1 + r, -timeYears - 1);
  }
  return total;
}
function findBracket(flows) {
  const testPoints = [
    -0.9999,
    -0.95,
    -0.9,
    -0.8,
    -0.6,
    -0.4,
    -0.2,
    -0.1,
    -0.05,
    0,
    0.02,
    0.05,
    0.1,
    0.15,
    0.2,
    0.3,
    0.5,
    0.8,
    1,
    1.5,
    2,
    3,
    5,
    10,
    20,
    50,
    100
  ];
  let prevR = testPoints[0];
  let prevVal = npv(flows, prevR);
  for (let i = 1; i < testPoints.length; i++) {
    const currR = testPoints[i];
    const currVal = npv(flows, currR);
    if (Math.abs(currVal) < 1e-9) {
      return [currR, currR];
    }
    if (prevVal * currVal <= 0) {
      return [prevR, currR];
    }
    prevR = currR;
    prevVal = currVal;
  }
  return null;
}
function bisection(flows, a, b, tolerance, maxIterations) {
  let low = Math.min(a, b);
  let high = Math.max(a, b);
  let fLow = npv(flows, low);
  let fHigh = npv(flows, high);
  if (Math.abs(fLow) <= tolerance) return low;
  if (Math.abs(fHigh) <= tolerance) return high;
  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = low + (high - low) / 2;
    const fMid = npv(flows, mid);
    if (Math.abs(fMid) <= tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return low + (high - low) / 2;
}
function calculateXIRR(cashFlows, options) {
  const validated = validateCashFlows(cashFlows);
  const guess = options?.guess ?? 0.1;
  const tolerance = options?.tolerance ?? 1e-7;
  const maxIterations = options?.maxIterations ?? 100;
  const baseDate = validated[0].date.getTime();
  const flows = validated.map((cf) => ({
    timeYears: (cf.date.getTime() - baseDate) / (1e3 * 60 * 60 * 24 * 365),
    amount: cf.amount
  }));
  let r = Math.max(guess, -0.99);
  let converged = false;
  for (let iter = 0; iter < Math.min(maxIterations, 50); iter++) {
    const fVal = npv(flows, r);
    if (Math.abs(fVal) < tolerance) {
      converged = true;
      break;
    }
    const fPrime = npvDerivative(flows, r);
    if (!Number.isFinite(fPrime) || Math.abs(fPrime) < 1e-12) {
      break;
    }
    let delta = fVal / fPrime;
    if (Math.abs(delta) > 0.5) {
      delta = 0.5 * Math.sign(delta);
    }
    const nextR = r - delta;
    if (nextR <= -0.9999) {
      r = (r - 0.9999) / 2;
    } else {
      r = nextR;
    }
    if (Math.abs(delta) < tolerance && Math.abs(fVal) < tolerance) {
      converged = true;
      break;
    }
  }
  if (converged && Number.isFinite(r) && r > -1) {
    return round(r * 100, 4);
  }
  const bracket = findBracket(flows);
  if (bracket) {
    const solvedRate = bisection(flows, bracket[0], bracket[1], tolerance, maxIterations);
    return round(solvedRate * 100, 4);
  }
  throw new ConvergenceError(
    `Failed to converge on a valid XIRR after ${maxIterations} iterations. No real internal rate of return exists for this cash flow schedule.`,
    maxIterations,
    tolerance
  );
}

// src/loans/emi.ts
function calculateEMI(options) {
  const { principal, annualRate, tenureMonths } = options;
  validatePositive("principal", principal, false);
  validateRate("annualRate", annualRate, false);
  validateInteger("tenureMonths", tenureMonths, false);
  if (annualRate === 0) {
    const emi2 = round(principal / tenureMonths, 2);
    const totalPayment2 = round(principal, 2);
    return {
      emi: emi2,
      principal: round(principal, 2),
      totalInterest: 0,
      totalPayment: totalPayment2
    };
  }
  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = round(principal * monthlyRate * factor / (factor - 1), 2);
  const totalPayment = round(emi * tenureMonths, 2);
  const totalInterest = round(totalPayment - principal, 2);
  return {
    emi,
    principal: round(principal, 2),
    totalInterest,
    totalPayment
  };
}

// src/loans/amortization.ts
function generateAmortizationSchedule(options) {
  const { principal, annualRate, tenureMonths, prepayments = [] } = options;
  validatePositive("principal", principal, false);
  validateRate("annualRate", annualRate, false);
  validateInteger("tenureMonths", tenureMonths, false);
  const prepaymentMap = /* @__PURE__ */ new Map();
  for (const prep of prepayments) {
    validateInteger("prepayment month", prep.month, false);
    validatePositive("prepayment amount", prep.amount, false);
    if (prep.month > tenureMonths) {
      throw new ValidationError(`Prepayment month ${prep.month} exceeds loan tenure of ${tenureMonths} months`);
    }
    const existing = prepaymentMap.get(prep.month) ?? 0;
    prepaymentMap.set(prep.month, existing + prep.amount);
  }
  const baseline = calculateEMI({ principal, annualRate, tenureMonths });
  const scheduledEMI = baseline.emi;
  const monthlyRate = annualRate / 12 / 100;
  let currentBalance = principal;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  const schedule = [];
  for (let month = 1; month <= tenureMonths; month++) {
    if (currentBalance <= 0) break;
    const openingBalance = round(currentBalance, 2);
    const interest = annualRate === 0 ? 0 : round(openingBalance * monthlyRate, 2);
    let principalPortion = round(scheduledEMI - interest, 2);
    const prepayment = prepaymentMap.get(month) ?? 0;
    let totalPrincipalThisMonth = principalPortion + prepayment;
    let emiPaidThisMonth = scheduledEMI;
    if (openingBalance + interest <= scheduledEMI + prepayment) {
      principalPortion = openingBalance;
      totalPrincipalThisMonth = openingBalance;
      emiPaidThisMonth = round(openingBalance + interest, 2);
    } else if (openingBalance < totalPrincipalThisMonth) {
      totalPrincipalThisMonth = openingBalance;
    }
    const closingBalance = round(Math.max(0, openingBalance - totalPrincipalThisMonth), 2);
    totalInterestPaid += interest;
    totalPrincipalPaid += totalPrincipalThisMonth;
    currentBalance = closingBalance;
    schedule.push({
      month,
      openingBalance,
      emi: emiPaidThisMonth,
      principalPaid: totalPrincipalThisMonth,
      interestPaid: interest,
      prepayment,
      closingBalance
    });
    if (closingBalance <= 0) break;
  }
  const finalTotalInterest = round(totalInterestPaid, 2);
  const finalTotalPrincipal = round(totalPrincipalPaid, 2);
  const finalTotalPayment = round(finalTotalPrincipal + finalTotalInterest, 2);
  const actualTenureMonths = schedule.length;
  const tenureReducedMonths = tenureMonths - actualTenureMonths;
  const interestSaved = round(Math.max(0, baseline.totalInterest - finalTotalInterest), 2);
  return {
    emi: scheduledEMI,
    principal: round(principal, 2),
    totalInterest: finalTotalInterest,
    totalPayment: finalTotalPayment,
    originalTenureMonths: tenureMonths,
    actualTenureMonths,
    tenureReducedMonths,
    interestSaved,
    schedule
  };
}

// src/deposits/fd.ts
function calculateFD(options) {
  const {
    principal,
    annualRate: baseRate,
    tenureMonths,
    tenureDays,
    payout = "cumulative",
    seniorCitizen = false,
    seniorCitizenBonusRate = 0.5,
    compoundingFrequency = "quarterly"
  } = options;
  validatePositive("principal", principal, false);
  validateRate("annualRate", baseRate, false);
  if (tenureMonths === void 0 && tenureDays === void 0) {
    throw new ValidationError('Either "tenureMonths" or "tenureDays" must be specified for FD calculation');
  }
  let totalYears;
  let totalDays;
  if (tenureDays !== void 0) {
    validateInteger("tenureDays", tenureDays, false);
    totalDays = tenureDays;
    totalYears = tenureDays / 365;
  } else {
    validateInteger("tenureMonths", tenureMonths, false);
    totalDays = tenureMonths * 365 / 12;
    totalYears = tenureMonths / 12;
  }
  const effectiveRate = seniorCitizen ? baseRate + seniorCitizenBonusRate : baseRate;
  if (effectiveRate === 0) {
    return {
      principal: round(principal, 2),
      interestEarned: 0,
      maturityAmount: round(principal, 2),
      effectiveYield: 0
    };
  }
  if (payout !== "cumulative") {
    let periodicPayout;
    let periodsPerYear;
    switch (payout) {
      case "monthly":
        periodsPerYear = 12;
        periodicPayout = round(principal * (Math.pow(1 + effectiveRate / 400, 1 / 3) - 1), 2);
        break;
      case "quarterly":
        periodsPerYear = 4;
        periodicPayout = round(principal * (effectiveRate / 100) / 4, 2);
        break;
      case "half-yearly":
        periodsPerYear = 2;
        periodicPayout = round(principal * (effectiveRate / 100) / 2, 2);
        break;
      case "annually":
        periodsPerYear = 1;
        periodicPayout = round(principal * (effectiveRate / 100), 2);
        break;
      default:
        throw new ValidationError(`Unsupported FD payout type: ${payout}`);
    }
    const totalPayoutsCount = periodsPerYear * totalYears;
    const totalInterestEarned = round(periodicPayout * totalPayoutsCount, 2);
    const effectiveYield2 = round(totalInterestEarned / principal / totalYears * 100, 4);
    return {
      principal: round(principal, 2),
      interestEarned: totalInterestEarned,
      maturityAmount: round(principal, 2),
      // Principal returned at maturity
      effectiveYield: effectiveYield2,
      periodicPayout
    };
  }
  let maturity;
  if (totalDays < 180 && tenureDays !== void 0) {
    const simpleInterest = principal * (effectiveRate / 100) * (totalDays / 365);
    maturity = principal + simpleInterest;
  } else {
    const freq = getPeriodsPerYear(compoundingFrequency);
    const periodicRate = effectiveRate / 100 / freq;
    const totalPeriods = freq * totalYears;
    maturity = principal * Math.pow(1 + periodicRate, totalPeriods);
  }
  const maturityAmount = round(maturity, 2);
  const interestEarned = round(maturityAmount - principal, 2);
  const effectiveYield = round((maturityAmount - principal) / principal / totalYears * 100, 4);
  return {
    principal: round(principal, 2),
    interestEarned,
    maturityAmount,
    effectiveYield
  };
}

// src/deposits/rd.ts
function calculateRD(options) {
  const {
    monthlyDeposit,
    annualRate: baseRate,
    tenureMonths,
    compoundingFrequency = "quarterly",
    seniorCitizen = false,
    seniorCitizenBonusRate = 0.5
  } = options;
  validatePositive("monthlyDeposit", monthlyDeposit, false);
  validateRate("annualRate", baseRate, false);
  validateInteger("tenureMonths", tenureMonths, false);
  const effectiveRate = seniorCitizen ? baseRate + seniorCitizenBonusRate : baseRate;
  const totalInvested = round(monthlyDeposit * tenureMonths, 2);
  if (effectiveRate === 0) {
    return {
      investedAmount: totalInvested,
      totalReturns: 0,
      maturityAmount: totalInvested,
      effectiveYield: 0
    };
  }
  const tenureYears = tenureMonths / 12;
  let maturity = 0;
  if (compoundingFrequency === "quarterly") {
    const quarterlyRate = effectiveRate / 400;
    for (let m = 1; m <= tenureMonths; m++) {
      const remainingMonths = tenureMonths - m + 1;
      const quartersRemaining = remainingMonths / 3;
      maturity += monthlyDeposit * Math.pow(1 + quarterlyRate, quartersRemaining);
    }
  } else {
    const freq = getPeriodsPerYear(compoundingFrequency);
    const periodicRate = effectiveRate / 100 / freq;
    for (let m = 1; m <= tenureMonths; m++) {
      const remainingYears = (tenureMonths - m + 1) / 12;
      const periodsRemaining = remainingYears * freq;
      maturity += monthlyDeposit * Math.pow(1 + periodicRate, periodsRemaining);
    }
  }
  const maturityAmount = round(maturity, 2);
  const totalReturns = round(maturityAmount - totalInvested, 2);
  const effectiveYield = round(totalReturns / totalInvested / tenureYears * 100, 4);
  return {
    investedAmount: totalInvested,
    totalReturns,
    maturityAmount,
    effectiveYield
  };
}

// src/inflation/real-returns.ts
function calculateRealRate(options) {
  const { nominalRate, inflationRate } = options;
  validateRate("nominalRate", nominalRate, true);
  validateRate("inflationRate", inflationRate, true);
  if (inflationRate <= -100) {
    throw new ValidationError("Inflation rate cannot be less than or equal to -100%");
  }
  const nominalDec = nominalRate / 100;
  const inflationDec = inflationRate / 100;
  const exactRealDec = (1 + nominalDec) / (1 + inflationDec) - 1;
  const exactRealRate = round(exactRealDec * 100, 4);
  const approximateRealRate = round(nominalRate - inflationRate, 4);
  return {
    nominalRate: round(nominalRate, 4),
    inflationRate: round(inflationRate, 4),
    realRate: exactRealRate,
    approximateRealRate
  };
}

// src/inflation/purchasing-power.ts
function calculateInflationAdjustedValue(options) {
  const { nominalFutureValue, inflationRate, tenureYears } = options;
  validatePositive("nominalFutureValue", nominalFutureValue, true);
  validateRate("inflationRate", inflationRate, true);
  validatePositive("tenureYears", tenureYears, true);
  if (inflationRate <= -100) {
    throw new ValidationError("Inflation rate cannot be less than or equal to -100%");
  }
  const inflationFactor = Math.pow(1 + inflationRate / 100, tenureYears);
  const realFutureValue = round(nominalFutureValue / inflationFactor, 2);
  const purchasingPowerLossPercent = nominalFutureValue === 0 ? 0 : round((nominalFutureValue - realFutureValue) / nominalFutureValue * 100, 2);
  return {
    nominalFutureValue: round(nominalFutureValue, 2),
    realFutureValue,
    purchasingPowerLossPercent
  };
}

// src/inflation/goal.ts
function calculateTargetSIP(options) {
  const { targetCorpusInTodayMoney, inflationRate, expectedReturnRate, tenureYears } = options;
  validatePositive("targetCorpusInTodayMoney", targetCorpusInTodayMoney, false);
  validateRate("inflationRate", inflationRate, false);
  validateRate("expectedReturnRate", expectedReturnRate, false);
  validatePositive("tenureYears", tenureYears, false);
  const inflationFactor = Math.pow(1 + inflationRate / 100, tenureYears);
  const targetCorpusNominal = round(targetCorpusInTodayMoney * inflationFactor, 2);
  const totalMonths = Math.round(tenureYears * 12);
  const monthlyRate = expectedReturnRate / 12 / 100;
  let requiredMonthlySIP;
  if (monthlyRate === 0) {
    requiredMonthlySIP = round(targetCorpusNominal / totalMonths, 2);
  } else {
    const growth = Math.pow(1 + monthlyRate, totalMonths);
    const annuityFactor = (growth - 1) / monthlyRate * (1 + monthlyRate);
    requiredMonthlySIP = round(targetCorpusNominal / annuityFactor, 2);
  }
  const totalInvested = round(requiredMonthlySIP * totalMonths, 2);
  const wealthGained = round(targetCorpusNominal - totalInvested, 2);
  return {
    targetCorpusNominal,
    targetCorpusTodayMoney: round(targetCorpusInTodayMoney, 2),
    requiredMonthlySIP,
    totalInvested,
    wealthGained
  };
}

exports.ConvergenceError = ConvergenceError;
exports.FinKitError = FinKitError;
exports.ValidationError = ValidationError;
exports.calculateAbsoluteReturn = calculateAbsoluteReturn;
exports.calculateAnnualizedReturn = calculateAnnualizedReturn;
exports.calculateCAGR = calculateCAGR;
exports.calculateEMI = calculateEMI;
exports.calculateFD = calculateFD;
exports.calculateInflationAdjustedValue = calculateInflationAdjustedValue;
exports.calculateLumpSum = calculateLumpSum;
exports.calculateRD = calculateRD;
exports.calculateRealRate = calculateRealRate;
exports.calculateSIP = calculateSIP;
exports.calculateTargetSIP = calculateTargetSIP;
exports.calculateXIRR = calculateXIRR;
exports.daysBetween = daysBetween;
exports.generateAmortizationSchedule = generateAmortizationSchedule;
exports.getPeriodsPerYear = getPeriodsPerYear;
exports.parseDate = parseDate;
exports.round = round;
exports.validateCashFlows = validateCashFlows;
exports.validateDateRange = validateDateRange;
exports.validateInteger = validateInteger;
exports.validateNumber = validateNumber;
exports.validatePositive = validatePositive;
exports.validateRate = validateRate;
exports.yearsBetween = yearsBetween;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map