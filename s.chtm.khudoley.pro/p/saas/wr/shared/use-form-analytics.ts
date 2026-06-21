// @shared
/**
 * Form Analytics Events Tracker
 *
 * События форм для аналитики:
 * - form_shown: автоматический показ формы через WebSocket
 * - form_opened: клик на кнопку формы (ручное открытие)
 * - form_closed: закрытие попапа формы
 * - form_field_focused: первый фокус на поле (начало заполнения)
 * - form_submitted: успешная отправка формы
 * - form_payment_page_opened: переход на страницу оплаты
 * - form_payment_completed: успешная оплата (реальная)
 */

interface FormEventData {
  episodeId: string
  formId: string
  formTitle: string
  formType?: 'lead' | 'payment' | 'redirect'
  amount?: number
  currency?: string
  fieldId?: string
  fieldLabel?: string
  paymentLink?: string
}

export function trackFormEvent(eventType: string, data: FormEventData) {
  if (typeof window === 'undefined' || !window.clrtTrack) {
    console.warn('[Form Analytics] clrtTrack not available')
    return
  }

  const workspacePath =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/')[1] || 'webinar-room'
      : 'webinar-room'

  const trackData: Record<string, any> = {
    url: `event://custom/${workspacePath}/form_${eventType}`,
    action: `form_${eventType}`,
    action_param1: data.episodeId,
    action_param2: data.formId,
    action_param3: data.formTitle,
    action_param1_mapstrstr: {
      formType: data.formType || 'lead',
      ...(data.fieldId && { fieldId: data.fieldId }),
      ...(data.fieldLabel && { fieldLabel: data.fieldLabel })
    }
  }

  if (data.amount && data.currency) {
    trackData.action_param1_float = data.amount
    trackData.action_param1_mapstrstr.currency = data.currency
  }

  window.clrtTrack(trackData)
}

export function trackFormShown(
  episodeId: string,
  formId: string,
  formTitle: string,
  formType?: string
) {
  trackFormEvent('shown', {
    episodeId,
    formId,
    formTitle,
    formType: formType as any
  })
}

export function trackFormOpened(
  episodeId: string,
  formId: string,
  formTitle: string,
  formType?: string
) {
  trackFormEvent('opened', {
    episodeId,
    formId,
    formTitle,
    formType: formType as any
  })
}

export function trackFormClosed(
  episodeId: string,
  formId: string,
  formTitle: string,
  formType?: string
) {
  trackFormEvent('closed', {
    episodeId,
    formId,
    formTitle,
    formType: formType as any
  })
}

export function trackFormFieldFocused(
  episodeId: string,
  formId: string,
  formTitle: string,
  fieldId: string,
  fieldLabel: string
) {
  trackFormEvent('field_focused', {
    episodeId,
    formId,
    formTitle,
    fieldId,
    fieldLabel
  })
}

export function trackFormSubmitted(
  episodeId: string,
  formId: string,
  formTitle: string,
  formType: string,
  amount?: number,
  currency?: string
) {
  trackFormEvent('submitted', {
    episodeId,
    formId,
    formTitle,
    formType: formType as any,
    amount,
    currency
  })
}

export function trackFormPaymentPageOpened(
  episodeId: string,
  formId: string,
  formTitle: string,
  amount: number,
  currency: string
) {
  trackFormEvent('payment_page_opened', {
    episodeId,
    formId,
    formTitle,
    amount,
    currency
  })
}

export function trackFormPaymentCompleted(
  episodeId: string,
  formId: string,
  formTitle: string,
  amount: number,
  currency: string
) {
  trackFormEvent('payment_completed', {
    episodeId,
    formId,
    formTitle,
    amount,
    currency
  })
}
