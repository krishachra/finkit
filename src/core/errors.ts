export class FinKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinKitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends FinKitError {
  public readonly field?: string;
  public readonly receivedValue?: unknown;

  constructor(message: string, field?: string, receivedValue?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.receivedValue = receivedValue;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConvergenceError extends FinKitError {
  public readonly iterations: number;
  public readonly tolerance: number;

  constructor(message: string, iterations: number, tolerance: number) {
    super(message);
    this.name = 'ConvergenceError';
    this.iterations = iterations;
    this.tolerance = tolerance;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
