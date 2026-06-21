// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as botRepo from '../../../lib/repo/botRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'
import Bots from '../../../tables/bots.table'
import BotUpdates from '../../../tables/bot_updates.table'
import type { TelegramUpdate } from '../../../shared/types'

const LOG_PATH = 'api/tests/endpoints-check/bot-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/bot-repo — тесты репозитория ботов (getBotById, saveUpdate).
 */
export const botRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    ctx.account.log(`[${LOG_PATH}] Нет пользователя в контексте`, { level: 'warn', json: {} })
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки botRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let botId: string | null = null

  try {
    const campaign = await campaignRepo.createCampaign(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId
    })
    campaignId = campaign?.id ?? null

    if (!campaignId) {
      ctx.account.log(`[${LOG_PATH}] Кампания не создана`, { level: 'warn', json: {} })
      pushSkipped(results, 'Кампания не создана')
    } else {
      const bot = await Bots.create(ctx, {
        campaignId,
        tokenEncrypted: 'test-token-' + Date.now(),
        tgBotId: 'test_bot_' + Date.now(),
        username: 'test_bot',
        title: 'Test Bot',
        webhookUrl: null,
        webhookStatus: null
      })
      botId = bot?.id ?? null

      if (!botId) {
        ctx.account.log(`[${LOG_PATH}] Бот не создан`, { level: 'warn', json: {} })
        pushSkipped(results, 'Бот не создан')
      } else {
        try {
          const found = await botRepo.getBotById(ctx, botId)
          const getByIdOk =
            found != null && found.id === botId && found.campaignId?.id === campaignId
          results.push({
            id: 'getBotById-found',
            title: 'getBotById (найден)',
            passed: getByIdOk
          })
          if (!getByIdOk) {
            const err = found ? 'id или campaignId не совпадают' : 'бот не найден'
            results[results.length - 1].error = err
            ctx.account.log(`[${LOG_PATH}] getBotById-found: ${err}`, {
              level: 'warn',
              json: { testId: 'getBotById-found', error: err }
            })
          }
        } catch (e) {
          const errMsg = (e as Error)?.message ?? String(e)
          ctx.account.log(`[${LOG_PATH}] getBotById-found exception: ${errMsg}`, {
            level: 'error',
            json: { testId: 'getBotById-found', error: errMsg, stack: (e as Error)?.stack }
          })
          results.push({
            id: 'getBotById-found',
            title: 'getBotById (найден)',
            passed: false,
            error: errMsg
          })
        }

        try {
          const notFound = await botRepo.getBotById(ctx, 'nonexistent-bot-id-xyz-' + Date.now())
          results.push({
            id: 'getBotById-notFound',
            title: 'getBotById (не найден)',
            passed: notFound === null
          })
          if (notFound !== null) {
            results[results.length - 1].error = 'ожидался null'
            ctx.account.log(`[${LOG_PATH}] getBotById-notFound: ожидался null`, {
              level: 'warn',
              json: { testId: 'getBotById-notFound' }
            })
          }
        } catch (e) {
          const errMsg = (e as Error)?.message ?? String(e)
          ctx.account.log(`[${LOG_PATH}] getBotById-notFound exception: ${errMsg}`, {
            level: 'error',
            json: { testId: 'getBotById-notFound', error: errMsg }
          })
          results.push({
            id: 'getBotById-notFound',
            title: 'getBotById (не найден)',
            passed: false,
            error: errMsg
          })
        }

        const mockUpdate: TelegramUpdate = {
          update_id: 1000 + Math.floor(Math.random() * 10000),
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
              username: 'test_user'
            },
            chat: { id: 123456789, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        }

        try {
          await botRepo.saveUpdate(ctx, botId, mockUpdate)
          const updates = await BotUpdates.findAll(ctx, {
            where: { botId },
            limit: 10
          })
          const saveOk =
            updates.length >= 1 &&
            updates.some(
              (u) =>
                u.updateId === mockUpdate.update_id &&
                u.updateType === 'message' &&
                (u.tgUserId === '123456789' || u.payloadJson != null)
            )
          results.push({
            id: 'saveUpdate',
            title: 'saveUpdate (запись апдейта в bot_updates)',
            passed: saveOk
          })
          if (!saveOk) {
            const err =
              updates.length === 0
                ? 'запись в bot_updates не создана'
                : 'updateId/updateType/tgUserId не совпадают'
            results[results.length - 1].error = err
            ctx.account.log(`[${LOG_PATH}] saveUpdate: ${err}`, {
              level: 'warn',
              json: { testId: 'saveUpdate', error: err }
            })
          }
        } catch (e) {
          const errMsg = (e as Error)?.message ?? String(e)
          ctx.account.log(`[${LOG_PATH}] saveUpdate exception: ${errMsg}`, {
            level: 'error',
            json: { testId: 'saveUpdate', error: errMsg }
          })
          results.push({
            id: 'saveUpdate',
            title: 'saveUpdate (запись апдейта в bot_updates)',
            passed: false,
            error: errMsg
          })
        }
      }
    }
  } finally {
    if (campaignId) {
      if (botId) {
        const updates = await BotUpdates.findAll(ctx, { where: { botId }, limit: 500 })
        for (const u of updates) {
          try {
            await BotUpdates.delete(ctx, u.id)
          } catch (_) {}
        }
        try {
          await Bots.delete(ctx, botId)
        } catch (_) {}
      }
      const members = await CampaignMembers.findAll(ctx, {
        where: { campaignId },
        limit: 100
      })
      for (const m of members) {
        try {
          await CampaignMembers.delete(ctx, m.id)
        } catch (_) {}
      }
      try {
        await Campaigns.delete(ctx, campaignId)
      } catch (_) {}
    }
  }

  const failed = results.filter((r) => !r.passed)
  if (failed.length > 0) {
    ctx.account.log(
      `[${LOG_PATH}] Пройдено ${results.filter((r) => r.passed).length}/${results.length}, упало: ${failed.map((r) => r.id).join(', ')}`,
      {
        level: 'warn',
        json: { failed: failed.map((r) => ({ id: r.id, error: r.error })) }
      }
    )
  }
  await loggerLib.writeServerLog(ctx, {
    severity: failed.length > 0 ? 4 : 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'bot-repo', results, at: Date.now() }
})

function pushSkipped(results: TestResult[], reason: string): void {
  const ids = ['getBotById-found', 'getBotById-notFound', 'saveUpdate']
  const titles: Record<string, string> = {
    'getBotById-found': 'getBotById (найден)',
    'getBotById-notFound': 'getBotById (не найден)',
    saveUpdate: 'saveUpdate (запись апдейта в bot_updates)'
  }
  for (const id of ids) {
    results.push({ id, title: titles[id], passed: false, error: reason })
  }
}
