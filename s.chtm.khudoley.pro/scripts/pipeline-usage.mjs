#!/usr/bin/env node
/**
 * Метрики цикла /pipeline: время и расход токенов по моделям.
 *
 * Читает транскрипт активной сессии Claude Code и транскрипты её субагентов,
 * агрегирует usage по полю model. Источник — те же данные, что у /cost и ccusage:
 *   ~/.claude/projects/<encoded-cwd>/<session>.jsonl
 *   ~/.claude/projects/<encoded-cwd>/<session>/subagents/agent-*.jsonl
 *
 * Использование (из корня workspace):
 *   node scripts/pipeline-usage.mjs --since <unix_sec>                 # с момента старта пайплайна
 *   node scripts/pipeline-usage.mjs --since <s> --start <s> --end <s>  # + точное время цикла
 *   node scripts/pipeline-usage.mjs                                    # вся текущая сессия
 *
 * Оговорки:
 *  - токены самого финального отчёта в счёт не попадают (ещё не записаны в лог);
 *  - cache_read / cache_write показаны отдельно от input / output;
 *  - стоимость не считается — только токены.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const argVal = (name) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}
const sinceSec = argVal('--since') ? Number(argVal('--since')) : null
const startSec = argVal('--start') ? Number(argVal('--start')) : null
const endSec = argVal('--end') ? Number(argVal('--end')) : null

const projectsDir = join(homedir(), '.claude', 'projects')
if (!existsSync(projectsDir)) {
  console.error('Не найден каталог транскриптов: ' + projectsDir)
  process.exit(1)
}

const jsonlFilesTop = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(dir, f))

/** Запасной путь: каталог проекта с самым свежим top-level *.jsonl. */
function newestProjectDir(root) {
  let best = null
  let bestM = -1
  for (const name of readdirSync(root)) {
    const d = join(root, name)
    let m = -1
    try {
      if (!statSync(d).isDirectory()) continue
      for (const f of jsonlFilesTop(d)) m = Math.max(m, statSync(f).mtimeMs)
    } catch {
      continue
    }
    if (m > bestM) {
      bestM = m
      best = d
    }
  }
  return best
}

// Кодирование cwd в имя каталога проекта Claude Code: все не-[a-zA-Z0-9] → '-'.
const encoded = process.cwd().replace(/[^a-zA-Z0-9]/g, '-')
let projectDir = join(projectsDir, encoded)
if (!existsSync(projectDir)) projectDir = newestProjectDir(projectsDir)
if (!projectDir) {
  console.error('Не удалось определить каталог сессии.')
  process.exit(1)
}

// Текущая сессия = самый свежий top-level *.jsonl в каталоге проекта.
const topFiles = jsonlFilesTop(projectDir)
if (!topFiles.length) {
  console.error('В каталоге сессии нет транскриптов: ' + projectDir)
  process.exit(1)
}
let sessionFile = topFiles[0]
for (const f of topFiles) if (statSync(f).mtimeMs > statSync(sessionFile).mtimeMs) sessionFile = f
const sessionId = sessionFile.replace(/.*[\\/]/, '').replace(/\.jsonl$/, '')

// Файлы для агрегации: сессия + транскрипты её субагентов.
const files = [sessionFile]
const subDir = join(projectDir, sessionId, 'subagents')
if (existsSync(subDir)) for (const f of jsonlFilesTop(subDir)) files.push(f)

const tier = (model) => {
  if (!model) return 'unknown'
  if (model.includes('opus')) return 'opus'
  if (model.includes('sonnet')) return 'sonnet'
  if (model.includes('haiku')) return 'haiku'
  return model
}

const acc = new Map() // tier → totals
const add = (model, u) => {
  const t = tier(model)
  const cur = acc.get(t) || { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, msgs: 0 }
  cur.input += u.input_tokens || 0
  cur.output += u.output_tokens || 0
  cur.cacheRead += u.cache_read_input_tokens || 0
  cur.cacheWrite += u.cache_creation_input_tokens || 0
  cur.msgs += 1
  acc.set(t, cur)
}

let minTs = Infinity
let maxTs = -Infinity
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let obj
    try {
      obj = JSON.parse(line)
    } catch {
      continue
    }
    const msg = obj.message || obj
    const usage = msg && msg.usage
    if (!usage) continue
    const tsMs = obj.timestamp ? Date.parse(obj.timestamp) : null
    if (sinceSec && tsMs && tsMs < sinceSec * 1000) continue
    if (tsMs) {
      minTs = Math.min(minTs, tsMs)
      maxTs = Math.max(maxTs, tsMs)
    }
    add(msg.model, usage)
  }
}

// ---- вывод ----
const fmt = (n) => n.toLocaleString('ru-RU')
const hms = (sec) => {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

let elapsed = null
if (startSec && endSec) elapsed = endSec - startSec
else if (minTs !== Infinity && maxTs !== -Infinity) elapsed = Math.round((maxTs - minTs) / 1000)

const order = ['opus', 'sonnet', 'haiku']
const tiers = [...acc.keys()].sort((a, b) => {
  const ia = order.indexOf(a)
  const ib = order.indexOf(b)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
})
const tot = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
for (const t of tiers) {
  const a = acc.get(t)
  tot.input += a.input
  tot.output += a.output
  tot.cacheRead += a.cacheRead
  tot.cacheWrite += a.cacheWrite
}

const out = []
out.push('## Метрики цикла')
out.push('')
out.push(
  `**Время:** ${hms(elapsed)}` +
    (startSec && endSec ? ` (start ${startSec} → end ${endSec})` : ' (по таймстемпам транскрипта)')
)
out.push('')
if (!tiers.length) {
  out.push('_Данные usage не найдены (пустой диапазон или нет транскрипта)._')
  console.log(out.join('\n'))
  process.exit(0)
}
out.push('**Токены по моделям:**')
out.push('')
out.push('| Модель | Input | Output | Cache read | Cache write |')
out.push('|--------|------:|-------:|-----------:|------------:|')
for (const t of tiers) {
  const a = acc.get(t)
  out.push(`| ${t} | ${fmt(a.input)} | ${fmt(a.output)} | ${fmt(a.cacheRead)} | ${fmt(a.cacheWrite)} |`)
}
out.push(
  `| **ИТОГО** | **${fmt(tot.input)}** | **${fmt(tot.output)}** | **${fmt(tot.cacheRead)}** | **${fmt(tot.cacheWrite)}** |`
)
out.push('')
out.push(`_Источник: транскрипт сессии ${sessionId} + субагенты. Токены финального отчёта в счёт не входят._`)
console.log(out.join('\n'))
