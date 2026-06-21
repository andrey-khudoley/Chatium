/**
 * Серверный геттер виджет-конфигурации.
 *
 * Читает виджет-ключи из таблицы `settings` через общий `getSetting`,
 * приводит к типизированному объекту `WidgetSettingsData` (boolean / number /
 * AllowedOffer[]). Используется страницей `/web/admin` для SSR-пропов и
 * виджетными API-эндпоинтами (`config`, `intent-*`).
 *
 * Стратегия чтения offers: новый ключ `widget_*_offers` (AllowedOffer[]);
 * если он пустой ('[]' или нет записи) — fallback на legacy `widget_*_offer_ids`
 * (string[]). `parseAllowedOffers` понимает оба формата.
 */

import * as settingsLib from '../settings.lib'
import {
  parseAllowedOffers,
  parseOfferListType,
  type WidgetSettingsData
} from '../../shared/widgetSettingsTypes'

/** Безопасно парсит min/max сумму. Любая ошибка → 0 (без ограничения). */
function parseAmountSetting(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw)
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 0
}

/**
 * Возвращает raw-строку для parseAllowedOffers с учётом fallback.
 * Если новый ключ содержит непустой массив — берём его. Иначе — legacy.
 */
function pickOffersRaw(newRaw: unknown, legacyRaw: unknown): unknown {
  if (typeof newRaw === 'string' && newRaw.trim() !== '' && newRaw.trim() !== '[]') {
    return newRaw
  }
  return legacyRaw
}

function hasConfiguredValue(raw: unknown): boolean {
  return typeof raw === 'string' ? raw.trim().length > 0 : raw !== undefined && raw !== null
}

function parseOptionalBoolean(raw: unknown): boolean | null {
  if (raw === true || raw === 'true') return true
  if (raw === false || raw === 'false') return false
  return null
}

export function resolveWidgetMethodEnabled(
  storedEnabledRaw: unknown,
  pluginConfigured: boolean
): boolean {
  if (!pluginConfigured) return false
  return parseOptionalBoolean(storedEnabledRaw) ?? true
}

/**
 * Читает все виджет-настройки одной выборкой и возвращает типизированный
 * объект. Не логирует значения (идентификаторы офферов потенциально чувствительны).
 */
export async function getWidgetSettings(ctx: app.Ctx): Promise<WidgetSettingsData> {
  // Параллельное чтение ключей — Promise.all сокращает latency до одного раунд-трипа.
  const [
    lifepayEnabledRaw,
    lifepayMinRaw,
    lifepayMaxRaw,
    lifepayOfferListTypeRaw,
    lifepayOffersRaw,
    lifepayOfferIdsRaw,
    lifepayApiKeyRaw,
    lifepayLoginRaw,
    lifepayWebhookTokenRaw,
    lavatopEnabledRaw,
    lavatopMinRaw,
    lavatopMaxRaw,
    lavatopOfferListTypeRaw,
    lavatopOffersRaw,
    lavatopOfferIdsRaw,
    lavatopApiKeyRaw,
    lavatopWebhookSecretRaw,
    lavatopProductIdRaw,
    lavatopOfferIdRaw
  ] = await Promise.all([
    settingsLib.getStoredSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_ENABLED),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_MIN),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_MAX),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_OFFER_LIST_TYPE),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_OFFERS),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_OFFER_IDS),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LP_APIKEY),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LP_LOGIN),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LP_WEBHOOK_TOKEN),
    settingsLib.getStoredSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_ENABLED),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_MIN),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_MAX),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_OFFER_LIST_TYPE),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_OFFERS),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_OFFER_IDS),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LAVA_TEST_APIKEY),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LAVA_WEBHOOK_SECRET),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID),
    settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID)
  ])

  const lifepayConfigured =
    hasConfiguredValue(lifepayApiKeyRaw) &&
    hasConfiguredValue(lifepayLoginRaw) &&
    hasConfiguredValue(lifepayWebhookTokenRaw)
  const lavatopConfigured =
    hasConfiguredValue(lavatopApiKeyRaw) &&
    hasConfiguredValue(lavatopWebhookSecretRaw) &&
    hasConfiguredValue(lavatopProductIdRaw) &&
    hasConfiguredValue(lavatopOfferIdRaw)

  return {
    lifepayEnabled: resolveWidgetMethodEnabled(lifepayEnabledRaw, lifepayConfigured),
    lifepayMin: parseAmountSetting(lifepayMinRaw),
    lifepayMax: parseAmountSetting(lifepayMaxRaw),
    lifepayOfferListType: parseOfferListType(lifepayOfferListTypeRaw),
    lifepayOffers: parseAllowedOffers(pickOffersRaw(lifepayOffersRaw, lifepayOfferIdsRaw)),
    lavatopEnabled: resolveWidgetMethodEnabled(lavatopEnabledRaw, lavatopConfigured),
    lavatopMin: parseAmountSetting(lavatopMinRaw),
    lavatopMax: parseAmountSetting(lavatopMaxRaw),
    lavatopOfferListType: parseOfferListType(lavatopOfferListTypeRaw),
    lavatopOffers: parseAllowedOffers(pickOffersRaw(lavatopOffersRaw, lavatopOfferIdsRaw))
  }
}
