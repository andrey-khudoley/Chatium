import { requireAccountRole } from '@app/auth'

/**
 * Для внешних HTTP-запросов (есть headers) требует роль Admin.
 * Внутренние вызовы (тесты, .run() без браузерных headers) пропускает.
 */
export function requireAdminIfExternalRequest(ctx: any, req: any): void {
  if (req?.headers && Object.keys(req.headers).length > 0) {
    requireAccountRole(ctx, 'Admin')
  }
}
