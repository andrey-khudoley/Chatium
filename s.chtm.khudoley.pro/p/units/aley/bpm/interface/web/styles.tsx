import { bootCss } from './pagecss/boot'
import { decoCss } from './pagecss/deco'
import { shellCss } from './pagecss/shell'
import { animCss } from './pagecss/animations'

export function getGlobalCss(): string {
  return bootCss + decoCss + shellCss + animCss
}
