import { findUserById, requireAnyUser } from '@app/auth'
import { s } from '@app/schema'
import { runAttemptPayment, validateCaller } from '@pay/sdk'
import { getWorkspaceEventUrl, writeWorkspaceEvent } from '@start/sdk'
import { reporterApp } from '../shared/error-handler-middleware'
import { FormSubmitAction } from '../shared/enum'
import EpisodeForms from '../tables/episode_forms.table'
import FormSubmissions from '../tables/form_submissions.table'
import { paymentSuccessRoute } from '../payment-success'

// @shared-route
export const apiFormCreatePaymentRoute = reporterApp
  .body((s) => ({
    submissionId: s.string(),
    providerId: s.string().optional()
  }))
  .post('/create-payment', async (ctx, req) => {
    await requireAnyUser(ctx)

    const submission = await FormSubmissions.findById(ctx, req.body.submissionId)
    if (!submission) throw new Error('Заявка не найдена')

    const form = submission.form?.id ? await EpisodeForms.findById(ctx, submission.form.id) : null
    if (!form) throw new Error('Форма не найдена')

    if (form.submitAction !== FormSubmitAction.Payment) {
      throw new Error('Эта форма не требует оплаты')
    }

    const formData = submission.data || {}

    // Определяем цену и описание из выбранного тарифа
    let finalAmount = formData.selected_price
    let finalDescription = form.paymentDescription || `Оплата: ${form.title}`
    if (formData.selected_tariff && form.paymentOptions) {
      const opt = form.paymentOptions.find((o: any) => o.id === formData.selected_tariff)
      if (opt) {
        if (!finalAmount) finalAmount = opt.price
        if (opt.title) finalDescription = opt.title
      }
    }

    if (!finalAmount || finalAmount <= 0) {
      throw new Error('Сумма оплаты не указана')
    }

    const paymentResult = await runAttemptPayment(ctx, {
      subject: submission,
      amount: [finalAmount, (form.paymentCurrency || 'RUB') as any],
      description: finalDescription,
      providerId: req.body.providerId || undefined,
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
          name: finalDescription,
          quantity: 1,
          price: finalAmount
        }
      ],
      payload: {
        submissionId: submission.id,
        formId: form.id,
        formTitle: form.title,
        episodeId: submission.episode?.id,
        formData,
        uid: req.cookies?.['x-chtm-uid']
      },
      successUrl: paymentSuccessRoute({ submissionId: submission.id }).url(),
      successCallbackRoute: formPaymentSuccessRoute
    })

    if (paymentResult.success && paymentResult.result.paymentLink) {
      return {
        success: true,
        paymentLink: paymentResult.result.paymentLink
      }
    } else {
      return {
        success: false,
        error: !paymentResult.success ? paymentResult.error : 'Не удалось создать платёж'
      }
    }
  })

export const formPaymentSuccessRoute = app.function(
  '/form-payment-success',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)
    const { attempt, payment } = params

    const submissionId = attempt.payload?.submissionId
    const uid = attempt.payload?.uid

    if (!submissionId) {
      ctx.account.log('@webinar-room formPaymentSuccessRoute: submissionId is missing in payload', {
        level: 'warn',
        json: { attemptPayload: attempt.payload }
      })
      return { success: false }
    }

    // Запись события успешной оплаты в аналитику и обновление submission
    const submission = await FormSubmissions.findById(ctx, submissionId)
    if (submission) {
      // Обновляем submission с ID платежа
      await FormSubmissions.update(ctx, {
        id: submission.id,
        paymentId: payment.id
      })

      const form = submission.form?.id ? await EpisodeForms.findById(ctx, submission.form.id) : null
      const episodeId = submission.episode?.id || submission.autowebinar?.id

      if (form && episodeId) {
        const amount = payment.amount?.amount || 0
        const currency = payment.amount?.currency || 'RUB'
        const userId = submission.user?.id || payment.user?.id

        // Записываем событие через writeWorkspaceEvent для аналитики
        const user = userId ? await findUserById(ctx, userId) : undefined

        await writeWorkspaceEvent(ctx, 'webinar_form_payment_completed', {
          user: user,
          action_param1: episodeId,
          action_param2: form.id,
          action_param3: form.title,
          action_param1_float: amount,
          action_param1_mapstrstr: { currency },
          uid: uid || undefined
        })

        // Отправляем дополнительное событие в зависимости от выбранного тарифа (по ID)
        const selectedTariff = submission.data?.selected_tariff

        if (selectedTariff) {
          let tariffEventName: string | null = null

          // Проверяем только по жёстким ID тарифов
          if (selectedTariff === 'year') {
            tariffEventName = 'webinar_tariff_yearly_paid'
          } else if (selectedTariff === 'month') {
            tariffEventName = 'webinar_tariff_monthly_paid'
          } else {
            console.log('❌ [TARIFF NOT MATCHED] Unknown tariff:', selectedTariff)
          }

          if (tariffEventName) {
            await writeWorkspaceEvent(ctx, tariffEventName, {
              user: userId ? { id: userId } : undefined,
              action_param1: episodeId,
              action_param2: form.id,
              action_param3: form.title,
              action_param1_float: amount,
              action_param1_mapstrstr: {
                currency,
                tariff: selectedTariff,
                paymentId: payment.id // ✅ Передаём paymentId через mapstrstr
              },
              uid: uid || undefined
            })
          } else {
            console.log('⚠️ [NO EVENT] tariffEventName is null')
            ctx.account.log('[TARIFF EVENT] No tariffEventName determined', {
              level: 'warn',
              json: { selectedTariff }
            })
          }
        } else {
          console.log('⚠️ [NO TARIFF] selectedTariff is empty/undefined')
          ctx.account.log('[TARIFF EVENT] No selectedTariff in submission.data', {
            level: 'warn',
            json: { submissionData: submission.data }
          })
        }

        // Событие для формы "Шаблон вебинарной комнаты"
        const WEBINAR_ROOM_TEMPLATE_FORM_ID = 'hHKb4AYne71RgU9wIyj0000ru'
        if (form.id === WEBINAR_ROOM_TEMPLATE_FORM_ID) {
          await writeWorkspaceEvent(ctx, 'webinar_room_template_paid', {
            user: userId ? { id: userId } : undefined,
            action_param1: episodeId,
            action_param2: form.id, // formId
            action_param3: form.title,
            action_param1_float: amount,
            action_param1_mapstrstr: {
              currency,
              paymentId: payment.id // paymentId
            },
            uid: uid || undefined
          })
        }
      } else {
        ctx.account.log('@webinar-room no form or episodeId in success callback fn', {
          json: {
            attemptPayload: attempt.payload,
            formSubmission: submission
          }
        })
      }
    } else {
      ctx.account.log('@webinar-room submission not found in success callback fn', {
        json: { attemptPayload: attempt.payload }
      })
    }

    return { success: true }
  }
)

app.accountHook('@start/account-events', async (ctx, params) => {
  return [
    {
      name: 'Заполнена форма во время эфира',
      description: 'Зритель заполнил форму, показанную администратором во время эфира',
      url: await getWorkspaceEventUrl(ctx, 'webinar_form_submitted'),
      icon: '📝',
      category: 'forms',
      payloadMapping: {
        formTitle: {
          title: 'Название формы',
          fieldName: 'action_param1',
          type: 'string'
        },
        contact: {
          title: 'Email/Телефон',
          fieldName: 'action_param2',
          type: 'string'
        },
        name: {
          title: 'Имя',
          fieldName: 'action_param3',
          type: 'string'
        }
      }
    },
    {
      name: 'Оплачена форма после эфира',
      description: 'Зритель успешно оплатил заказ после заполнения формы',
      url: await getWorkspaceEventUrl(ctx, 'webinar_form_payment_completed'),
      icon: '💰',
      category: 'forms',
      payloadMapping: {
        episodeId: {
          title: 'ID эфира',
          fieldName: 'action_param1',
          type: 'string'
        },
        formId: {
          title: 'ID формы',
          fieldName: 'action_param2',
          type: 'string'
        },
        formTitle: {
          title: 'Название формы',
          fieldName: 'action_param3',
          type: 'string'
        },
        amount: {
          title: 'Сумма оплаты',
          fieldName: 'action_param1_float',
          type: 'number'
        }
      }
    }
  ]
})
