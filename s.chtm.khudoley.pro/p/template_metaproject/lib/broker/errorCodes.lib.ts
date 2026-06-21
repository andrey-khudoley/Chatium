import type { BrokerErrorCode, BrokerErrorResult } from './types.lib'

export class BrokerSemanticError extends Error {
  code: BrokerErrorCode
  details?: Record<string, unknown>

  constructor(code: BrokerErrorCode, error: string, details?: Record<string, unknown>) {
    super(error)
    this.code = code
    this.details = details
  }
}

export function brokerError(
  code: BrokerErrorCode,
  error: string,
  details?: Record<string, unknown>
): BrokerErrorResult {
  return details ? { success: false, code, error, details } : { success: false, code, error }
}

export function toBrokerError(error: unknown): BrokerErrorResult {
  if (error instanceof BrokerSemanticError) {
    return brokerError(error.code, error.message, error.details)
  }
  return brokerError('invalid_request', String(error))
}

export function assertCondition(
  condition: unknown,
  code: BrokerErrorCode,
  error: string,
  details?: Record<string, unknown>
): asserts condition {
  if (!condition) throw new BrokerSemanticError(code, error, details)
}
