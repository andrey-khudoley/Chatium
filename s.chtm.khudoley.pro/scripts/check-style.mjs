#!/usr/bin/env node
/**
 * Проверка стиля кода через Prettier по правилам .prettierrc.
 *
 * Использование (из корня workspace):
 *   node scripts/check-style.mjs                  # весь workspace (с учётом .prettierignore)
 *   node scripts/check-style.mjs p/saas/gw/gc     # только указанный фрагмент(ы)
 *   node scripts/check-style.mjs --fix p/a        # автоформатирование вместо проверки
 *   npm run style -- p/saas/gw/gc
 *   npm run style:fix -- p/saas/gw/gc
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)

const PRETTIER = '3.4.2'
const argv = process.argv.slice(2)
const fix = argv.includes('--fix')
const targets = argv.filter((a) => !a.startsWith('-'))
const whole = targets.length === 0

// Prettier сам учитывает .prettierignore. Без путей проверяем весь каталог '.'.
const paths = whole ? ['.'] : targets
const mode = fix ? '--write' : '--check'

console.log(
  `Режим стиля: ${fix ? 'автоформат (--write)' : 'проверка (--check)'} | ${whole ? 'весь workspace' : `фрагменты: ${targets.join(', ')}`}`
)

const args = ['--yes', `prettier@${PRETTIER}`, mode, ...paths]
const res = spawnSync('npx', args, { cwd: ROOT, encoding: 'utf8', shell: true })

const text = `${res.stdout || ''}${res.stderr || ''}`.trim()
if (text) console.log(text)

console.log('\n================ ИТОГ (стиль) ================')
if (res.status === 0) {
  console.log(fix ? 'Файлы отформатированы.' : 'Стиль в порядке.')
} else {
  console.log(
    fix ? 'Prettier завершился с ошибкой.' : 'Есть файлы с нарушением стиля (см. список выше).'
  )
}

process.exit(res.status ?? 1)
