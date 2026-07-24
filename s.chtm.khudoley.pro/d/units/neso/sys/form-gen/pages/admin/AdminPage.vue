<script setup lang="ts">
import { ref, reactive } from 'vue'

/*
  Админ-страница form-gen (§5.3 спеки): настройки GC (секция 1) + генератор
  форм (секция 2, мультиофферный — §5.1.1) + список форм (секция 3). Данные и
  URL — через SSR-пропсы (web/admin/index.tsx), НЕ импортирует tables/lib/config
  (инвариант Vue). API — через fetch (same-origin, дельта 5 плана), не `.run()`.
  Локальная копия типа офера (структурно совместима с lib/form/types.ts,
  импорт которого во Vue запрещён инвариантом).
*/

interface Offer {
  offerId: string
  title: string
  price: string
  currency: string
}

interface FormRow {
  slug: string
  offers: Offer[]
}

const props = defineProps<{
  initialSettings: { schoolUrl: string; schoolKey: string; developerKey: string }
  saveSettingsUrl: string
  createFormUrl: string
  forms: FormRow[]
}>()

// --- Секция 1: настройки GC ---
const settings = reactive({
  schoolUrl: props.initialSettings.schoolUrl,
  schoolKey: props.initialSettings.schoolKey,
  developerKey: props.initialSettings.developerKey
})
const savingSettings = ref(false)
const settingsSaved = ref(false)
const settingsError = ref('')

async function saveSettings() {
  savingSettings.value = true
  settingsSaved.value = false
  settingsError.value = ''
  try {
    const res = await fetch(props.saveSettingsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolUrl: settings.schoolUrl,
        schoolKey: settings.schoolKey,
        developerKey: settings.developerKey
      })
    })
    const data = await res.json()
    if (data.ok) {
      settingsSaved.value = true
    } else {
      settingsError.value = data.error || 'Не удалось сохранить настройки'
    }
  } catch (e) {
    settingsError.value = e instanceof Error ? e.message : 'Ошибка сети'
  } finally {
    savingSettings.value = false
  }
}

// --- Секция 2: генератор форм ---
const offerRows = ref<Offer[]>([{ offerId: '', title: '', price: '', currency: 'RUB' }])
const creatingForm = ref(false)
const createFormError = ref('')
const createdForm = ref<{ slug: string; scriptSnippet: string; divSnippet: string } | null>(null)
const forms = ref<FormRow[]>([...props.forms])

function addOfferRow() {
  offerRows.value.push({ offerId: '', title: '', price: '', currency: 'RUB' })
}

function removeOfferRow(index: number) {
  offerRows.value.splice(index, 1)
}

async function createForm() {
  creatingForm.value = true
  createFormError.value = ''
  createdForm.value = null
  try {
    const res = await fetch(props.createFormUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offers: offerRows.value })
    })
    const data = await res.json()
    if (data.ok) {
      createdForm.value = {
        slug: data.slug,
        scriptSnippet: data.scriptSnippet,
        divSnippet: data.divSnippet
      }
      // Тот же фильтр, что и сервер (api/admin/create-form.ts) — иначе
      // оптимистичный список расходится с фактически сохранёнными offers.
      const savedOffers = offerRows.value.filter((offer) => offer.offerId && offer.title)
      forms.value = [{ slug: data.slug, offers: savedOffers }, ...forms.value]
      offerRows.value = [{ offerId: '', title: '', price: '', currency: 'RUB' }]
    } else {
      createFormError.value = data.error || 'Не удалось создать форму'
    }
  } catch (e) {
    createFormError.value = e instanceof Error ? e.message : 'Ошибка сети'
  } finally {
    creatingForm.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text)
}
</script>

<template>
  <div style="max-width: 760px; margin: 0 auto; padding: 24px; font-family: sans-serif">
    <h1 style="font-size: 20px">form-gen — Admin</h1>

    <section style="margin-bottom: 32px">
      <h2 style="font-size: 16px">Настройки GetCourse</h2>
      <div style="margin-bottom: 8px">
        <label>URL школы</label><br />
        <input
          v-model="settings.schoolUrl"
          style="width: 100%"
          placeholder="https://school.getcourse.ru"
        />
      </div>
      <div style="margin-bottom: 8px">
        <label>Ключ школы</label><br />
        <input v-model="settings.schoolKey" style="width: 100%" />
      </div>
      <div style="margin-bottom: 8px">
        <label>Ключ разработчика</label><br />
        <input v-model="settings.developerKey" style="width: 100%" />
      </div>
      <button :disabled="savingSettings" @click="saveSettings">
        {{ savingSettings ? 'Сохранение...' : 'Сохранить настройки' }}
      </button>
      <span v-if="settingsSaved" style="color: green; margin-left: 8px">Сохранено</span>
      <span v-if="settingsError" style="color: red; margin-left: 8px">{{ settingsError }}</span>
    </section>

    <section style="margin-bottom: 32px">
      <h2 style="font-size: 16px">Создать форму</h2>
      <div
        v-for="(offer, index) in offerRows"
        :key="index"
        style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center"
      >
        <input v-model="offer.offerId" placeholder="offerId" style="width: 20%" />
        <input v-model="offer.title" placeholder="Название" style="width: 30%" />
        <input v-model="offer.price" placeholder="Цена" style="width: 15%" />
        <input v-model="offer.currency" placeholder="Валюта" style="width: 15%" />
        <button v-if="offerRows.length > 1" @click="removeOfferRow(index)">Удалить</button>
      </div>
      <button style="margin-bottom: 12px" @click="addOfferRow">+ Предложение</button>
      <br />
      <button :disabled="creatingForm" @click="createForm">
        {{ creatingForm ? 'Создание...' : 'Создать форму' }}
      </button>
      <span v-if="createFormError" style="color: red; margin-left: 8px">{{ createFormError }}</span>

      <div v-if="createdForm" style="margin-top: 16px; padding: 12px; background: #f5f5f5">
        <p>
          Форма <strong>{{ createdForm.slug }}</strong> создана. Сниппеты для вставки на страницу:
        </p>
        <div style="margin-bottom: 8px">
          <code>{{ createdForm.scriptSnippet }}</code>
          <button style="margin-left: 8px" @click="copyToClipboard(createdForm.scriptSnippet)">
            Копировать
          </button>
        </div>
        <div>
          <code>{{ createdForm.divSnippet }}</code>
          <button style="margin-left: 8px" @click="copyToClipboard(createdForm.divSnippet)">
            Копировать
          </button>
        </div>
      </div>
    </section>

    <section>
      <h2 style="font-size: 16px">Формы ({{ forms.length }})</h2>
      <table style="width: 100%; border-collapse: collapse">
        <thead>
          <tr>
            <th style="text-align: left; border-bottom: 1px solid #ccc">formID</th>
            <th style="text-align: left; border-bottom: 1px solid #ccc">Предложения</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in forms" :key="row.slug">
            <td>{{ row.slug }}</td>
            <td>{{ (row.offers ?? []).map((o) => o.title).join(', ') }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
