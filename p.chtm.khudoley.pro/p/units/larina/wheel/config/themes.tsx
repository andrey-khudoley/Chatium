// @shared
/**
 * Каталог тем оформления колеса.
 * Структура повторяет дизайн-референс «Колесо удачи» (claude.ai/design):
 * каждая тема — полный набор цветов/шрифтов/градиентов, применяемый инлайн в WheelPage.vue.
 * segFills/segTexts/confetti — массивы; для динамического числа секторов берутся по индексу `i % length`.
 * Чистый конфиг, без app/ctx/Heap. Помечен // @shared для импорта во Vue.
 */

export type Theme = {
  id: string
  name: string
  swatch: [string, string, string]
  pageBg: string
  headFont: string
  headW: number
  heading: string
  sub: string
  muted: string
  badge: string
  badgeText: string
  brandLabel: string
  rim: string
  faceBg: string
  segFills: string[]
  segTexts: string[]
  divider: string
  hub: string
  hubText: string
  pointer: string
  pointerDot: string
  glowRgb: string
  button: string
  buttonText: string
  buttonGlow: string
  accent: string
  prizeText: string
  confetti: string[]
}

/** Каталог тем (6 штук) — порядок задаёт `THEME_ORDER`. */
export const THEMES: Theme[] = [
  {
    id: 'gold',
    name: 'Премиум золото',
    swatch: ['#f3dd9b', '#c79a3f', '#14100a'],
    pageBg: 'radial-gradient(120% 80% at 50% -8%, #221a10 0%, #120d08 42%, #0a0807 78%)',
    headFont: "'Cormorant Garamond', serif",
    headW: 600,
    heading: '#f2e7cf',
    sub: '#a59a83',
    muted: '#6e6552',
    badge: 'linear-gradient(140deg, #f3dd9b, #c79a3f)',
    badgeText: '#1a1408',
    brandLabel: '#9c9078',
    rim: 'linear-gradient(150deg, #f3dd9b, #b8923f 46%, #8a6a2c 70%, #e8c87f)',
    faceBg: '#0d0a06',
    segFills: ['#c9a24a', '#14100a'],
    segTexts: ['#1d1607', '#e8cd86'],
    divider: 'rgba(232,205,134,.55)',
    hub: 'linear-gradient(140deg, #f6e2a6, #c79a3f 60%, #a6802f)',
    hubText: '#1a1408',
    pointer: '#f3dd9b',
    pointerDot: 'linear-gradient(140deg, #f6e2a6, #c79a3f)',
    glowRgb: '217,182,95',
    button: 'linear-gradient(135deg, #f6e2a6, #d9b65f 50%, #c79a3f)',
    buttonText: '#1a1408',
    buttonGlow: '199,154,63',
    accent: '#c79a3f',
    prizeText: '#f3dd9b',
    confetti: ['#f3dd9b', '#d9b65f', '#b8923f', '#fff4d6', '#e8c87f']
  },
  {
    id: 'carnival',
    name: 'Карнавальный шатёр',
    swatch: ['#d62828', '#fff4e0', '#f2c14e'],
    pageBg: 'radial-gradient(120% 80% at 50% -8%, #5a1414 0%, #3a0c0c 45%, #240606 82%)',
    headFont: "'Fredoka', sans-serif",
    headW: 600,
    heading: '#fff4e0',
    sub: '#e6c3a8',
    muted: '#a87a64',
    badge: 'linear-gradient(140deg, #f2c14e, #d62828)',
    badgeText: '#2a0606',
    brandLabel: '#d9a98a',
    rim: 'linear-gradient(150deg, #f6d98a, #c79a3f 48%, #8a5a2a 72%, #f2c14e)',
    faceBg: '#2a0808',
    segFills: ['#d62828', '#fff4e0'],
    segTexts: ['#fff4e0', '#c41f1f'],
    divider: 'rgba(242,193,78,.6)',
    hub: 'linear-gradient(140deg, #f6d98a, #d4982f)',
    hubText: '#2a0606',
    pointer: '#f2c14e',
    pointerDot: 'linear-gradient(140deg, #f6d98a, #d4982f)',
    glowRgb: '242,193,78',
    button: 'linear-gradient(135deg, #f2c14e, #e07a1f 55%, #d62828)',
    buttonText: '#2a0606',
    buttonGlow: '214,40,40',
    accent: '#f2c14e',
    prizeText: '#fff4e0',
    confetti: ['#d62828', '#fff4e0', '#f2c14e', '#e07a1f', '#c41f1f']
  },
  {
    id: 'multicolor',
    name: 'Радуга',
    swatch: ['#ff5e7e', '#ffd24c', '#3aa9d2'],
    pageBg: 'radial-gradient(120% 80% at 50% -8%, #1c2233 0%, #141824 45%, #0d0f17 80%)',
    headFont: "'Unbounded', sans-serif",
    headW: 600,
    heading: '#ffffff',
    sub: '#aab2c5',
    muted: '#6b7385',
    badge: 'linear-gradient(140deg, #ff5e7e, #ffd24c 50%, #5b8def)',
    badgeText: '#15171f',
    brandLabel: '#8a93a8',
    rim: 'linear-gradient(150deg, #ff5e7e, #ffd24c 30%, #3ad29f 60%, #5b8def 90%)',
    faceBg: '#12141c',
    segFills: ['#ff5e7e', '#ff9f45', '#ffd24c', '#3ad29f', '#3aa9d2', '#7a6cff'],
    segTexts: ['#3a0a18', '#3a1a00', '#3a2e00', '#063a2a', '#06283a', '#ffffff'],
    divider: 'rgba(255,255,255,.5)',
    hub: 'linear-gradient(140deg, #ffffff, #dfe4ee)',
    hubText: '#15171f',
    pointer: '#ffffff',
    pointerDot: 'linear-gradient(140deg, #ffffff, #c9d2e4)',
    glowRgb: '124,108,255',
    button: 'linear-gradient(135deg, #ff5e7e, #ffd24c 50%, #3ad29f)',
    buttonText: '#15171f',
    buttonGlow: '90,140,255',
    accent: '#ff9f45',
    prizeText: '#ffd24c',
    confetti: ['#ff5e7e', '#ff9f45', '#ffd24c', '#3ad29f', '#3aa9d2', '#7a6cff', '#ffffff']
  },
  {
    id: 'mono',
    name: 'Монохром',
    swatch: ['#ffffff', '#9a9a9a', '#1d1d1d'],
    pageBg: 'radial-gradient(120% 80% at 50% -8%, #2a2a2a 0%, #1a1a1a 45%, #0e0e0e 80%)',
    headFont: "'Montserrat', sans-serif",
    headW: 700,
    heading: '#f5f5f5',
    sub: '#a8a8a8',
    muted: '#6a6a6a',
    badge: 'linear-gradient(140deg, #fafafa, #bdbdbd)',
    badgeText: '#161616',
    brandLabel: '#9a9a9a',
    rim: 'linear-gradient(150deg, #e8e8e8, #9a9a9a 50%, #cfcfcf)',
    faceBg: '#111111',
    segFills: ['#ededed', '#1d1d1d'],
    segTexts: ['#1a1a1a', '#ededed'],
    divider: 'rgba(255,255,255,.35)',
    hub: 'linear-gradient(140deg, #fafafa, #bdbdbd)',
    hubText: '#161616',
    pointer: '#f5f5f5',
    pointerDot: 'linear-gradient(140deg, #ffffff, #c8c8c8)',
    glowRgb: '255,255,255',
    button: 'linear-gradient(135deg, #fafafa, #cfcfcf 50%, #9e9e9e)',
    buttonText: '#161616',
    buttonGlow: '180,180,180',
    accent: '#d0d0d0',
    prizeText: '#f5f5f5',
    confetti: ['#ffffff', '#cfcfcf', '#9a9a9a', '#e0e0e0', '#7a7a7a']
  },
  {
    id: 'mahogany',
    name: 'Махагон',
    swatch: ['#d9a441', '#7a2a1c', '#2e120e'],
    pageBg: 'radial-gradient(120% 80% at 50% -8%, #3a1410 0%, #220b09 45%, #140605 80%)',
    headFont: "'Playfair Display', serif",
    headW: 600,
    heading: '#f0d9b5',
    sub: '#b89a7e',
    muted: '#7a5a48',
    badge: 'linear-gradient(140deg, #d9a441, #8a5a2a)',
    badgeText: '#2a0f08',
    brandLabel: '#a87a5e',
    rim: 'linear-gradient(150deg, #caa15a, #7a4a28 50%, #a87838)',
    faceBg: '#1a0807',
    segFills: ['#7a2a1c', '#2e120e'],
    segTexts: ['#f0d2a0', '#e8c690'],
    divider: 'rgba(217,164,65,.5)',
    hub: 'linear-gradient(140deg, #e3bd72, #9a6a32)',
    hubText: '#2a0f08',
    pointer: '#d9a441',
    pointerDot: 'linear-gradient(140deg, #e3bd72, #9a6a32)',
    glowRgb: '217,164,65',
    button: 'linear-gradient(135deg, #e3bd72, #c79a3f 50%, #8a5a2a)',
    buttonText: '#2a0f08',
    buttonGlow: '180,120,50',
    accent: '#d9a441',
    prizeText: '#f0d2a0',
    confetti: ['#d9a441', '#caa15a', '#7a2a1c', '#f0d2a0', '#8a5a2a']
  },
  {
    id: 'neon',
    name: 'Неон',
    swatch: ['#00e5ff', '#c800ff', '#00ffa3'],
    pageBg: 'radial-gradient(120% 80% at 50% -8%, #0e1430 0%, #0a0a1e 45%, #05050f 80%)',
    headFont: "'Russo One', sans-serif",
    headW: 400,
    heading: '#eafcff',
    sub: '#8ea7d6',
    muted: '#5a6b96',
    badge: 'linear-gradient(140deg, #00e5ff, #c800ff)',
    badgeText: '#05050f',
    brandLabel: '#7fd4ff',
    rim: 'linear-gradient(150deg, #00e5ff, #c800ff 50%, #00ffa3)',
    faceBg: '#08081a',
    segFills: ['#15183f', '#0c0c26'],
    segTexts: ['#00e5ff', '#ff5cf0', '#00ffa3', '#ffe14d'],
    divider: 'rgba(0,229,255,.55)',
    hub: 'linear-gradient(140deg, #00e5ff, #c800ff)',
    hubText: '#05050f',
    pointer: '#00e5ff',
    pointerDot: 'linear-gradient(140deg, #7ff4ff, #c800ff)',
    glowRgb: '0,229,255',
    button: 'linear-gradient(135deg, #00e5ff, #7a5cff 50%, #c800ff)',
    buttonText: '#05050f',
    buttonGlow: '0,229,255',
    accent: '#00e5ff',
    prizeText: '#00e5ff',
    confetti: ['#00e5ff', '#ff5cf0', '#00ffa3', '#ffe14d', '#c800ff']
  }
]

/** Порядок тем (id) для выпадающего списка в админке. */
export const THEME_ORDER: string[] = ['gold', 'carnival', 'multicolor', 'mono', 'mahogany', 'neon']

/** ID темы по умолчанию. */
export const DEFAULT_THEME_ID = 'gold'

/** Возвращает объект темы по id; неизвестный id → тема по умолчанию (gold). */
export function getTheme(themeId: string): Theme {
  return THEMES.find((t) => t.id === themeId) ?? THEMES[0]!
}
