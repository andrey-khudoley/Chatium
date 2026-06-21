export const GATEWAY_API_PREFIX = '/api/v1'

export const PAYMENT_GATEWAY_IDS = ['lifepay', 'lavatop', 'gc'] as const
export type PaymentGatewayId = (typeof PAYMENT_GATEWAY_IDS)[number]

export const INTERNAL_GATEWAY_PROJECT_ROOTS: Record<PaymentGatewayId, string> = {
  lifepay: 'p/gateways/lifepay',
  lavatop: 'p/gateways/lavatop',
  gc: 'p/gateways/getcourse'
} as const

export const LEGACY_GATEWAY_PROJECT_ROOTS: Record<PaymentGatewayId, readonly string[]> = {
  lifepay: ['p/saas/gw/lifepay'],
  lavatop: ['p/saas/gw/lavatop'],
  gc: ['p/saas/gateways/getcourse', 'p/saas/gw/gc']
} as const

export const DIRECT_GATEWAY_HOST_ALIASES: Partial<Record<PaymentGatewayId, readonly string[]>> = {
  lavatop: ['gate.lava.top']
} as const

function asRootPath(projectRoot: string): string {
  const clean = projectRoot.replace(/^\/+/, '').replace(/\/+$/, '')
  return `/${clean}`
}

export function getInternalGatewayPath(gatewayId: PaymentGatewayId): string {
  return asRootPath(INTERNAL_GATEWAY_PROJECT_ROOTS[gatewayId])
}

export function getLegacyGatewayPaths(gatewayId: PaymentGatewayId): readonly string[] {
  return LEGACY_GATEWAY_PROJECT_ROOTS[gatewayId].map(asRootPath)
}

export function getDirectGatewayHostAliases(gatewayId: PaymentGatewayId): readonly string[] {
  return DIRECT_GATEWAY_HOST_ALIASES[gatewayId] ?? []
}

export function buildInternalGatewayBaseUrl(ctx: app.Ctx, gatewayId: PaymentGatewayId): string {
  return `https://${ctx.account.host}${getInternalGatewayPath(gatewayId)}`
}
