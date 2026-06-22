// @shared-route
import * as gcLib from '../../lib/getcourse.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/order/create'

/**
 * POST /api/order/create — создание заказа в GetCourse через форму.
 * Body: { name, email, phone?, utmSource?, utmMedium?, utmCampaign?, utmContent?, utmTerm? }
 */
export const createOrderRoute = app.post('/', async (ctx, req) => {
  const body = req.body as Record<string, unknown>

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : undefined
  const offerCode = typeof body.offerCode === 'string' ? body.offerCode.trim() : undefined
  const currency = typeof body.currency === 'string' ? body.currency.trim() : undefined
  const utmSource = typeof body.utmSource === 'string' ? body.utmSource : undefined
  const utmMedium = typeof body.utmMedium === 'string' ? body.utmMedium : undefined
  const utmCampaign = typeof body.utmCampaign === 'string' ? body.utmCampaign : undefined
  const utmContent = typeof body.utmContent === 'string' ? body.utmContent : undefined
  const utmTerm = typeof body.utmTerm === 'string' ? body.utmTerm : undefined

  if (!name || name.length < 2) {
    return { success: false, error: 'Имя должно содержать минимум 2 символа.' }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Укажите корректный email.' }
  }
  if (phone && !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
    return { success: false, error: 'Укажите корректный номер телефона.' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос на создание заказа`,
    payload: { email, hasPhone: Boolean(phone) }
  })

  const [firstName, ...lastNameParts] = name.split(' ')
  const lastName = lastNameParts.join(' ') || undefined

  const result = await gcLib.createDeal(ctx, {
    email,
    firstName,
    lastName,
    phone: phone || undefined,
    offerId,
    offerCode,
    currency,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm
  })

  if (!result.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка создания заказа`,
      payload: { email, error: result.errorMessage }
    })
    return { success: false, error: result.errorMessage || 'Ошибка создания заказа в GetCourse.' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Заказ создан`,
    payload: { email, dealNumber: result.dealNumber, hasPaymentLink: Boolean(result.paymentLink) }
  })

  return {
    success: true,
    paymentUrl: result.paymentLink,
    dealNumber: result.dealNumber
  }
})
