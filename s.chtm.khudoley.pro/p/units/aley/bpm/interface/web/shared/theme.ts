// @shared

export function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function applyTheme(el: HTMLElement, accent = '#F74E53', comfy = true): void {
  const vars: Record<string, string> = {
    '--bg': '#0E1422',
    '--surface': '#141B2D',
    '--surface-2': '#1A2238',
    '--elevated': '#222C44',
    '--line': 'rgba(180,200,255,0.10)',
    '--line-2': 'rgba(180,200,255,0.20)',
    '--fg': '#EBF0FF',
    '--fg2': 'rgba(235,240,255,0.62)',
    '--fg3': 'rgba(235,240,255,0.40)',
    '--accent': accent,
    '--accent-fg': '#ffffff',
    '--accent-soft': hexA(accent, 0.16),
    '--accent-line': hexA(accent, 0.42),
    '--ok': '#34D399',
    '--warn': '#E0A042',
    '--pad': comfy ? '18px' : '14px',
    '--base': comfy ? '13.5px' : '13px'
  }
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
}
