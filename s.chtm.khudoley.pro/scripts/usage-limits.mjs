#!/usr/bin/env node
/**
 * Лимиты подписки Claude Code: окна использования (5 часов / 7 дней) и расход за прогон.
 *
 * Дёргает тот же эндпоинт, что CLI под капотом:
 *   GET https://api.anthropic.com/api/oauth/usage
 *   Authorization: Bearer <oauth_token>
 *   anthropic-beta: oauth-2025-04-20
 *
 * Источник токена (по порядку):
 *   1) env CLAUDE_CODE_OAUTH_TOKEN (долгоживущий, из `claude setup-token`);
 *   2) <CLAUDE_CONFIG_DIR|~/.claude>/.credentials.json → claudeAiOauth.accessToken.
 *
 * Режимы:
 *   node scripts/usage-limits.mjs                  # markdown-блок «## Лимиты подписки»
 *   node scripts/usage-limits.mjs --json           # сырой JSON ответа эндпоинта
 *   node scripts/usage-limits.mjs --track-start ID # снапшот start + детач-таймер на (сброс 5ч − 60с)
 *   node scripts/usage-limits.mjs --track-timer ID # (служебный, запускается таймером) снапшот pre-reset
 *   node scripts/usage-limits.mjs --track-end   ID # снапшот end, гасит таймер, печатает Δ за прогон + остаток
 *
 * Учёт сброса окна (для каждого окна 5ч и 7дн):
 *   - окно не сбрасывалось (end.resets_at == start.resets_at) → Δ = end − start;
 *   - сбросилось, есть замер pre-reset того же окна → Δ = (pre_reset − start) + end;
 *   - сбросилось без замера → Δ недоступна (помечаем).
 *
 * Оговорки:
 *  - сетевой вызов; при отсутствии токена/сети печатает пометку и завершается с кодом 0,
 *    чтобы не ронять финальный отчёт конвейера;
 *  - % целочисленный (гранулярность 1%) — Δ осмысленна на тяжёлых прогонах (pp5+);
 *  - не вызываем process.exit() после fetch: на Windows это роняет libuv-ассерт
 *    при открытых сокетах undici. Даём циклу событий завершиться естественно.
 */
import { readFileSync, existsSync, mkdirSync, appendFileSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const SELF = fileURLToPath(import.meta.url)
const LOG_DIR = join(dirname(SELF), '.usage-log')
const WINDOWS = ['five_hour', 'seven_day'] // окна, по которым считаем Δ за прогон
const WINDOW_LABELS = {
  five_hour: '5 часов',
  seven_day: '7 дней',
  seven_day_opus: '7 дней (Opus)',
  seven_day_sonnet: '7 дней (Sonnet)'
}
const WINDOW_ORDER = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet']

const args = process.argv.slice(2)
const flagVal = (name) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}
const wantJson = args.includes('--json')
const trackStart = flagVal('--track-start')
const trackTimer = flagVal('--track-timer')
const trackEnd = flagVal('--track-end')

// ---------------------------------------------------------------- токен + fetch
function resolveToken() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN.trim()
  const cfgDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
  const credPath = join(cfgDir, '.credentials.json')
  if (!existsSync(credPath)) return null
  try {
    const j = JSON.parse(readFileSync(credPath, 'utf8'))
    return (j.claudeAiOauth && j.claudeAiOauth.accessToken) || j.accessToken || null
  } catch {
    return null
  }
}

/** @returns {{data?: object, error?: string}} */
async function fetchUsage() {
  const token = resolveToken()
  if (!token) {
    return {
      error:
        'Не найден OAuth-токен (env CLAUDE_CODE_OAUTH_TOKEN или ~/.claude/.credentials.json). ' +
        'Создать долгоживущий: `claude setup-token`.'
    }
  }
  try {
    const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20' }
    })
    if (!res.ok) {
      return {
        error: `Эндпоинт лимитов вернул HTTP ${res.status}. Токен мог протухнуть — попробуйте \`claude setup-token\`.`
      }
    }
    return { data: await res.json() }
  } catch (e) {
    return { error: `Не удалось получить лимиты: ${e && e.message ? e.message : e}.` }
  }
}

// ---------------------------------------------------------------- форматирование
const pickNum = (obj, keys) => {
  for (const k of keys) if (obj && typeof obj[k] === 'number') return obj[k]
  return null
}
const pickStr = (obj, keys) => {
  for (const k of keys) if (obj && typeof obj[k] === 'string' && obj[k]) return obj[k]
  return null
}

/** Утилизация окна в целых % (доли 0..1 → проценты; remaining_percent → 100−x). */
function windowUtil(w) {
  if (!w || typeof w !== 'object') return null
  let u = pickNum(w, ['utilization', 'used_percent', 'usedPercent', 'percent', 'percentage'])
  if (u != null && u > 0 && u <= 1) u = Math.round(u * 100)
  const remaining = pickNum(w, ['remaining_percent', 'remainingPercent'])
  if (u == null && remaining != null) u = 100 - remaining
  return u
}
const windowReset = (w) => pickStr(w, ['resets_at', 'resetsAt', 'reset_at', 'resetAt', 'reset'])

function fmtReset(iso) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return iso
  const local = new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  const diffMs = ms - Date.now()
  if (diffMs <= 0) return local
  const totalMin = Math.round(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${local} (через ${h > 0 ? `${h} ч ${m} мин` : `${m} мин`})`
}

/**
 * Блок «## Лимиты подписки» — текущий остаток окон.
 * Если передан `deltas` (key → результат windowDelta), добавляет колонки «Δ за прогон» и «start → end».
 */
function renderSnapshot(data, deltas = null) {
  const out = ['## Лимиты подписки', '']
  const rows = []
  const seen = new Set()
  const addRow = (key) => {
    const u = windowUtil(data[key])
    const r = windowReset(data[key])
    if (u == null && r == null) return // не окно-утилизация (напр. extra_usage)
    seen.add(key)
    const label = WINDOW_LABELS[key] || key
    const usedCell = u != null ? u + '%' : '—'
    const resetCell = r ? fmtReset(r) : '—'
    if (deltas) {
      const d = deltas[key]
      let deltaCell = d && d.delta != null ? `${d.delta >= 0 ? '+' : ''}${d.delta}%` : '—'
      if (d && d.note) deltaCell += ` · ${d.note}`
      const rangeCell = d && d.s != null && d.e != null ? `${d.s}% → ${d.e}%` : '—'
      rows.push(`| ${label} | ${usedCell} | ${deltaCell} | ${rangeCell} | ${resetCell} |`)
    } else {
      rows.push(`| ${label} | ${usedCell} | ${resetCell} |`)
    }
  }
  for (const key of WINDOW_ORDER) if (key in data) addRow(key)
  if (!rows.length) for (const key of Object.keys(data)) if (key !== 'extra_usage') addRow(key)

  if (rows.length && deltas) {
    out.push(
      '| Окно | Использовано | Δ за прогон | start → end | Сброс |',
      '|------|-------------:|------------:|-------------|-------|',
      ...rows
    )
  } else if (rows.length) {
    out.push('| Окно | Использовано | Сброс |', '|------|-------------:|-------|', ...rows)
  } else {
    out.push(
      '_Не удалось распознать окна лимитов; сырой ответ:_',
      '',
      '```json',
      JSON.stringify(data, null, 2),
      '```'
    )
  }

  const ex = data.extra_usage
  if (ex && typeof ex === 'object' && ex.is_enabled) {
    const used = ex.used_credits != null ? ex.used_credits : '?'
    const limit = ex.monthly_limit != null ? ex.monthly_limit : '∞'
    out.push('', `**Extra usage:** ${used} / ${limit}${ex.currency ? ' ' + ex.currency : ''}`)
  }
  out.push('', '_Источник: GET /api/oauth/usage. % — доля израсходованного окна._')
  if (deltas) {
    out.push(
      '_Δ — прирост израсходованной доли окна за прогон. Гранулярность 1%; малые прогоны могут дать 0%._'
    )
  }
  return out.join('\n')
}

// ---------------------------------------------------------------- трекинг прогона
const logFile = (runId) => join(LOG_DIR, `${runId}.jsonl`)
const pidFile = (runId) => join(LOG_DIR, `${runId}.pid`)

/** Снимок утилизации обоих отслеживаемых окон из ответа эндпоинта. */
function snapshot(data) {
  const w = {}
  for (const key of WINDOWS)
    w[key] = { util: windowUtil(data[key]), resets_at: windowReset(data[key]) }
  return w
}

function appendRecord(runId, event, rec) {
  mkdirSync(LOG_DIR, { recursive: true })
  appendFileSync(
    logFile(runId),
    JSON.stringify({ event, ts: new Date().toISOString(), ...rec }) + '\n'
  )
}

function readRecords(runId) {
  const f = logFile(runId)
  if (!existsSync(f)) return []
  const recs = []
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      recs.push(JSON.parse(line))
    } catch {
      /* пропускаем битую строку */
    }
  }
  return recs
}

// Граница сброса одна и та же, если таймстемпы совпадают с точностью до пары минут
// (в ответе resets_at несёт микросекундный jitter; настоящий сброс сдвигает границу на часы).
function sameWindow(a, b) {
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b
  return Math.abs(ta - tb) < 120_000
}

/** Δ по одному окну с учётом возможного сброса. @returns {{delta:number|null, note?:string, s:number, e:number}} */
function windowDelta(key, start, preReset, end) {
  const s = start && start.windows[key]
  const e = end && end.windows[key]
  if (!s || !e || s.util == null || e.util == null) return { delta: null, note: 'нет данных' }
  if (sameWindow(e.resets_at, s.resets_at)) return { delta: e.util - s.util, s: s.util, e: e.util }
  // окно сбросилось между start и end
  const p = preReset && preReset.windows[key]
  if (p && p.util != null && sameWindow(p.resets_at, s.resets_at)) {
    return {
      delta: p.util - s.util + e.util,
      s: s.util,
      e: e.util,
      note: `через сброс, до сброса ${p.util}%`
    }
  }
  return { delta: null, note: 'сброс без замера', s: s.util, e: e.util }
}

/** Считает Δ по отслеживаемым окнам из лога прогона; null, если нет start-записи. */
function computeDeltas(runId, endData) {
  const recs = readRecords(runId)
  const start = recs.find((r) => r.event === 'start')
  if (!start) return null
  const preReset = [...recs].reverse().find((r) => r.event === 'pre-reset')
  const end = { windows: snapshot(endData) }
  const deltas = {}
  for (const key of WINDOWS) deltas[key] = windowDelta(key, start, preReset, end)
  return deltas
}

// ---------------------------------------------------------------- планировщик (детач-таймер)
function spawnTimer(runId) {
  const child = spawn(process.execPath, [SELF, '--track-timer', runId], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })
  child.unref()
  try {
    mkdirSync(LOG_DIR, { recursive: true })
    appendFileSync(pidFile(runId), String(child.pid))
  } catch {
    /* pid-файл не критичен: при track-end просто не сможем погасить таймер заранее */
  }
}

function killTimer(runId) {
  const f = pidFile(runId)
  if (!existsSync(f)) return
  const pid = Number(readFileSync(f, 'utf8').trim())
  if (pid) {
    try {
      process.kill(pid)
    } catch {
      /* процесс уже завершился */
    }
  }
  try {
    unlinkSync(f)
  } catch {
    /* уже удалён */
  }
}

// ---------------------------------------------------------------- режимы
async function modeTrackStart(runId) {
  const { data, error } = await fetchUsage()
  if (error) {
    appendRecord(runId, 'start', { error })
    console.log(`[usage-track ${runId}] start: ${error}`)
    return
  }
  const w = snapshot(data)
  appendRecord(runId, 'start', { windows: w })
  // Планируем замер за минуту до ближайшего сброса 5-часового окна.
  const reset5 = w.five_hour && w.five_hour.resets_at
  if (reset5) spawnTimer(runId)
  const parts = WINDOWS.map(
    (k) => `${WINDOW_LABELS[k]}=${w[k].util != null ? w[k].util + '%' : '?'}`
  ).join(', ')
  console.log(
    `[usage-track ${runId}] start: ${parts}${reset5 ? `; таймер pre-reset до ${fmtReset(reset5)}` : ''}`
  )
}

async function modeTrackTimer(runId) {
  // Спим до (сброс 5ч − 60с), затем фиксируем pre-reset. Источник времени сброса — start-запись.
  const recs = readRecords(runId)
  const start = recs.find((r) => r.event === 'start')
  const reset5 =
    start && start.windows && start.windows.five_hour && start.windows.five_hour.resets_at
  const targetMs = reset5 ? Date.parse(reset5) - 60_000 : Date.now()
  const delay = Math.max(0, targetMs - Date.now())
  await new Promise((r) => setTimeout(r, delay))
  const { data, error } = await fetchUsage()
  appendRecord(runId, 'pre-reset', error ? { error } : { windows: snapshot(data) })
  // Таймер отработал — снимаем pid-файл, чтобы track-end не убил случайно переиспользованный PID.
  try {
    unlinkSync(pidFile(runId))
  } catch {
    /* уже снят */
  }
}

async function modeTrackEnd(runId) {
  killTimer(runId)
  const { data, error } = await fetchUsage()
  if (error) {
    appendRecord(runId, 'end', { error })
    console.log(['## Лимиты подписки', '', `_${error}_`].join('\n'))
    return
  }
  // Δ считаем ДО записи end, чтобы computeDeltas взял start/pre-reset, а end передаём отдельно.
  const deltas = computeDeltas(runId, data)
  appendRecord(runId, 'end', { windows: snapshot(data) })
  console.log(renderSnapshot(data, deltas))
}

async function modeDefault() {
  const { data, error } = await fetchUsage()
  if (error) {
    if (wantJson) console.log(JSON.stringify({ error }, null, 2))
    else console.log(`## Лимиты подписки\n\n_${error}_`)
    return
  }
  console.log(wantJson ? JSON.stringify(data, null, 2) : renderSnapshot(data))
}

// ---------------------------------------------------------------- self-test
function selftest() {
  const W = (util, resetsAtIso) => ({ windows: { five_hour: { util, resets_at: resetsAtIso } } })
  const T0 = '2026-06-01T15:40:00.314114+00:00'
  const T0b = '2026-06-01T15:40:00.999999+00:00' // та же граница, иной jitter
  const T1 = '2026-06-01T20:40:00.111111+00:00' // граница +5ч → сброс
  const cases = [
    ['без сброса', windowDelta('five_hour', W(10, T0), null, W(15, T0b)), 5],
    ['через сброс с замером', windowDelta('five_hour', W(80, T0), W(95, T0b), W(3, T1)), 18],
    ['сброс без замера', windowDelta('five_hour', W(80, T0), null, W(3, T1)), null],
    ['нет данных', windowDelta('five_hour', W(null, T0), null, W(5, T0)), null]
  ]
  let ok = true
  for (const [name, res, expect] of cases) {
    const pass = res.delta === expect
    ok = ok && pass
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${name}: Δ=${res.delta} (ожидалось ${expect})${res.note ? ` [${res.note}]` : ''}`
    )
  }
  process.exitCode = ok ? 0 : 1
}

// ---------------------------------------------------------------- entrypoint
if (args.includes('--selftest')) selftest()
else if (trackStart) await modeTrackStart(trackStart)
else if (trackTimer) await modeTrackTimer(trackTimer)
else if (trackEnd) await modeTrackEnd(trackEnd)
else await modeDefault()
