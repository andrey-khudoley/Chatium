import Registrations from '../tables/registrations.table'
import Settings from '../tables/settings.table'
// @ts-ignore
import { captureCustomerEvent, ContactType } from '@crm/sdk'
// @ts-ignore
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
// @ts-ignore
import { writeWorkspaceEvent, getWorkspaceEventUrl } from '@start/sdk'
// @ts-ignore
import { request } from '@app/request'

function toBase64(str: string): string {
  const utf8Bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i)
    if (char < 0x80) {
      utf8Bytes.push(char)
    } else if (char < 0x800) {
      utf8Bytes.push(0xc0 | (char >> 6))
      utf8Bytes.push(0x80 | (char & 0x3f))
    } else if (char < 0xd800 || char >= 0xe000) {
      utf8Bytes.push(0xe0 | (char >> 12))
      utf8Bytes.push(0x80 | ((char >> 6) & 0x3f))
      utf8Bytes.push(0x80 | (char & 0x3f))
    } else {
      i++
      char = 0x10000 + (((char & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      utf8Bytes.push(0xf0 | (char >> 18))
      utf8Bytes.push(0x80 | ((char >> 12) & 0x3f))
      utf8Bytes.push(0x80 | ((char >> 6) & 0x3f))
      utf8Bytes.push(0x80 | (char & 0x3f))
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0
  while (i < utf8Bytes.length) {
    const b1 = utf8Bytes[i++]
    const b2 = i < utf8Bytes.length ? utf8Bytes[i++] : undefined
    const b3 = i < utf8Bytes.length ? utf8Bytes[i++] : undefined
    const bitmap = (b1 << 16) | ((b2 ?? 0) << 8) | (b3 ?? 0)
    result += chars.charAt((bitmap >> 18) & 63)
    result += chars.charAt((bitmap >> 12) & 63)
    result += b2 !== undefined ? chars.charAt((bitmap >> 6) & 63) : '='
    result += b3 !== undefined ? chars.charAt(bitmap & 63) : '='
  }
  return result
}

export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const { name, email, phone, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, clrtUid } =
    req.body

  if (!name || name.trim().length < 2) {
    return ctx.resp.json({ success: false, error: 'Имя должно содержать минимум 2 символа' }, 400)
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return ctx.resp.json({ success: false, error: 'Укажите корректный email' }, 400)
  }

  if (phone && phone.length > 0 && !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
    return ctx.resp.json({ success: false, error: 'Укажите корректный номер телефона' }, 400)
  }

  const registration = await Registrations.create(ctx, {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    utmSource: utmSource || '',
    utmMedium: utmMedium || '',
    utmCampaign: utmCampaign || '',
    utmContent: utmContent || '',
    utmTerm: utmTerm || ''
  })

  await captureCustomerEvent(ctx, {
    event: 'webinar_registration',
    customer: {
      displayName: name
    },
    contacts: [
      ...(email ? [{ type: ContactType.Email, value: email }] : []),
      ...(phone ? [{ type: ContactType.Phone, value: phone }] : [])
    ],
    linkRecords: [registration]
  })

  await writeWorkspaceEvent(ctx, 'webinar_registration', {
    uid: clrtUid || undefined,
    customer_contacts: [
      ...(email ? [{ type: 'email' as const, value: email }] : []),
      ...(phone ? [{ type: 'phone' as const, value: phone }] : [])
    ],
    action_param1: name,
    action_param2: email,
    action_param3: phone,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    action_param1_mapstrstr: {
      utm_content: utmContent || '',
      utm_term: utmTerm || ''
    }
  })

  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая регистрация на вебинар «Жизнь вполсилы»',
    html: `<h3>Новая регистрация на вебинар</h3><p><b>Имя:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Телефон:</b> ${phone || 'не указан'}</p>`,
    plain: `Новая регистрация: ${name}, ${email}, ${phone || 'не указан'}`,
    md: `**Новая регистрация на вебинар**\nИмя: ${name}\nEmail: ${email}\nТелефон: ${phone || 'не указан'}`
  })

  const getcourseResult = await sendToGetcourse(ctx, {
    name,
    email,
    phone,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm
  })

  if (!getcourseResult.success) {
    await writeWorkspaceEvent(ctx, 'getcourse_integration_error', {
      action_param1: name,
      action_param2: email,
      action_param3: getcourseResult.error,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign
    })
  }

  return {
    success: true,
    paymentUrl: getcourseResult.paymentUrl
  }
})

interface GetcoursePayload {
  name: string
  email: string
  phone?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

interface GetcourseResult {
  success: boolean
  error?: string
  paymentUrl?: string
}

function maskSecret(value: string | undefined): string {
  if (!value) return ''
  if (value.length <= 8) return '***'
  return `${value.slice(0, 4)}***${value.slice(-2)}`
}

function logToCtx(ctx: app.Ctx, tag: string, data?: unknown): void {
  if (!ctx.log) return
  if (data === undefined) {
    ctx.log(tag)
    return
  }
  try {
    ctx.log(`${tag} ${JSON.stringify(data)}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'stringify_failed'
    ctx.log(`${tag} {"log_error":"${errorMessage}"}`)
  }
}

async function sendToGetcourse(ctx: app.Ctx, payload: GetcoursePayload): Promise<GetcourseResult> {
  try {
    logToCtx(ctx, 'half:getcourse:start', {
      email: payload.email,
      hasPhone: Boolean(payload.phone),
      utm: {
        source: Boolean(payload.utmSource),
        medium: Boolean(payload.utmMedium),
        campaign: Boolean(payload.utmCampaign),
        content: Boolean(payload.utmContent),
        term: Boolean(payload.utmTerm)
      }
    })

    const accountNameSetting = await Settings.findOneBy(ctx, { key: 'getcourse_account_name' })
    const apiKeySetting = await Settings.findOneBy(ctx, { key: 'getcourse_api_key' })
    const offerCodeSetting = await Settings.findOneBy(ctx, { key: 'getcourse_offer_code' })
    const priceSetting = await Settings.findOneBy(ctx, { key: 'getcourse_price' })
    const utmSourceFieldSetting = await Settings.findOneBy(ctx, {
      key: 'getcourse_utm_source_field'
    })
    const utmMediumFieldSetting = await Settings.findOneBy(ctx, {
      key: 'getcourse_utm_medium_field'
    })
    const utmCampaignFieldSetting = await Settings.findOneBy(ctx, {
      key: 'getcourse_utm_campaign_field'
    })
    const utmContentFieldSetting = await Settings.findOneBy(ctx, {
      key: 'getcourse_utm_content_field'
    })
    const utmTermFieldSetting = await Settings.findOneBy(ctx, { key: 'getcourse_utm_term_field' })

    if (!accountNameSetting?.value) {
      logToCtx(ctx, 'half:getcourse:config-missing', { field: 'getcourse_account_name' })
      return { success: false, error: 'GetCourse account name not configured' }
    }

    if (!apiKeySetting?.value || !offerCodeSetting?.value) {
      logToCtx(ctx, 'half:getcourse:config-missing', {
        hasApiKey: Boolean(apiKeySetting?.value),
        hasOfferCode: Boolean(offerCodeSetting?.value)
      })
      return { success: false, error: 'GetCourse settings not configured' }
    }

    const accountName = accountNameSetting.value
    const apiKey = apiKeySetting.value
    const offerCode = offerCodeSetting.value
    const price = parseFloat(priceSetting?.value || '0')
    const priceIsNaN = Number.isNaN(price)

    logToCtx(ctx, 'half:getcourse:config-loaded', {
      accountName,
      apiKeyMasked: maskSecret(apiKey),
      offerCode,
      rawPrice: priceSetting?.value || '',
      parsedPrice: price,
      priceIsNaN,
      utmFieldMap: {
        source: utmSourceFieldSetting?.value || '',
        medium: utmMediumFieldSetting?.value || '',
        campaign: utmCampaignFieldSetting?.value || '',
        content: utmContentFieldSetting?.value || '',
        term: utmTermFieldSetting?.value || ''
      }
    })

    const [firstName, ...lastNameParts] = payload.name.split(' ')
    const lastName = lastNameParts.join(' ') || ''

    const paramsObj: any = {
      user: {
        email: payload.email,
        first_name: firstName,
        phone: payload.phone || undefined
      },
      system: {
        refresh_if_exists: 1,
        multiple_offers: 1,
        return_payment_link: 1
      },
      session: {} as any,
      deal: {
        offer_code: offerCode
      } as any
    }

    if (lastName) {
      paramsObj.user.last_name = lastName
    }

    if (price > 0) {
      paramsObj.deal.deal_cost = price
    }

    if (payload.utmSource) paramsObj.session.utm_source = payload.utmSource
    if (payload.utmMedium) paramsObj.session.utm_medium = payload.utmMedium
    if (payload.utmCampaign) paramsObj.session.utm_campaign = payload.utmCampaign
    if (payload.utmContent) paramsObj.session.utm_content = payload.utmContent
    if (payload.utmTerm) paramsObj.session.utm_term = payload.utmTerm

    const addfields: Record<string, string> = {}
    if (utmSourceFieldSetting?.value && payload.utmSource) {
      addfields[utmSourceFieldSetting.value] = payload.utmSource
    }
    if (utmMediumFieldSetting?.value && payload.utmMedium) {
      addfields[utmMediumFieldSetting.value] = payload.utmMedium
    }
    if (utmCampaignFieldSetting?.value && payload.utmCampaign) {
      addfields[utmCampaignFieldSetting.value] = payload.utmCampaign
    }
    if (utmContentFieldSetting?.value && payload.utmContent) {
      addfields[utmContentFieldSetting.value] = payload.utmContent
    }
    if (utmTermFieldSetting?.value && payload.utmTerm) {
      addfields[utmTermFieldSetting.value] = payload.utmTerm
    }
    if (Object.keys(addfields).length > 0) {
      paramsObj.deal.addfields = addfields
    }

    const paramsJson = JSON.stringify(paramsObj)
    const paramsBase64 = toBase64(paramsJson)
    const requestUrl = `https://${accountName}.getcourse.ru/pl/api/deals`

    logToCtx(ctx, 'half:getcourse:request-prepared', {
      url: requestUrl,
      action: 'add',
      paramsLength: paramsJson.length,
      paramsBase64Length: paramsBase64.length,
      requestPayload: paramsObj
    })

    const response = await request({
      method: 'post',
      url: requestUrl,
      form: {
        action: 'add',
        key: apiKey,
        params: paramsBase64
      },
      throwHttpErrors: false
    })

    const body = response.body as any
    const topLevelSuccess = body ? String(body.success) : 'undefined'
    const resultSuccess = body?.result ? String(body.result.success) : 'undefined'
    const resultError = body?.result ? String(body.result.error) : 'undefined'

    logToCtx(ctx, 'half:getcourse:response-received', {
      statusCode: response.statusCode,
      bodyType: typeof body,
      topLevelSuccess,
      resultSuccess,
      resultError,
      error: body?.error,
      errorMessage: body?.error_message || body?.result?.error_message,
      responseBody: body
    })

    await writeWorkspaceEvent(ctx, 'getcourse_api_debug', {
      action_param1: payload.email,
      action_param2: offerCode,
      action_param1_int: response.statusCode,
      action_param1_mapstrstr: {
        request_params: paramsJson,
        response_body: JSON.stringify(body)
      }
    })

    const isTopLevelSuccess = body && String(body.success) === 'true'
    const isResultSuccess = body?.result && String(body.result.success) === 'true'
    const hasResultError = body?.result && String(body.result.error) === 'true'

    if (isTopLevelSuccess && isResultSuccess && !hasResultError) {
      let paymentUrl: string | undefined
      if (price > 0 && body.result && body.result.payment_link) {
        paymentUrl = body.result.payment_link
      }

      await writeWorkspaceEvent(ctx, 'getcourse_integration_success', {
        action_param1: payload.email,
        action_param2: offerCode,
        action_param1_float: price,
        action_param1_mapstrstr: {
          has_payment_url: paymentUrl ? 'true' : 'false',
          payment_url: paymentUrl || ''
        }
      })

      logToCtx(ctx, 'half:getcourse:success', {
        email: payload.email,
        offerCode,
        price,
        hasPaymentUrl: Boolean(paymentUrl)
      })

      return { success: true, paymentUrl }
    } else {
      const errorMessage =
        body?.result?.error_message || body?.error_message || body?.error || JSON.stringify(body)
      logToCtx(ctx, 'half:getcourse:api-error', {
        email: payload.email,
        offerCode,
        statusCode: response.statusCode,
        errorMessage,
        topLevelSuccess,
        resultSuccess,
        resultError
      })
      await writeWorkspaceEvent(ctx, 'getcourse_api_error', {
        action_param1: payload.email,
        action_param2: offerCode,
        action_param3: errorMessage,
        action_param1_int: response.statusCode,
        action_param1_mapstrstr: {
          response_body: JSON.stringify(body),
          request_params: paramsJson
        }
      })
      return { success: false, error: errorMessage }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logToCtx(ctx, 'half:getcourse:exception', {
      email: payload.email,
      errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    await writeWorkspaceEvent(ctx, 'getcourse_integration_exception', {
      action_param1: payload.email,
      action_param3: errorMessage
    })
    return { success: false, error: errorMessage }
  }
}

app.accountHook('@start/account-events', async (ctx) => {
  return [
    {
      name: 'Регистрация на вебинар «Жизнь вполсилы»',
      description: 'Посетитель зарегистрировался на вебинар через лендинг',
      url: await getWorkspaceEventUrl(ctx, 'webinar_registration'),
      icon: '📅',
      category: 'bookings',
      payloadMapping: {
        name: { title: 'Имя', fieldName: 'action_param1', type: 'string' },
        email: { title: 'Email', fieldName: 'action_param2', type: 'string' },
        phone: { title: 'Телефон', fieldName: 'action_param3', type: 'string' }
      }
    }
  ]
})
