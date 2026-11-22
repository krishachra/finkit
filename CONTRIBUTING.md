# Contributing to FinKit

Thank you for your interest in improving FinKit. This document explains how to set up the project, run tests, and open a pull request.

## Development setup

Requires Node.js 18 or later.

```sh
git clone https://github.com/krish-achra/finkit.git
cd finkit
npm install
```

## Running tests

```sh
npm test                # run full test suite
npm run test:coverage   # run with coverage report
npm run typecheck       # TypeScript type check
npm run build           # compile ESM + CJS output to dist/
```

All tests must pass before submitting a PR. Coverage should not decrease.

## Project structure

```
src/
  core/         errors, math utilities, input validation
  investments/  SIP (with step-up), lump-sum
  returns/      CAGR, absolute, annualized, XIRR
  loans/        EMI, amortization schedule
  deposits/     FD, RD
  inflation/    real rate, purchasing power, goal SIP
  types/        shared TypeScript interfaces and type aliases
  index.ts      barrel re-exports
test/           one file per module
```

## Adding or changing a calculation

1. **Verify the formula first.** Open a spreadsheet or use an independent reference (RBI guidelines, AMFI documentation, standard financial textbooks) to confirm expected values before writing code.
2. **Write or update tests in `test/`** with independently verified reference values. Do not compute expected values by calling the same function you are testing.
3. **Document assumptions** — compounding frequency, day-count convention, payment timing — in the JSDoc block of the function.
4. **Run typecheck and the full test suite** before opening a PR.

## Code style

- TypeScript strict mode is on.
- No `any` types in public APIs.
- Prefer `round(value, decimals)` from `src/core/math.ts` over `toFixed` or manual arithmetic.
- Error messages should be specific enough to help the caller fix the input.

## Pull requests

- Keep PRs focused: one calculation or one bug per PR.
- Add a brief entry to `CHANGELOG.md` under an `[Unreleased]` heading.
- Squash fixup commits before requesting review.

## Reporting bugs

Open a GitHub Issue. Include:
- The function name and parameters you passed.
- The value you expected and what you received.
- An independent reference showing the correct value (formula, spreadsheet, or regulator document).

## License

By contributing you agree your work will be released under the MIT license.
