#!/usr/bin/env node
/**
 * Строгая проверка типов Chatium через vue-tsc.
 *
 * Отличие от проектных tsconfig.json (часто strict: false + локальные шимы):
 * для каждого проекта генерируется временный конфиг, который наследует КОРНЕВОЙ
 * tsconfig.json (strict: true, noUncheckedIndexedAccess, реальные глобальные типы
 * @app/types и @app/ui), но ограничен файлами проекта и исключает облегчённые
 * локальные шимы (jsx.d.ts, vue-shim.d.ts). vue-tsc нужен из-за .vue-файлов.
 *
 * Использование (из корня workspace):
 *   node scripts/check-types.mjs                      # весь workspace (по всем проектам)
 *   node scripts/check-types.mjs p/saas/gw/gc         # только указанный фрагмент(ы)
 *   node scripts/check-types.mjs p/a/index.tsx p/b    # несколько путей
 *   npm run typecheck -- p/saas/gw/gc
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)

const TMP = join(ROOT, `.tsconfig.strict-check.${process.pid}.tmp.json`)
const TSC_VERSIONS = ['-p', 'typescript@5.7.3', '-p', 'vue-tsc@2.2.0']

// Заглушка *.vue — гасит ложные TS7016 на границе .tsx→.vue (см. файл).
const VUE_SHIM = './scripts/vue-modules.d.ts'

// Реальные глобальные типы платформы (включаем только существующие).
const GLOBAL_FILES = [
  'node_modules/@app/types/globals.d.ts',
  'node_modules/@app/types/modules.d.ts',
  'node_modules/@app/ui/global-jsx.d.ts'
].filter((f) => existsSync(join(ROOT, f)))

const toPosix = (p) => p.split('\\').join('/')

/** Все проекты workspace = каталоги с tsconfig.json (кроме корня/node_modules/.typings). */
function allProjectDirs() {
  const out = execSync('git ls-files --cached --others --exclude-standard "*tsconfig.json"', {
    encoding: 'utf8'
  })
  return [
    ...new Set(
      out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((p) => !/(^|\/)(node_modules|\.typings)(\/|$)/.test(p))
        .filter((p) => !/^\.deprecated(\/|$)/.test(toPosix(p))) // заброшенный код — не проверяем
        .filter((p) => toPosix(p) !== 'tsconfig.json') // корневой — не проект
        .map((p) => toPosix(dirname(p)))
        .filter((d) => d && d !== '.')
    )
  ].sort()
}

/** Ближайший вверх каталог с tsconfig.json (но не корень) для произвольного пути. */
function nearestProjectDir(target) {
  const abs = resolve(ROOT, target)
  if (!existsSync(abs)) {
    console.error(`  ! путь не существует, пропуск: ${target}`)
    return null
  }
  let d = statSync(abs).isDirectory() ? abs : dirname(abs)
  while (true) {
    if (d !== ROOT && existsSync(join(d, 'tsconfig.json'))) {
      return toPosix(relative(ROOT, d))
    }
    if (d === ROOT) {
      console.error(`  ! путь не принадлежит ни одному проекту, пропуск: ${target}`)
      return null
    }
    const parent = dirname(d)
    if (parent === d) return null
    d = parent
  }
}

/** Конфиг строгой проверки одного проекта. */
function writeStrictConfig(projectDir) {
  const cfg = {
    extends: './tsconfig.json',
    vueCompilerOptions: { strictTemplates: true },
    files: [...GLOBAL_FILES.map((f) => './' + f), VUE_SHIM],
    include: [`${projectDir}/**/*`],
    exclude: [`${projectDir}/jsx.d.ts`, `${projectDir}/vue-shim.d.ts`, 'node_modules', '.typings']
  }
  writeFileSync(TMP, JSON.stringify(cfg, null, 2))
}

function runVueTsc() {
  const args = ['--yes', ...TSC_VERSIONS, 'vue-tsc', '--noEmit', '--pretty', 'false', '-p', TMP]
  const res = spawnSync('npx', args, { cwd: ROOT, encoding: 'utf8', shell: true })
  const text = `${res.stdout || ''}${res.stderr || ''}`
  const errorLines = text.split('\n').filter((l) => / error TS\d+:/.test(l))
  return { errorLines, raw: text, status: res.status ?? 1 }
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const whole = args.length === 0

  let projects
  if (whole) {
    console.log('Режим: весь workspace')
    projects = allProjectDirs()
  } else {
    console.log(`Режим: фрагменты (${args.length} путь(и))`)
    projects = [...new Set(args.map(nearestProjectDir).filter(Boolean))]
  }

  if (projects.length === 0) {
    console.error('Не найдено ни одного проекта для проверки.')
    process.exit(whole ? 1 : 2)
  }

  console.log(`Проектов к проверке: ${projects.length}`)
  projects.forEach((p) => console.log(`  - ${p}`))

  const failed = []
  let totalErrors = 0

  try {
    for (const projectDir of projects) {
      console.log(`\n== Typecheck: ${projectDir} ==`)
      writeStrictConfig(projectDir)
      const { errorLines } = runVueTsc()
      if (errorLines.length > 0) {
        totalErrors += errorLines.length
        failed.push({ projectDir, count: errorLines.length })
        errorLines.forEach((l) => console.log(l))
        console.log(`  FAIL: ${errorLines.length} ошибк(и)`)
      } else {
        console.log('  ok')
      }
    }
  } finally {
    rmSync(TMP, { force: true })
  }

  console.log('\n================ ИТОГ (типы) ================')
  console.log(
    `Проектов: ${projects.length} | с ошибками: ${failed.length} | всего ошибок: ${totalErrors}`
  )
  failed.forEach((f) => console.log(`  FAIL ${f.projectDir} — ${f.count}`))

  process.exit(failed.length > 0 ? 1 : 0)
}

main()
