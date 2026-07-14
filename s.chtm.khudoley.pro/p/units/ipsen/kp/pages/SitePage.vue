<script setup lang="ts">
declare const ctx: any

import { ref, reactive } from 'vue'
import { apiCreateAnswerRoute } from '../api/answers/create'
import {
  META,
  ARCH_INTRO,
  ARCH_PLATFORM_NOTE,
  ARCH_LAYERS,
  KP_INTRO,
  KP_SECTIONS,
  QUESTIONS_INTRO,
  QUESTION_BLOCKS,
  ALL_QUESTION_IDS
} from '../shared/content'

interface AnswerVM {
  id: string
  text: string
  authorName: string
  authorType: string
  createdAtMs: number
}

const props = defineProps<{
  answersByQuestion: Record<string, AnswerVM[]>
  userName: string
}>()

const TABS = [
  { id: 'arch', label: 'Архитектура' },
  { id: 'kp', label: 'Коммерческое предложение' },
  { id: 'questions', label: 'Открытые вопросы' }
]
const activeTab = ref('arch')

// Локальная реактивная карта ответов по вопросам (стартует из SSR-пропсов).
const answersMap = reactive<Record<string, AnswerVM[]>>({})
for (const qid of ALL_QUESTION_IDS) {
  const src = props.answersByQuestion ? props.answersByQuestion[qid] : undefined
  answersMap[qid] = Array.isArray(src) ? src.slice() : []
}

// Состояние раскрытия и формы по каждому вопросу.
interface FormState {
  open: boolean
  text: string
  name: string
  busy: boolean
  msg: string
  ok: boolean
}
const forms = reactive<Record<string, FormState>>({})
for (const qid of ALL_QUESTION_IDS) {
  forms[qid] = {
    open: false,
    text: '',
    name: props.userName || '',
    busy: false,
    msg: '',
    ok: false
  }
}

/** Гарантированно возвращает состояние формы вопроса (создаёт при отсутствии). */
function formOf(qid: string): FormState {
  let f = forms[qid]
  if (!f) {
    f = { open: false, text: '', name: props.userName || '', busy: false, msg: '', ok: false }
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
  if (t === 'Real') return 'участник'
  if (t === 'Bot') return 'бот'
  return 'гость'
}

async function submit(qid: string) {
  const f = formOf(qid)
  if (f.busy) return
  const text = (f.text || '').trim()
  if (!text) {
    f.msg = 'Введите текст ответа.'
    f.ok = false
    return
  }
  f.busy = true
  f.msg = ''
  try {
    const res: any = await apiCreateAnswerRoute.run(ctx, {
      questionId: qid,
      text,
      authorName: (f.name || '').trim()
    })
    if (res && res.success && res.answer) {
      answersOf(qid).push(res.answer)
      f.text = ''
      f.ok = true
      f.msg = 'Спасибо! Ответ добавлен.'
    } else {
      f.ok = false
      f.msg = (res && res.error) || 'Не удалось отправить. Попробуйте ещё раз.'
    }
  } catch (e) {
    f.ok = false
    f.msg = 'Ошибка сети. Попробуйте ещё раз.'
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
        <span>
          <span class="kp-brand-name">Ипсен · ИИ-агенты</span><br />
          <span class="kp-brand-sub">коммерческое предложение</span>
        </span>
      </div>
      <nav class="kp-tabs">
        <button
          v-for="t in TABS"
          :key="t.id"
          class="kp-tab"
          :class="{ 'is-active': activeTab === t.id }"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </nav>
    </div>
  </header>

  <section class="kp-hero">
    <div class="kp-shell">
      <span class="kp-eyebrow">{{ META.stage }}</span>
      <h1>{{ META.title }}</h1>
      <p>{{ META.subtitle }}</p>
      <div class="kp-meta">
        <span class="kp-chip"><b>Клиент:</b> {{ META.client }}</span>
        <span class="kp-chip"><b>Контакт:</b> {{ META.contact }}</span>
        <span class="kp-chip"><b>Платформа:</b> {{ META.platform }}</span>
      </div>
    </div>
  </section>

  <!-- ── АРХИТЕКТУРА ── -->
  <main v-if="activeTab === 'arch'" class="kp-view">
    <div class="kp-shell">
      <div class="kp-section-head">
        <h2>Архитектура: брокер + микросервисы</h2>
      </div>
      <div class="kp-lead">
        <p v-for="(t, i) in ARCH_INTRO" :key="i">{{ t }}</p>
      </div>

      <div v-for="layer in ARCH_LAYERS" :key="layer.id" class="kp-layer">
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

      <div class="kp-platform-note">{{ ARCH_PLATFORM_NOTE }}</div>
    </div>
  </main>

  <!-- ── КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ ── -->
  <main v-else-if="activeTab === 'kp'" class="kp-view">
    <div class="kp-shell">
      <div class="kp-section-head">
        <h2>Коммерческое предложение</h2>
        <p>{{ KP_INTRO }}</p>
      </div>

      <div v-for="s in KP_SECTIONS" :key="s.n" class="kp-kpsec">
        <div class="kp-kpsec-head">
          <span class="kp-kpsec-n">{{ s.n }}</span>
          <h3>{{ s.title }}</h3>
        </div>
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
      </div>
    </div>
  </main>

  <!-- ── ОТКРЫТЫЕ ВОПРОСЫ ── -->
  <main v-else class="kp-view">
    <div class="kp-shell">
      <div class="kp-section-head">
        <h2>Открытые вопросы</h2>
        <p>{{ QUESTIONS_INTRO }}</p>
      </div>

      <div v-for="blk in QUESTION_BLOCKS" :key="blk.letter" class="kp-qblock">
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
            <span class="kp-q-count" :class="{ has: countFor(q.id) > 0 }">
              {{ countFor(q.id) }} отв.
            </span>
            <span class="kp-caret">▸</span>
          </div>

          <div v-if="formOf(q.id).open" class="kp-q-panel">
            <div v-if="countFor(q.id) > 0" class="kp-answers">
              <div v-for="a in answersOf(q.id)" :key="a.id" class="kp-answer">
                <div class="kp-answer-meta">
                  <span class="kp-answer-name">{{ a.authorName }}</span>
                  <span class="kp-answer-badge">{{ badge(a.authorType) }}</span>
                  <span class="kp-answer-date">{{ fmtDate(a.createdAtMs) }}</span>
                </div>
                <div class="kp-answer-text">{{ a.text }}</div>
              </div>
            </div>
            <div v-else class="kp-empty">Ответов пока нет — станьте первым.</div>

            <form class="kp-form" @submit.prevent="submit(q.id)">
              <div class="kp-form-row">
                <input
                  class="kp-input"
                  v-model="formOf(q.id).name"
                  type="text"
                  placeholder="Ваше имя (необязательно)"
                  maxlength="120"
                />
              </div>
              <textarea
                class="kp-textarea"
                v-model="formOf(q.id).text"
                placeholder="Ваш ответ на этот вопрос…"
                maxlength="4000"
              ></textarea>
              <div class="kp-form-foot">
                <button class="kp-btn" type="submit" :disabled="formOf(q.id).busy">
                  {{ formOf(q.id).busy ? 'Отправка…' : 'Отправить' }}
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
      <b>Ипсен · Инфраструктура ИИ-агентов.</b>
      Рабочий материал стадии discovery. Ответы на вопросы собираются здесь и переносятся в КП.
    </div>
  </footer>
</template>
