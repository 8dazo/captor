export class CaptarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptarError";
  }
}

export class BudgetExceededError extends CaptarError {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class PolicyViolationError extends CaptarError {
  constructor(message: string) {
    super(message);
    this.name = "PolicyViolationError";
  }
}

export class ToolApprovalRequiredError extends CaptarError {
  constructor(message: string) {
    super(message);
    this.name = "ToolApprovalRequiredError";
  }
}
