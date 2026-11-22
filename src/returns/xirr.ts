import { ConvergenceError } from '../core/errors.js';
import { round } from '../core/math.js';
import { validateCashFlows } from '../core/validation.js';
import { CashFlow, XIRROptions } from '../types/index.js';

interface PreparedFlow {
  timeYears: number; // (date_i - date_0) / 365
  amount: number;
}

/**
 * Evaluates the Net Present Value (NPV) function at annual rate r.
 * f(r) = sum( C_i / (1 + r)^t_i )
 */
function npv(flows: PreparedFlow[], r: number): number {
  if (r <= -1) return Infinity;
  let total = 0;
  for (let i = 0; i < flows.length; i++) {
    const { timeYears, amount } = flows[i];
    total += amount * Math.pow(1 + r, -timeYears);
  }
  return total;
}

/**
 * Evaluates the derivative of the NPV function with respect to rate r.
 * f'(r) = sum( -t_i * C_i / (1 + r)^(t_i + 1) )
 */
function npvDerivative(flows: PreparedFlow[], r: number): number {
  if (r <= -1) return -Infinity;
  let total = 0;
  for (let i = 0; i < flows.length; i++) {
    const { timeYears, amount } = flows[i];
    if (timeYears === 0) continue;
    total += -timeYears * amount * Math.pow(1 + r, -timeYears - 1);
  }
  return total;
}

/**
 * Searches for a sign-change bracket [a, b] where f(a) * f(b) <= 0.
 */
function findBracket(flows: PreparedFlow[]): [number, number] | null {
  const testPoints = [
    -0.9999, -0.95, -0.9, -0.8, -0.6, -0.4, -0.2, -0.1, -0.05,
    0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5,
    2.0, 3.0, 5.0, 10.0, 20.0, 50.0, 100.0
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

/**
 * Solves for XIRR within a bracket [a, b] using bisection with guaranteed convergence.
 */
function bisection(flows: PreparedFlow[], a: number, b: number, tolerance: number, maxIterations: number): number {
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

/**
 * Calculates Extended Internal Rate of Return (XIRR) for irregular cash flows with dates.
 * Employs a robust hybrid numerical solver combining bounded Newton-Raphson with guaranteed bisection fallback.
 *
 * @param cashFlows Array of { date, amount } cash flows
 * @param options Optional configuration: { guess, tolerance, maxIterations }
 * @returns Annualized rate of return in percent (e.g. 14.52 for 14.52%)
 */
export function calculateXIRR(cashFlows: CashFlow[], options?: XIRROptions): number {
  const validated = validateCashFlows(cashFlows);

  const guess = options?.guess ?? 0.1; // default 10%
  const tolerance = options?.tolerance ?? 1e-7;
  const maxIterations = options?.maxIterations ?? 100;

  const baseDate = validated[0].date.getTime();
  const flows: PreparedFlow[] = validated.map((cf) => ({
    timeYears: (cf.date.getTime() - baseDate) / (1000 * 60 * 60 * 24 * 365),
    amount: cf.amount,
  }));

  // Try Newton-Raphson first
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
      break; // Derivative flat or invalid, fallback to bracket bisection
    }

    let delta = fVal / fPrime;
    // Step damping to prevent violent overshoot
    if (Math.abs(delta) > 0.5) {
      delta = 0.5 * Math.sign(delta);
    }

    const nextR = r - delta;

    // Guard against crossing boundary -100%
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

  // Fallback to Bracket & Bisection
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
