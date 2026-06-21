// @shared

import { requireAccountRole, requireAnyUser } from '@app/auth'
import { s } from '@app/schema'
import { sendDataToSocket } from '@app/socket'
import { reporterApp } from '../shared/error-handler-middleware'
import { FormSubmitAction } from '../shared/enum'
import EpisodeForms from '../tables/episode_forms.table'
import FormSubmissions from '../tables/form_submissions.table'
import Episodes from '../tables/episodes.table'
import { captureCustomerEvent, ContactType } from '@crm/sdk'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { runAttemptPayment } from '@pay/sdk'
import { getAllPaymentProviders } from '@pay/sdk'

import { formPaymentSuccessRoute } from './forms-payment'

// @shared-route
export const apiPaymentProvidersRoute = reporterApp.get('/payment-providers', async (ctx, req) => {
  const result = await getAllPaymentProviders(ctx)
  return {
    configured: (result.configured || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      iconUrl: p.icon || null,
      isDefault: p.isDefault || false
    })),
    notConfigured: (result.notConfigured || []).map((p: any) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      iconUrl: p.icon || null
    }))
  }
})

// @shared-route
export const apiFormByIdRoute = reporterApp.get('/by-id/:id', async (ctx, req) => {
  const form = await EpisodeForms.findById(ctx, req.params.id as string)
  if (!form) throw new Error('Форма не найдена')
  return form
})

// @shared-route
export const apiFormSubmissionByIdRoute = reporterApp.get('/submission/:id', async (ctx, req) => {
  const submission = await FormSubmissions.findById(ctx, req.params.id as string)
  if (!submission) throw new Error('Заявка не найдена')

  const formId = submission.form?.id
  if (!formId) throw new Error('Форма не найдена')

  const form = await EpisodeForms.findById(ctx, formId)
  if (!form) throw new Error('Форма не найдена')

  const providers = await getAllPaymentProviders(ctx)

  // Если пользователь выбрал конкретный тариф — подменяем цену на актуальную
  let actualForm = { ...form }
  if (submission.data?.selected_tariff && form.paymentOptions) {
    const selectedOption = form.paymentOptions.find(
      (opt: any) => opt.id === submission.data.selected_tariff
    )
    if (selectedOption) {
      actualForm.paymentAmount = selectedOption.price
      actualForm.paymentOldPrice = selectedOption.oldPrice || null
      actualForm.paymentDescription = selectedOption.title || form.paymentDescription
    }
  }

  return {
    submission: {
      id: submission.id,
      formId: submission.form?.id,
      episodeId: submission.episode?.id,
      autowebinarId: submission.autowebinar?.id,
      data: submission.data,
      paymentId: submission.paymentId
    },
    form: actualForm,
    configured: (providers.configured || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      iconUrl: p.icon || null
    }))
  }
})

// Показать форму на конкретном эфире — добавляем formId в shownFormIds эпизода
// @shared-route
export const apiFormShowRoute = reporterApp
  .body((s) => ({
    formId: s.string(),
    episodeId: s.string()
  }))
  .post('/show', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const form = await EpisodeForms.findById(ctx, req.body.formId)
    if (!form) throw new Error('Форма не найдена')

    const episode = await Episodes.findById(ctx, req.body.episodeId)
    if (!episode) throw new Error('Эфир не найден')

    // Явная проверка: формы можно показывать только на live-эфирах (не автовебинарах)
    if (episode.status !== 'waiting_room' && episode.status !== 'live') {
      throw new Error('Формы можно показывать только во время эфира (waiting_room или live)')
    }

    const currentIds: string[] = Array.isArray(episode.shownFormIds) ? episode.shownFormIds : []
    if (!currentIds.includes(form.id)) {
      await Episodes.update(ctx, {
        id: episode.id,
        shownFormIds: [...currentIds, form.id]
      })
    }

    const episodeSocketId = `episode_${req.body.episodeId}`
    await sendDataToSocket(ctx, episodeSocketId, {
      type: 'show_custom_form',
      formId: form.id
    })

    return { success: true }
  })

// Скрыть форму на конкретном эфире — убираем formId из shownFormIds эпизода
// @shared-route
export const apiFormHideRoute = reporterApp
  .body((s) => ({
    formId: s.string(),
    episodeId: s.string()
  }))
  .post('/hide', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const episode = await Episodes.findById(ctx, req.body.episodeId)
    if (!episode) throw new Error('Эфир не найден')

    // Явная проверка: формы можно скрывать только на live-эфирах
    if (episode.status !== 'waiting_room' && episode.status !== 'live') {
      throw new Error('Формы можно скрывать только во время эфира (waiting_room или live)')
    }

    const currentIds: string[] = Array.isArray(episode.shownFormIds) ? episode.shownFormIds : []
    await Episodes.update(ctx, {
      id: episode.id,
      shownFormIds: currentIds.filter((id) => id !== req.body.formId)
    })

    return { success: true }
  })

// Получить показанные формы для эфира — по shownFormIds из эпизода
// @shared-route
export const apiFormGetShownRoute = reporterApp.get('/shown/:episodeId', async (ctx, req) => {
  const episode = await Episodes.findById(ctx, req.params.episodeId as string)
  if (!episode) return []

  const shownIds: string[] = Array.isArray(episode.shownFormIds) ? episode.shownFormIds : []
  if (shownIds.length === 0) return []

  const forms = await EpisodeForms.findAll(ctx, {
    where: { id: shownIds },
    order: [{ sortOrder: 'asc' }],
    limit: 50
  })

  return forms
})

// @shared-route
export const apiFormSubmitRoute = reporterApp
  .body((s) => ({
    formId: s.string(),
    episodeId: s.string().optional(),
    autowebinarId: s.string().optional(),
    data: s.any(),
    selectedTariff: s.string().optional(),
    selectedPrice: s.number().optional()
  }))
  .post('/submit', async (ctx, req) => {
    await requireAnyUser(ctx)

    const form = await EpisodeForms.findById(ctx, req.body.formId)
    if (!form) throw new Error('Форма не найдена')

    const submissionData = {
      ...req.body.data
    }

    // Добавляем информацию о выбранном тарифе если есть
    if (req.body.selectedTariff) {
      submissionData['selected_tariff'] = req.body.selectedTariff
    }
    if (req.body.selectedPrice) {
      submissionData['selected_price'] = req.body.selectedPrice
    }

    const submission = await FormSubmissions.create(ctx, {
      form: form.id,
      episode: req.body.episodeId || undefined,
      autowebinar: req.body.autowebinarId || undefined,
      user: ctx.user?.id,
      data: submissionData
    })

    const formData = req.body.data || {}

    // Собираем уникальные контакты
    const contactsMap = new Map<string, { type: string; value: string }>()

    if (formData.email) {
      contactsMap.set(`email:${formData.email}`, { type: ContactType.Email, value: formData.email })
    }
    if (formData.phone) {
      contactsMap.set(`phone:${formData.phone}`, { type: ContactType.Phone, value: formData.phone })
    }
    if (ctx.user?.confirmedEmail) {
      contactsMap.set(`email:${ctx.user.confirmedEmail}`, {
        type: ContactType.Email,
        value: ctx.user.confirmedEmail
      })
    }
    if (ctx.user?.confirmedPhone) {
      contactsMap.set(`phone:${ctx.user.confirmedPhone}`, {
        type: ContactType.Phone,
        value: ctx.user.confirmedPhone
      })
    }

    const contacts = Array.from(contactsMap.values())

    // Отправляем событие в CRM всегда (даже без контактов запись submission полезна для аналитики)
    await captureCustomerEvent(ctx, {
      event: 'webinar_form_submitted',
      customer: {
        displayName: formData.name || formData.firstName || ctx.user?.displayName
      },
      contacts: contacts.length > 0 ? contacts : undefined,
      appendUserContacts: ctx.user?.id,
      linkRecords: [submission],
      payload: {
        formId: form.id,
        formTitle: form.title,
        episodeId: req.body.episodeId,
        formData
      }
    })

    const fieldsSummary = Object.entries(formData)
      .map(([k, v]) => `<b>${k}:</b> ${v}`)
      .join('<br/>')

    await sendNotificationToAccountOwners(ctx, {
      title: `📝 Форма «${form.title}» заполнена`,
      html: `<h3>Форма «${form.title}» заполнена</h3><p>${fieldsSummary}</p>`,
      plain: `Форма «${form.title}» заполнена: ${JSON.stringify(formData)}`,
      md: `📝 Форма **${form.title}** заполнена\n${Object.entries(formData)
        .map(([k, v]) => `**${k}:** ${v}`)
        .join('\n')}`
    })

    if (form.submitAction === FormSubmitAction.Payment) {
      let finalAmount = req.body.selectedPrice || form.paymentAmount

      // Определяем описание для выбранного тарифа
      let selectedDescription = form.paymentDescription || `Оплата: ${form.title}`
      if (submissionData.selected_tariff && form.paymentOptions) {
        const selectedOpt = form.paymentOptions.find(
          (opt: any) => opt.id === submissionData.selected_tariff
        )
        if (selectedOpt?.title) {
          selectedDescription = selectedOpt.title
        }
      }

      if (finalAmount && finalAmount > 0) {
        // Проверяем количество доступных провайдеров
        const allProviders = await getAllPaymentProviders(ctx)
        const configured = allProviders.configured || []

        // Фильтруем провайдеров как на странице оплаты
        let availableProviders = configured
        if (form.paymentProviders && form.paymentProviders.length > 0) {
          availableProviders = configured.filter(
            (p: any) =>
              form.paymentProviders.includes(p.id) || form.paymentProviders.includes(p.slug)
          )
        }

        // Если ровно 1 провайдер — сразу создаём платёж без промежуточной страницы
        if (availableProviders.length === 1) {
          const providerId = availableProviders[0].id
          const { paymentSuccessRoute } = await import('../payment-success')

          const paymentResult = await runAttemptPayment(ctx, {
            subject: submission,
            amount: [finalAmount, (form.paymentCurrency || 'RUB') as any],
            description: selectedDescription,
            providerId,
            user: ctx.user ? { id: ctx.user.id } : undefined,
            session: ctx.session,
            customer: {
              firstName: formData.name || formData.firstName || ctx.user?.firstName,
              email: formData.email || ctx.user?.confirmedEmail,
              phone: formData.phone || ctx.user?.confirmedPhone
            },
            items: [
              {
                id: form.id,
                name: selectedDescription,
                quantity: 1,
                price: finalAmount
              }
            ],
            payload: {
              submissionId: submission.id,
              formId: form.id,
              formTitle: form.title,
              episodeId: req.body.episodeId,
              formData,
              uid: req.cookies?.['x-chtm-uid']
            },
            successUrl: paymentSuccessRoute({ submissionId: submission.id }).url(),
            successCallbackRoute: formPaymentSuccessRoute
          })

          if (paymentResult.success && paymentResult.result.paymentLink) {
            return {
              success: true,
              submissionId: submission.id,
              action: 'direct_payment',
              paymentLink: paymentResult.result.paymentLink
            }
          }
          // Если не удалось — fallback на страницу выбора
        }

        const { paymentMethodRoute } = await import('../payment-method')
        return {
          success: true,
          submissionId: submission.id,
          action: 'payment',
          paymentMethodUrl: paymentMethodRoute({ submissionId: submission.id }).url()
        }
      }
    }

    if (form.submitAction === FormSubmitAction.Redirect && form.redirectUrl) {
      return {
        success: true,
        submissionId: submission.id,
        action: 'redirect',
        redirectUrl: form.redirectUrl
      }
    }

    return {
      success: true,
      submissionId: submission.id,
      action: 'thank_you',
      thankYouTitle: form.thankYouTitle || 'Спасибо!',
      thankYouText: form.thankYouText || 'Ваша заявка принята'
    }
  })
