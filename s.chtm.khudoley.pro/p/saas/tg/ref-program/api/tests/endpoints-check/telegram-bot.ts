// @shared-route
import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'
import { getTelegramWebhookUrl } from '../../../config/routes'
import { buildWelcomeMessage, buildStatsMessage } from '../../../lib/telegram/messages'
import type { PartnerRow } from '../../../shared/types'

const LOG_PATH = 'api/tests/endpoints-check/telegram-bot'

/** Ключ настройки для тестового токена бота (официальный тестовый бот — создайте через @BotFather и укажите здесь). */
export const TELEGRAM_TEST_BOT_TOKEN_SETTING = 'telegram_test_bot_token'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const MOCK_PARTNER = {
  id: 'mock-partner-id',
  campaignId: { id: 'mock-campaign-id' },
  tgId: '123456789',
  username: 'test_user',
  fullName: 'Test Partner',
  stats: {
    registrations: 5,
    orders: 3,
    payments: 2,
    paymentsSum: 15000,
    earnings: 3000,
    pendingEarnings: 500
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
} as unknown as PartnerRow

/**
 * GET /api/tests/endpoints-check/telegram-bot — тесты Telegram-бота: URL webhook, сообщения, проверка токена (getMe).
 * Токен для теста отправки берётся из настройки telegram_test_bot_token (создайте бота через @BotFather).
 */
export const telegramBotTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки Telegram-бота`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const testBotId = 'test-bot-id-' + Date.now()
    const webhookUrl = getTelegramWebhookUrl(testBotId)
    const urlOk =
      typeof webhookUrl === 'string' &&
      webhookUrl.length > 0 &&
      webhookUrl.includes(testBotId) &&
      (webhookUrl.includes('hook') || webhookUrl.includes('telegram'))
    results.push({
      id: 'getTelegramWebhookUrl',
      title: 'getTelegramWebhookUrl — URL содержит botId и путь webhook',
      passed: urlOk
    })
    if (!urlOk) {
      results[results.length - 1].error = `URL: ${webhookUrl?.slice(0, 80)}...`
    }
  } catch (e) {
    results.push({
      id: 'getTelegramWebhookUrl',
      title: 'getTelegramWebhookUrl — URL содержит botId и путь webhook',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const welcome = buildWelcomeMessage(
      MOCK_PARTNER,
      'Тестовая кампания',
      'https://example.com/ref?linkId=abc'
    )
    const welcomeOk =
      typeof welcome === 'string' &&
      welcome.length > 0 &&
      welcome.includes('Здравствуйте') &&
      (welcome.includes('Test Partner') || welcome.includes('партнёр')) &&
      welcome.includes('Тестовая кампания') &&
      welcome.includes('Регистраций') &&
      welcome.includes('Заказов')
    results.push({
      id: 'buildWelcomeMessage',
      title: 'buildWelcomeMessage — приветствие, кампания, статистика',
      passed: welcomeOk
    })
    if (!welcomeOk) {
      results[results.length - 1].error = welcome
        ? `нет ожидаемых подстрок в сообщении`
        : 'пустая строка'
    }
  } catch (e) {
    results.push({
      id: 'buildWelcomeMessage',
      title: 'buildWelcomeMessage — приветствие, кампания, статистика',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const stats = buildStatsMessage(MOCK_PARTNER)
    const statsOk =
      typeof stats === 'string' &&
      stats.length > 0 &&
      stats.includes('Регистраций') &&
      stats.includes('Заказов') &&
      (stats.includes('5') || stats.includes('3'))
    results.push({
      id: 'buildStatsMessage',
      title: 'buildStatsMessage — только статистика',
      passed: statsOk
    })
    if (!statsOk) {
      results[results.length - 1].error = stats ? 'нет ожидаемых подстрок' : 'пустая строка'
    }
  } catch (e) {
    results.push({
      id: 'buildStatsMessage',
      title: 'buildStatsMessage — только статистика',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  const token = await settingsLib.getSettingString(
    ctx,
    settingsLib.SETTING_KEYS.TELEGRAM_TEST_BOT_TOKEN
  )
  const tokenTrimmed = typeof token === 'string' ? token.trim() : ''
  const isPlaceholder = !tokenTrimmed || tokenTrimmed === '123456:TEST:TOKEN'
  if (isPlaceholder) {
    results.push({
      id: 'telegram-getMe',
      title: 'Telegram getMe (официальный тестовый токен)',
      passed: false,
      error: `Задайте ${TELEGRAM_TEST_BOT_TOKEN_SETTING} в настройках (токен от @BotFather, замените 123456:TEST:TOKEN)`
    })
  } else {
    try {
      const getMeUrl = `https://api.telegram.org/bot${tokenTrimmed}/getMe`
      const res = await request({
        url: getMeUrl,
        method: 'get',
        responseType: 'json',
        throwHttpErrors: false
      })
      const body = res.body as { ok?: boolean; result?: { username?: string; id?: number } }
      const getMeOk =
        body?.ok === true && body?.result != null && typeof body.result.username === 'string'
      results.push({
        id: 'telegram-getMe',
        title: 'Telegram getMe (официальный тестовый токен)',
        passed: getMeOk
      })
      if (!getMeOk) {
        results[results.length - 1].error =
          body?.ok === false
            ? ((body as { description?: string }).description ?? 'getMe вернул ok: false')
            : 'ожидались ok: true и result.username'
      }
    } catch (e) {
      results.push({
        id: 'telegram-getMe',
        title: 'Telegram getMe (официальный тестовый токен)',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'telegram-bot', results, at: Date.now() }
})
