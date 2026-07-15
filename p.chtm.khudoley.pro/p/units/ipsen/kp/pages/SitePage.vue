<script setup lang="ts">
declare const ctx: any

import { ref, reactive, computed } from 'vue'
import { apiCreateAnswerRoute } from '../api/answers/create'
import { CONTENT, LANGS, ALL_QUESTION_IDS, resolveLang } from '../shared/content'
import type { Lang } from '../shared/content'

interface AnswerVM {
  id: string
  text: string
  authorName: string
  authorType: string
  createdAtMs: number
}

const props = defineProps<{
  answersByQuestion: Record<string, AnswerVM[]>
  initialLang: string
}>()

// Текущий язык. Начальное значение — от сервера (ctx.lang, см. index.tsx).
// Переключение мгновенное: весь контент — computed от lang, без перезагрузки.
const lang = ref<Lang>(resolveLang(props.initialLang))
const c = computed(() => CONTENT[lang.value])
const ui = computed(() => c.value.ui)

// В кнопке рендерятся обе подписи, нужную показывает CSS по ширине экрана:
// так не нужен JS-детект брейкпоинта и нет рассинхрона при ресайзе.
const TABS = computed(() => [
  { id: 'kp', label: ui.value.tabKp, short: ui.value.tabKpShort },
  { id: 'arch', label: ui.value.tabArch, short: ui.value.tabArchShort },
  { id: 'questions', label: ui.value.tabQuestions, short: ui.value.tabQuestionsShort }
])
const activeTab = ref('kp')

// Локальная реактивная карта ответов по вопросам (стартует из SSR-пропсов).
// Ключи — сквозные id вопросов, поэтому смена языка ответы не сбрасывает.
const answersMap = reactive<Record<string, AnswerVM[]>>({})
for (const qid of ALL_QUESTION_IDS) {
  const src = props.answersByQuestion ? props.answersByQuestion[qid] : undefined
  answersMap[qid] = Array.isArray(src) ? src.slice() : []
}

// Состояние раскрытия и формы по каждому вопросу.
interface FormState {
  open: boolean
  text: string
  busy: boolean
  msg: string
  ok: boolean
}
const forms = reactive<Record<string, FormState>>({})
for (const qid of ALL_QUESTION_IDS) {
  forms[qid] = { open: false, text: '', busy: false, msg: '', ok: false }
}

/** Гарантированно возвращает состояние формы вопроса (создаёт при отсутствии). */
function formOf(qid: string): FormState {
  let f = forms[qid]
  if (!f) {
    f = { open: false, text: '', busy: false, msg: '', ok: false }
    forms[qid] = f
  }
  return f
}

/** Гарантированно возвращает массив ответов вопроса. */
function answersOf(qid: string): AnswerVM[] {
  let a = answersMap[qid]
  if (!a) {
    a = []
    answersMap[qid] = a
  }
  return a
}

function toggle(qid: string) {
  const f = formOf(qid)
  f.open = !f.open
}

function countFor(qid: string): number {
  return answersOf(qid).length
}

function fmtDate(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n: number) => (n < 10 ? '0' + n : '' + n)
  return (
    p(d.getDate()) +
    '.' +
    p(d.getMonth() + 1) +
    '.' +
    d.getFullYear() +
    ' ' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes())
  )
}

function badge(t: string): string {
  if (t === 'Real') return ui.value.badgeReal
  if (t === 'Bot') return ui.value.badgeBot
  return ui.value.badgeGuest
}

/**
 * Автор последнего ответа: имя, если оно есть, иначе — локализованный статус
 * («гость» / «участник» / «бот»). Ответы уже отсортированы по createdAtMs asc
 * (см. index.tsx), новые добавляются в конец — последний элемент и есть свежий.
 */
function lastAuthorLabel(qid: string): string {
  const list = answersOf(qid)
  const last = list[list.length - 1]
  if (!last) return ''
  return last.authorName || badge(last.authorType)
}

async function submit(qid: string) {
  const f = formOf(qid)
  if (f.busy) return
  const text = (f.text || '').trim()
  if (!text) {
    f.msg = ui.value.errEmptyText
    f.ok = false
    return
  }
  f.busy = true
  f.msg = ''
  try {
    const res: any = await apiCreateAnswerRoute.run(ctx, {
      questionId: qid,
      text
    })
    if (res && res.success && res.answer) {
      answersOf(qid).push(res.answer)
      f.text = ''
      f.ok = true
      f.msg = ui.value.okAdded
    } else {
      f.ok = false
      f.msg = (res && res.error) || ui.value.errSend
    }
  } catch (e) {
    f.ok = false
    f.msg = ui.value.errNetwork
  } finally {
    f.busy = false
  }
}
</script>

<template>
  <header class="kp-header">
    <div class="kp-shell kp-header-in">
      <div class="kp-brand">
        <span class="kp-brand-dot"></span>
        <span class="kp-brand-name">ИП Худолей Андрей · Ipsen</span>
      </div>
      <nav class="kp-tabs">
        <button
          v-for="t in TABS"
          :key="t.id"
          class="kp-tab"
          :class="{ 'is-active': activeTab === t.id }"
          @click="activeTab = t.id"
        >
          <span class="kp-tab-full">{{ t.label }}</span>
          <span class="kp-tab-short">{{ t.short }}</span>
        </button>
      </nav>
      <div class="kp-langs">
        <button
          v-for="l in LANGS"
          :key="l"
          class="kp-lang"
          :class="{ 'is-active': lang === l }"
          @click="lang = l"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>
    </div>
  </header>

  <section class="kp-hero">
    <div class="kp-shell">
      <span class="kp-eyebrow">{{ c.meta.stage }}</span>
      <h1>{{ c.meta.title }}</h1>
    </div>
  </section>

  <!-- ── КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ ── -->
  <main v-if="activeTab === 'kp'" class="kp-view">
    <div class="kp-shell">
      <div class="kp-section-head">
        <h2>{{ ui.kpHeading }}</h2>
        <p>{{ c.kpIntro }}</p>
      </div>

      <div v-for="s in c.kpSections" :key="s.n" class="kp-kpsec" :class="{ 'is-locked': s.locked }">
        <div class="kp-kpsec-head">
          <span class="kp-kpsec-n">{{ s.n }}</span>
          <h3>{{ s.title }}</h3>
          <svg
            v-if="s.locked"
            class="kp-kpsec-lock"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <p v-if="s.locked" class="kp-kpsec-locked-note">{{ ui.lockedNote }}</p>
        <template v-else>
          <template v-for="(b, bi) in s.blocks" :key="bi">
            <p v-if="b.type === 'text'">{{ b.text }}</p>
            <div v-else-if="b.type === 'note'" class="kp-kpnote">{{ b.text }}</div>
            <ul v-else-if="b.type === 'included'" class="kp-ilist inc">
              <li v-for="(it, ii) in b.items || []" :key="ii">{{ it }}</li>
            </ul>
            <ul v-else-if="b.type === 'excluded'" class="kp-ilist exc">
              <li v-for="(it, ii) in b.items || []" :key="ii">{{ it }}</li>
            </ul>
            <ul v-else-if="b.type === 'list'" class="kp-ilist plain">
              <li v-for="(it, ii) in b.items || []" :key="ii">{{ it }}</li>
            </ul>
          </template>
        </template>
      </div>
    </div>
  </main>

  <!-- ── АРХИТЕКТУРА ── -->
  <main v-else-if="activeTab === 'arch'" class="kp-view">
    <div class="kp-shell">
      <div class="kp-section-head">
        <h2>{{ ui.archHeading }}</h2>
      </div>
      <div class="kp-lead">
        <p v-for="(t, i) in c.archIntro" :key="i">{{ t }}</p>
      </div>

      <div v-for="layer in c.archLayers" :key="layer.id" class="kp-layer">
        <div class="kp-layer-top">
          <span class="kp-layer-idx">{{ layer.index }}</span>
          <h3>{{ layer.title }}</h3>
        </div>
        <p class="kp-layer-sub">{{ layer.subtitle }}</p>

        <template v-if="(layer.groups || []).length">
          <template v-for="(g, gi) in layer.groups || []" :key="gi">
            <div class="kp-group-title">{{ g.title }}</div>
            <div class="kp-agents">
              <div v-for="a in g.items" :key="a.code" class="kp-agent">
                <div class="kp-agent-head">
                  <span class="kp-code">{{ a.code }}</span>
                  <span class="kp-agent-name">{{ a.name }}</span>
                  <span v-if="a.kind && a.kind !== 'infra'" class="kp-kind" :class="a.kind">{{
                    a.kind
                  }}</span>
                </div>
                <div class="kp-agent-desc">{{ a.desc }}</div>
              </div>
            </div>
          </template>
        </template>

        <div v-else class="kp-agents">
          <div v-for="a in layer.items || []" :key="a.code" class="kp-agent">
            <div class="kp-agent-head">
              <span class="kp-code">{{ a.code }}</span>
              <span class="kp-agent-name">{{ a.name }}</span>
              <span v-if="a.kind && a.kind !== 'infra'" class="kp-kind" :class="a.kind">{{
                a.kind
              }}</span>
            </div>
            <div class="kp-agent-desc">{{ a.desc }}</div>
          </div>
        </div>

        <div v-if="layer.note" class="kp-note">{{ layer.note }}</div>
      </div>
    </div>
  </main>

  <!-- ── ОТКРЫТЫЕ ВОПРОСЫ ── -->
  <main v-else class="kp-view">
    <div class="kp-shell">
      <div class="kp-section-head">
        <h2>{{ ui.questionsHeading }}</h2>
      </div>

      <div v-for="blk in c.questionBlocks" :key="blk.letter" class="kp-qblock">
        <div class="kp-qblock-head">
          <span class="kp-qletter">{{ blk.letter }}</span>
          <h3>{{ blk.title }}</h3>
        </div>

        <div
          v-for="q in blk.questions"
          :key="q.id"
          class="kp-q"
          :class="{ open: formOf(q.id).open }"
        >
          <div class="kp-q-top" @click="toggle(q.id)">
            <div class="kp-q-text">
              <span class="kp-q-code">{{ q.code }}</span>
              <div class="kp-q-body">{{ q.text }}</div>
              <div class="kp-q-feeds">{{ q.feeds }}</div>
            </div>
            <span class="kp-q-badges">
              <span class="kp-q-count" :class="{ has: countFor(q.id) > 0 }">
                {{ countFor(q.id) }} {{ ui.answersSuffix }}
              </span>
              <span v-if="countFor(q.id) > 0" class="kp-q-last" :title="lastAuthorLabel(q.id)">
                {{ lastAuthorLabel(q.id) }}
              </span>
            </span>
            <span class="kp-caret">▸</span>
          </div>

          <div v-if="formOf(q.id).open" class="kp-q-panel">
            <div v-if="countFor(q.id) > 0" class="kp-answers">
              <div v-for="a in answersOf(q.id)" :key="a.id" class="kp-answer">
                <div class="kp-answer-meta">
                  <span v-if="a.authorName" class="kp-answer-name">{{ a.authorName }}</span>
                  <span class="kp-answer-badge">{{ badge(a.authorType) }}</span>
                  <span class="kp-answer-date">{{ fmtDate(a.createdAtMs) }}</span>
                </div>
                <div class="kp-answer-text">{{ a.text }}</div>
              </div>
            </div>
            <div v-else class="kp-empty">{{ ui.emptyAnswers }}</div>

            <form class="kp-form" @submit.prevent="submit(q.id)">
              <textarea
                class="kp-textarea"
                v-model="formOf(q.id).text"
                :placeholder="ui.textPlaceholder"
                maxlength="4000"
              ></textarea>
              <div class="kp-form-foot">
                <button class="kp-btn" type="submit" :disabled="formOf(q.id).busy">
                  {{ formOf(q.id).busy ? ui.submitting : ui.submit }}
                </button>
                <span
                  v-if="formOf(q.id).msg"
                  class="kp-form-msg"
                  :class="{ ok: formOf(q.id).ok, err: !formOf(q.id).ok }"
                >
                  {{ formOf(q.id).msg }}
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer class="kp-footer">
    <div class="kp-shell">
      <b>{{ ui.footerStrong }}</b>
      {{ ui.footerRest }}
    </div>
  </footer>
</template>
