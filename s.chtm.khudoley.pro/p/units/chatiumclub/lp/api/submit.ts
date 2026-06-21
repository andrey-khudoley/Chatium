// @shared-route
import { Leads } from '../tables/leads.table'

const LOG_PATH = 'p/units/chatiumclub/lp/api/submit'

const PHONE_MIN_DIGITS = 7
const PHONE_MAX_LENGTH = 32
const TG_MIN_LENGTH = 2
const TG_MAX_LENGTH = 64
const NOTES_MIN_LENGTH = 3
const NOTES_MAX_LENGTH = 4000

/** Возвращает текст ошибки или null, если значение валидно. */
function validatePhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Укажите телефон'
  if (trimmed.length > PHONE_MAX_LENGTH) return 'Телефон слишком длинный'
  const digits = trimmed.replace(/\D+/g, '')
  if (digits.length < PHONE_MIN_DIGITS) return 'Телефон должен содержать цифры'
  return null
}

function validateTelegram(raw: string): string | null {
  const trimmed = raw.trim().replace(/^@+/, '')
  if (!trimmed) return 'Укажите Telegram username'
  if (trimmed.length < TG_MIN_LENGTH) return 'Telegram username слишком короткий'
  if (trimmed.length > TG_MAX_LENGTH) return 'Telegram username слишком длинный'
  return null
}

function validateNotes(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Опишите, что хотите интегрировать'
  if (trimmed.length < NOTES_MIN_LENGTH) return 'Описание слишком короткое'
  if (trimmed.length > NOTES_MAX_LENGTH) return 'Описание слишком длинное'
  return null
}

/**
 * POST /api/submit — приём заявки лендинга «Получить доступ к SDK».
 * Body: { phone: string, telegramUsername: string, integrationNotes: string }
 * Доступен без авторизации (публичная форма).
 * Сохраняет запись в Heap-таблице Leads.
 */
export const submitLeadRoute = app
  .post('/')
  .body((s) => ({
    phone: s.string(),
    telegramUsername: s.string(),
    integrationNotes: s.string()
  }))
  .handle(async (ctx, req) => {
    const phone = String(req.body?.phone ?? '').trim()
    const telegramRaw = String(req.body?.telegramUsername ?? '').trim()
    const notes = String(req.body?.integrationNotes ?? '').trim()

    ctx.account.log(`[${LOG_PATH}] Получена заявка лендинга`, {
      level: 'info',
      json: {
        message: 'Получена заявка лендинга',
        hasPhone: !!phone,
        hasTelegram: !!telegramRaw,
        notesLength: notes.length
      }
    })

    const phoneError = validatePhone(phone)
    const telegramError = validateTelegram(telegramRaw)
    const notesError = validateNotes(notes)

    if (phoneError || telegramError || notesError) {
      const fieldErrors = {
        phone: phoneError,
        telegramUsername: telegramError,
        integrationNotes: notesError
      }
      ctx.account.log(`[${LOG_PATH}] Валидация не пройдена`, {
        level: 'warning',
        json: { message: 'Валидация формы не пройдена', fieldErrors }
      })
      return {
        success: false,
        error: phoneError || telegramError || notesError || 'Заполните форму корректно',
        fieldErrors
      }
    }

    const telegramUsername = telegramRaw.replace(/^@+/, '')
    const submittedAt = Date.now()

    try {
      const created = await Leads.create(ctx, {
        phone,
        telegramUsername,
        integrationNotes: notes,
        submittedAt
      })
      ctx.account.log(`[${LOG_PATH}] Заявка сохранена в Heap`, {
        level: 'info',
        json: { message: 'Заявка сохранена', id: created.id, submittedAt }
      })
      return { success: true, id: created.id }
    } catch (error) {
      ctx.account.log(`[${LOG_PATH}] Ошибка сохранения заявки`, {
        level: 'error',
        json: { message: 'Ошибка сохранения заявки', error: String(error) }
      })
      return { success: false, error: 'Не удалось сохранить заявку. Попробуйте позже.' }
    }
  })

export default submitLeadRoute
