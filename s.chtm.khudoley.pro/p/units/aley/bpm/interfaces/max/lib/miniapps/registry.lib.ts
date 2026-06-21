export type MiniappPageDefinition = {
  pageKey: string
  title: string
  routePath: string
  allowedActions: string[]
}

export const MINIAPP_PAGE_REGISTRY: Record<string, MiniappPageDefinition> = {
  root: {
    pageKey: 'root',
    title: 'A/Ley BPM',
    routePath: '/miniapps/root',
    allowedActions: []
  }
}

export function getMiniappPage(pageKey: string): MiniappPageDefinition | null {
  return MINIAPP_PAGE_REGISTRY[pageKey] ?? null
}
