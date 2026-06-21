/* ========================================================================
 * Payments Client userscript common — общие утилиты для встраиваемых виджетов
 * LifePay и Lava.Top на сторонних страницах магазина.
 *
 * Скрипт регистрирует объект `window.GwWidgetCommon` с pure-функциями:
 *   - safeInit(fn)                        — глобальный try/catch вокруг инициализации
 *   - isAmountInRange(amount, min, max)    — клиентский фильтр по диапазону суммы
 *   - extractDealPositions()              — извлечение id позиций заказа из DOM (.deal-positions li)
 *   - areAllPositionsAllowed(pos, offers, type) — клиентский фильтр всех позиций по off/white/blacklist (по id)
 *   - fetchWidgetConfig(baseUrl, payload)  — POST /api/widgets/config с телом { dealId, positions }
 *   - extractDealIdFromUrl()              — id заказа из URL страницы GC
 *   - postWidgetIntentByDeal(baseUrl, p)  — POST /api/widgets/intent-by-deal
 *   - createModal(el, onClose?)           — оверлей-модалка без внешних CSS
 *
 * Подключение: вставить тег <script> с этим файлом перед тегом конкретного
 * виджета (`lifepay-widget.user.js` или `lavatop-widget.user.js`). Файл не
 * выполняет никаких side-effects сам по себе.
 *
 * Зависимости: нет (vanilla JS, без TypeScript). Совместимо с ES5+ браузерами.
 * Файл намеренно вне зоны проверки vue-tsc — типизация только через JSDoc.
 * ======================================================================== */

;(function (window) {
  'use strict'

  var PROJECT_PATH = '/p/units/yakovleva/pay'

  if (window.GwWidgetCommon) {
    // Повторная загрузка common.js — оставляем первую регистрацию, чтобы не
    // ломать существующие виджеты, которые уже захватили ссылку.
    return
  }

  /**
   * Обёртка вокруг инициализации виджета. Любая ошибка (CSP-блокировка,
   * сетевая, DOM-парсинг, неожиданная структура страницы) гасится — виджет
   * тихо выходит, не ломая основной флоу магазина.
   *
   * @param {() => void | Promise<void>} fn — функция инициализации виджета.
   */
  function safeInit(fn) {
    try {
      var result = fn()
      if (result && typeof result.catch === 'function') {
        result.catch(function () {
          /* swallow — userscript не должен влиять на страницу. */
        })
      }
    } catch (err) {
      /* swallow */
    }
  }

  /**
   * Проверка соответствия суммы пользовательскому диапазону виджета.
   * `minAmount === 0` — без ограничения снизу. `maxAmount === 0` — без
   * ограничения сверху. Отрицательные/NaN границы трактуются как «без
   * ограничения».
   *
   * @param {number} amount
   * @param {number} minAmount
   * @param {number} maxAmount
   * @returns {boolean}
   */
  function isAmountInRange(amount, minAmount, maxAmount) {
    if (!isFinite(amount) || amount <= 0) return false
    if (isFinite(minAmount) && minAmount > 0 && amount < minAmount) return false
    if (isFinite(maxAmount) && maxAmount > 0 && amount > maxAmount) return false
    return true
  }

  /**
   * Нормализует базовый URL клиента.
   * Поддерживает оба способа подключения:
   *   - data-gw-base-url="https://host"
   *   - data-gw-base-url="https://host/p/units/yakovleva/pay"
   * И чинит старые значения после переезда проекта.
   *
   * @param {string} baseUrl
   * @returns {string}
   */
  function normalizeClientBaseUrl(baseUrl) {
    var url = String(baseUrl || '').replace(/\/+$/, '')
    if (url.slice(-PROJECT_PATH.length) === PROJECT_PATH) return url
    return url + PROJECT_PATH
  }

  /**
   * Извлекает позиции заказа из DOM магазина (.deal-positions li).
   * Для каждого li читает data-offer-id (id). Включает запись если id !== ''.
   * Сверка офферов идёт только по id, поэтому title из DOM не читаем (он был
   * хрупким из-за различий в пробелах/кодировке). Не бросает исключений.
   *
   * @returns {{ id: string }[]}
   */
  function extractDealPositions() {
    try {
      var items = document.querySelectorAll('.deal-positions li')
      var result = []
      for (var i = 0; i < items.length; i++) {
        var li = items[i]
        var id = (li.getAttribute('data-offer-id') || '').trim()
        if (id !== '') {
          result.push({ id: id })
        }
      }
      return result
    } catch (err) {
      return []
    }
  }

  /**
   * СИНХРОНИЗИРОВАНО с shared/widgetSettingsTypes.ts → areAllOffersAllowed/isOfferAllowed.
   * Править ОБА места.
   *
   * Проверяет, что ВСЕ позиции заказа разрешены по off/white/blacklist офферов —
   * ТОЛЬКО по id.
   * - off → true (фильтр выключен; любые/пустые позиции допускаются).
   * - Пустой positions при whitelist/blacklist → false (нет позиций — не рендерим).
   * - Пустой allowedOffers → whitelist: false (скрыт), blacklist: true (показан).
   * - Сверка по id (точное, String().trim()). Title больше не участвует: он был
   *   хрупким (пробелы/кодировка) и избыточным, т.к. id есть и в позициях, и в
   *   настройках.
   *
   * @deprecated — оффер-фильтрация перенесена на сервер (config-эндпоинт).
   * @param {{ id: string }[]} positions
   * @param {{ id: string }[]} allowedOffers
   * @param {'off' | 'whitelist' | 'blacklist' | string} listType
   * @returns {boolean}
   */
  function areAllPositionsAllowed(positions, allowedOffers, listType) {
    try {
      if (listType === 'off') return true
      if (!Array.isArray(positions) || positions.length === 0) return false
      var allowed = Array.isArray(allowedOffers) ? allowedOffers : []

      for (var i = 0; i < positions.length; i++) {
        var posId = positions[i].id || ''

        var idMatch =
          posId !== '' &&
          (function (pid) {
            for (var j = 0; j < allowed.length; j++) {
              if (String(allowed[j].id).trim() === pid) return true
            }
            return false
          })(posId)

        var posAllowed = listType === 'blacklist' ? !idMatch : idMatch

        if (!posAllowed) return false
      }
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Запрос конфигурации доступности виджетов у нашего клиента. Возвращает
   * `WidgetAvailabilityConfig` или `null` при сетевой ошибке / `403` (CORS).
   * Эндпоинт POST; тело передаётся как text/plain (CORS preflight-обход).
   *
   * @param {string} baseUrl — базовый URL клиента (например, `https://<домен>`).
   * @param {{ dealId: string, positions: { id: string }[] }} payload
   * @returns {Promise<object | null>}
   */
  function fetchWidgetConfig(baseUrl, payload) {
    var url = normalizeClientBaseUrl(baseUrl) + '/api/widgets/config'
    return fetch(url, {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload || {})
    })
      .then(function (response) {
        if (!response.ok) return null
        return response.json().then(function (data) {
          if (data && data.ok && data.config) return data.config
          return null
        })
      })
      .catch(function () {
        return null
      })
  }

  /**
   * Извлекает числовой id заказа из текущего URL страницы.
   *
   * Приоритет — path-формат: `/id/123` или `/id/123/hash/...` (regex
   * `/\/id\/(\d+)(?:[\/?#]|$)/`). Если не найден — ищет query-параметр `id`
   * и принимает его только если состоит из цифр.
   *
   * Хардкод пути допустим — userscript работает на страницах магазина, где
   * URL-структура GetCourse стабильна.
   *
   * @returns {string | null} — строка с id (цифры) или null
   */
  function extractDealIdFromUrl() {
    try {
      var pathname = window.location.pathname || ''
      var pathMatch = /\/id\/(\d+)(?:[/?#]|$)/.exec(pathname)
      if (pathMatch && pathMatch[1]) return pathMatch[1]
      var queryId = new URLSearchParams(window.location.search).get('id')
      if (queryId && /^\d+$/.test(queryId)) return queryId
    } catch (err) {
      /* swallow */
    }
    return null
  }

  /**
   * POST к `/api/widgets/intent-by-deal` нашего клиента (deal-поток).
   * Тело отправляется как `Content-Type: text/plain` с JSON-строкой внутри,
   * чтобы избежать CORS preflight (платформа не обслуживает OPTIONS).
   *
   * @param {string} baseUrl
   * @param {object} payload — { dealId, method, currency?, customerPhone? }
   * @returns {Promise<object | null>}
   */
  function postWidgetIntentByDeal(baseUrl, payload) {
    var url = normalizeClientBaseUrl(baseUrl) + '/api/widgets/intent-by-deal'
    var body = JSON.stringify(payload || {})
    return fetch(url, {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain' },
      body: body
    })
      .then(function (response) {
        return response
          .json()
          .then(function (data) {
            return data || null
          })
          .catch(function () {
            return null
          })
      })
      .catch(function () {
        return null
      })
  }

  /**
   * Простая модалка-оверлей без внешних CSS/зависимостей. Возвращает объект
   * `{ show, hide }`. Стили — инлайн, чтобы не зависеть от CSP `style-src`.
   *
   * @param {HTMLElement | string} content — DOM-элемент или HTML-строка.
   * @param {() => void} [onClose]
   * @returns {{ show: () => void, hide: () => void }}
   */
  function createModal(content, onClose) {
    var overlay = document.createElement('div')
    overlay.setAttribute('data-gw-modal', '1')
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2147483646;display:flex;align-items:center;justify-content:center;'

    var inner = document.createElement('div')
    inner.style.cssText =
      'position:relative;background:#fff;color:#222;padding:24px;border-radius:8px;max-width:90vw;max-height:90vh;overflow:auto;box-shadow:0 12px 32px rgba(0,0,0,0.3);font-family:sans-serif;'

    var closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.textContent = '×'
    closeBtn.setAttribute('aria-label', 'Закрыть')
    closeBtn.style.cssText =
      'position:absolute;top:6px;right:8px;border:none;background:transparent;color:#888;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;'
    inner.appendChild(closeBtn)

    if (typeof content === 'string') {
      var span = document.createElement('div')
      span.innerHTML = content
      inner.appendChild(span)
    } else if (content && content.nodeType === 1) {
      inner.appendChild(content)
    }

    overlay.appendChild(inner)

    function hide() {
      try {
        overlay.parentNode && overlay.parentNode.removeChild(overlay)
      } catch (e) {
        /* swallow */
      }
      if (typeof onClose === 'function') {
        try {
          onClose()
        } catch (e) {
          /* swallow */
        }
      }
    }

    closeBtn.addEventListener('click', hide)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hide()
    })

    return {
      show: function () {
        document.body.appendChild(overlay)
      },
      hide: hide
    }
  }

  window.GwWidgetCommon = {
    safeInit: safeInit,
    isAmountInRange: isAmountInRange,
    extractDealPositions: extractDealPositions,
    areAllPositionsAllowed: areAllPositionsAllowed,
    fetchWidgetConfig: fetchWidgetConfig,
    normalizeClientBaseUrl: normalizeClientBaseUrl,
    extractDealIdFromUrl: extractDealIdFromUrl,
    postWidgetIntentByDeal: postWidgetIntentByDeal,
    createModal: createModal
  }
})(window)
