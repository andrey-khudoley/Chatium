// @shared
export type ThemeMode = 'dark' | 'light'

export interface ThemePreset {
  id: string
  mode: ThemeMode
  name: string
  description: string
  themeColor: string
  tokens: Record<string, string>
}

const SHARED_TOKENS: Record<string, string> = {
  '--font-sans': "'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--font-display': "'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--font-mono': "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace",
  '--radius-xs': '4px',
  '--radius-sm': '6px',
  '--radius-md': '8px',
  '--radius-lg': '8px',
  '--radius-xl': '10px',
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-8': '32px',
  '--space-10': '40px',
  '--sidebar-width': '272px',
  '--sidebar-collapsed-width': '82px',
  '--content-max-width': '1680px',
  '--header-height': '68px',
  '--control-height': '36px',
  '--row-height': '40px',
  '--density-scale': '1'
}

function withSharedTokens(tokens: Record<string, string>): Record<string, string> {
  return { ...SHARED_TOKENS, ...tokens }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'forest-night',
    mode: 'dark',
    name: 'Graphite Ops',
    description: 'Dark operational preset with neutral surfaces and clear status color.',
    themeColor: '#080a0d',
    tokens: withSharedTokens({
      '--bg-primary': '#080a0d',
      '--bg-secondary': '#0e1318',
      '--bg-tertiary': '#151b22',
      '--surface-1': 'rgba(15, 19, 24, 0.82)',
      '--surface-2': 'rgba(20, 25, 31, 0.9)',
      '--surface-3': 'rgba(26, 32, 39, 0.96)',
      '--surface-glass': 'rgba(14, 18, 23, 0.76)',
      '--surface-strong': 'rgba(24, 30, 37, 0.98)',
      '--surface-overlay': 'rgba(3, 5, 7, 0.7)',
      '--border-soft': 'rgba(142, 158, 176, 0.18)',
      '--border-strong': 'rgba(154, 170, 188, 0.3)',
      '--border-accent': 'rgba(79, 140, 255, 0.5)',
      '--text-primary': '#f4f7fb',
      '--text-secondary': 'rgba(244, 247, 251, 0.78)',
      '--text-tertiary': 'rgba(244, 247, 251, 0.56)',
      '--accent': '#4f8cff',
      '--accent-strong': '#9dbdff',
      '--accent-soft': 'rgba(79, 140, 255, 0.18)',
      '--accent-contrast': '#071120',
      '--status-success': '#36b37e',
      '--status-warning': '#f5a524',
      '--status-danger': '#e05252',
      '--status-info': '#3aaed8',
      '--focus-ring': '0 0 0 2px rgba(79, 140, 255, 0.38)',
      '--shadow-xs': '0 1px 2px rgba(0, 0, 0, 0.28)',
      '--shadow-sm': '0 8px 18px rgba(0, 0, 0, 0.24)',
      '--shadow-md': '0 16px 32px rgba(0, 0, 0, 0.3)',
      '--shadow-lg': '0 24px 48px rgba(0, 0, 0, 0.38)',
      '--glow-accent': '0 0 0 rgba(79, 140, 255, 0)',
      '--gradient-app': 'linear-gradient(152deg, #080a0d 0%, #0e1318 56%, #141a21 100%)',
      '--gradient-ambient-top':
        'linear-gradient(180deg, rgba(79, 140, 255, 0.1) 0%, transparent 38%)',
      '--gradient-ambient-bottom':
        'linear-gradient(0deg, rgba(54, 179, 126, 0.08) 0%, transparent 42%)',
      '--gradient-glass':
        'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
      '--grid-color': 'rgba(154, 170, 188, 0.08)',
      '--noise-opacity': '0.035',
      '--kanban-backlog': 'rgba(58, 174, 216, 0.15)',
      '--kanban-active': 'rgba(79, 140, 255, 0.18)',
      '--kanban-review': 'rgba(245, 165, 36, 0.18)',
      '--kanban-done': 'rgba(54, 179, 126, 0.16)',
      '--timeline-line': 'rgba(79, 140, 255, 0.3)',
      '--chart-1': '#4f8cff',
      '--chart-2': '#36b37e',
      '--chart-3': '#f5a524',
      '--chart-4': '#3aaed8'
    })
  },
  {
    id: 'sunrise-leaf',
    mode: 'light',
    name: 'Cloud Ops',
    description: 'Base light preset for dense dashboards and daytime operations.',
    themeColor: '#f6f8fc',
    tokens: withSharedTokens({
      '--bg-primary': '#f6f8fc',
      '--bg-secondary': '#eef3fa',
      '--bg-tertiary': '#e3eaf4',
      '--surface-1': 'rgba(255, 255, 255, 0.86)',
      '--surface-2': 'rgba(255, 255, 255, 0.94)',
      '--surface-3': 'rgba(248, 251, 255, 0.98)',
      '--surface-glass': 'rgba(255, 255, 255, 0.78)',
      '--surface-strong': 'rgba(255, 255, 255, 0.98)',
      '--surface-overlay': 'rgba(30, 42, 60, 0.16)',
      '--border-soft': 'rgba(71, 86, 108, 0.16)',
      '--border-strong': 'rgba(71, 86, 108, 0.28)',
      '--border-accent': 'rgba(34, 85, 214, 0.44)',
      '--text-primary': '#162033',
      '--text-secondary': 'rgba(22, 32, 51, 0.76)',
      '--text-tertiary': 'rgba(22, 32, 51, 0.52)',
      '--accent': '#2255d6',
      '--accent-strong': '#173ea6',
      '--accent-soft': 'rgba(34, 85, 214, 0.14)',
      '--accent-contrast': '#ffffff',
      '--status-success': '#16865a',
      '--status-warning': '#bd710f',
      '--status-danger': '#c93d45',
      '--status-info': '#126ca8',
      '--focus-ring': '0 0 0 2px rgba(34, 85, 214, 0.28)',
      '--shadow-xs': '0 1px 2px rgba(39, 54, 78, 0.08)',
      '--shadow-sm': '0 8px 18px rgba(39, 54, 78, 0.1)',
      '--shadow-md': '0 16px 34px rgba(39, 54, 78, 0.14)',
      '--shadow-lg': '0 24px 48px rgba(39, 54, 78, 0.18)',
      '--glow-accent': '0 0 0 rgba(34, 85, 214, 0)',
      '--gradient-app': 'linear-gradient(152deg, #f6f8fc 0%, #eef3fa 58%, #e3eaf4 100%)',
      '--gradient-ambient-top':
        'linear-gradient(180deg, rgba(34, 85, 214, 0.08) 0%, transparent 34%)',
      '--gradient-ambient-bottom':
        'linear-gradient(0deg, rgba(22, 134, 90, 0.07) 0%, transparent 42%)',
      '--gradient-glass':
        'linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(255, 255, 255, 0.42) 100%)',
      '--grid-color': 'rgba(71, 86, 108, 0.08)',
      '--noise-opacity': '0.025',
      '--kanban-backlog': 'rgba(18, 108, 168, 0.1)',
      '--kanban-active': 'rgba(34, 85, 214, 0.12)',
      '--kanban-review': 'rgba(189, 113, 15, 0.13)',
      '--kanban-done': 'rgba(22, 134, 90, 0.12)',
      '--timeline-line': 'rgba(34, 85, 214, 0.26)',
      '--chart-1': '#2255d6',
      '--chart-2': '#16865a',
      '--chart-3': '#bd710f',
      '--chart-4': '#126ca8'
    })
  },
  {
    id: 'midnight-pine',
    mode: 'dark',
    name: 'Signal Dark',
    description: 'Alternative dark preset with blue-green signal accents.',
    themeColor: '#071016',
    tokens: withSharedTokens({
      '--bg-primary': '#071016',
      '--bg-secondary': '#0d1720',
      '--bg-tertiary': '#14212b',
      '--surface-1': 'rgba(13, 22, 30, 0.84)',
      '--surface-2': 'rgba(18, 30, 40, 0.9)',
      '--surface-3': 'rgba(24, 38, 50, 0.96)',
      '--surface-glass': 'rgba(12, 22, 30, 0.76)',
      '--surface-strong': 'rgba(20, 34, 44, 0.98)',
      '--surface-overlay': 'rgba(3, 8, 11, 0.7)',
      '--border-soft': 'rgba(129, 178, 203, 0.18)',
      '--border-strong': 'rgba(129, 178, 203, 0.32)',
      '--border-accent': 'rgba(74, 194, 186, 0.48)',
      '--text-primary': '#edf8fb',
      '--text-secondary': 'rgba(237, 248, 251, 0.78)',
      '--text-tertiary': 'rgba(237, 248, 251, 0.56)',
      '--accent': '#4ac2ba',
      '--accent-strong': '#9ae7e1',
      '--accent-soft': 'rgba(74, 194, 186, 0.18)',
      '--accent-contrast': '#061312',
      '--status-success': '#5fd28a',
      '--status-warning': '#efbd5a',
      '--status-danger': '#eb6b78',
      '--status-info': '#69b8ff',
      '--focus-ring': '0 0 0 2px rgba(74, 194, 186, 0.34)',
      '--shadow-xs': '0 1px 2px rgba(0, 0, 0, 0.3)',
      '--shadow-sm': '0 8px 20px rgba(0, 0, 0, 0.28)',
      '--shadow-md': '0 18px 36px rgba(0, 0, 0, 0.34)',
      '--shadow-lg': '0 28px 56px rgba(0, 0, 0, 0.42)',
      '--glow-accent': '0 0 0 rgba(74, 194, 186, 0)',
      '--gradient-app': 'linear-gradient(150deg, #071016 0%, #0d1720 54%, #14212b 100%)',
      '--gradient-ambient-top':
        'linear-gradient(180deg, rgba(74, 194, 186, 0.1) 0%, transparent 36%)',
      '--gradient-ambient-bottom':
        'linear-gradient(0deg, rgba(105, 184, 255, 0.08) 0%, transparent 44%)',
      '--gradient-glass':
        'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
      '--grid-color': 'rgba(129, 178, 203, 0.08)',
      '--noise-opacity': '0.035',
      '--kanban-backlog': 'rgba(105, 184, 255, 0.15)',
      '--kanban-active': 'rgba(74, 194, 186, 0.18)',
      '--kanban-review': 'rgba(239, 189, 90, 0.18)',
      '--kanban-done': 'rgba(95, 210, 138, 0.16)',
      '--timeline-line': 'rgba(74, 194, 186, 0.3)',
      '--chart-1': '#4ac2ba',
      '--chart-2': '#69b8ff',
      '--chart-3': '#efbd5a',
      '--chart-4': '#5fd28a'
    })
  },
  {
    id: 'misty-daybreak',
    mode: 'light',
    name: 'Steel Day',
    description: 'Alternative light preset with cool surfaces and stronger hierarchy.',
    themeColor: '#eef3f7',
    tokens: withSharedTokens({
      '--bg-primary': '#eef3f7',
      '--bg-secondary': '#e4ebf2',
      '--bg-tertiary': '#d8e2eb',
      '--surface-1': 'rgba(250, 252, 254, 0.86)',
      '--surface-2': 'rgba(255, 255, 255, 0.94)',
      '--surface-3': 'rgba(247, 250, 253, 0.98)',
      '--surface-glass': 'rgba(255, 255, 255, 0.76)',
      '--surface-strong': 'rgba(255, 255, 255, 0.98)',
      '--surface-overlay': 'rgba(24, 42, 56, 0.16)',
      '--border-soft': 'rgba(53, 81, 102, 0.16)',
      '--border-strong': 'rgba(53, 81, 102, 0.28)',
      '--border-accent': 'rgba(23, 103, 155, 0.44)',
      '--text-primary': '#142536',
      '--text-secondary': 'rgba(20, 37, 54, 0.76)',
      '--text-tertiary': 'rgba(20, 37, 54, 0.52)',
      '--accent': '#17679b',
      '--accent-strong': '#0e4c75',
      '--accent-soft': 'rgba(23, 103, 155, 0.14)',
      '--accent-contrast': '#ffffff',
      '--status-success': '#167f59',
      '--status-warning': '#b36f18',
      '--status-danger': '#bd4350',
      '--status-info': '#17679b',
      '--focus-ring': '0 0 0 2px rgba(23, 103, 155, 0.28)',
      '--shadow-xs': '0 1px 2px rgba(33, 54, 72, 0.08)',
      '--shadow-sm': '0 8px 18px rgba(33, 54, 72, 0.1)',
      '--shadow-md': '0 16px 34px rgba(33, 54, 72, 0.14)',
      '--shadow-lg': '0 24px 48px rgba(33, 54, 72, 0.18)',
      '--glow-accent': '0 0 0 rgba(23, 103, 155, 0)',
      '--gradient-app': 'linear-gradient(152deg, #eef3f7 0%, #e4ebf2 56%, #d8e2eb 100%)',
      '--gradient-ambient-top':
        'linear-gradient(180deg, rgba(23, 103, 155, 0.08) 0%, transparent 34%)',
      '--gradient-ambient-bottom':
        'linear-gradient(0deg, rgba(22, 127, 89, 0.06) 0%, transparent 42%)',
      '--gradient-glass':
        'linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(255, 255, 255, 0.4) 100%)',
      '--grid-color': 'rgba(53, 81, 102, 0.08)',
      '--noise-opacity': '0.025',
      '--kanban-backlog': 'rgba(23, 103, 155, 0.1)',
      '--kanban-active': 'rgba(22, 127, 89, 0.12)',
      '--kanban-review': 'rgba(179, 111, 24, 0.13)',
      '--kanban-done': 'rgba(22, 127, 89, 0.12)',
      '--timeline-line': 'rgba(23, 103, 155, 0.26)',
      '--chart-1': '#17679b',
      '--chart-2': '#167f59',
      '--chart-3': '#b36f18',
      '--chart-4': '#bd4350'
    })
  }
]

const PRESET_BY_ID = new Map<string, ThemePreset>(
  THEME_PRESETS.map((preset) => [preset.id, preset])
)

const DEFAULT_PRESET_BY_MODE: Record<ThemeMode, string> = {
  dark: 'forest-night',
  light: 'sunrise-leaf'
}

export function getThemePreset(mode: ThemeMode, preferredId?: string): ThemePreset {
  if (preferredId) {
    const preferred = PRESET_BY_ID.get(preferredId)
    if (preferred && preferred.mode === mode) return preferred
  }

  const fallback = PRESET_BY_ID.get(DEFAULT_PRESET_BY_MODE[mode])
  if (!fallback) {
    throw new Error(`Missing default theme preset for mode: ${mode}`)
  }
  return fallback
}

export function getThemePresetById(id: string): ThemePreset | undefined {
  return PRESET_BY_ID.get(id)
}

export function getThemePresetOptions(mode?: ThemeMode): ThemePreset[] {
  if (!mode) return [...THEME_PRESETS]
  return THEME_PRESETS.filter((preset) => preset.mode === mode)
}

export function getDefaultThemePresetId(mode: ThemeMode): string {
  return DEFAULT_PRESET_BY_MODE[mode]
}
