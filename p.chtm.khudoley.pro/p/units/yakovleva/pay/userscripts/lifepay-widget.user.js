/* ========================================================================
 * Payments Client LifePay widget — встраиваемый виджет оплаты через LifePay (СБП)
 * для сторонних страниц магазина. Deal-поток (2026).
 *
 * Поведение:
 *   1. Ждёт DOM-якорь `#gw-lifepay-widget` (если не найден — тихий выход).
 *   2. Читает `data-gw-base-url` с якоря (обязателен).
 *   3. Извлекает dealId из URL текущей страницы (`GwWidgetCommon.extractDealIdFromUrl`).
 *      Если null — тихий выход без рендера и ошибок.
 *   4. Собирает позиции заказа из DOM (`GwWidgetCommon.extractDealPositions`),
 *      передаёт их вместе с dealId в `GwWidgetCommon.fetchWidgetConfig` (POST).
 *      Сервер сам решает `enabled` с учётом офферов и суммы заказа.
 *      Если `config.lifepay.enabled !== true` — тихий выход.
 *   5. Отрисовывает кнопку «Оплатить через СБП (LifePay)».
 *   6. По клику вызывает `GwWidgetCommon.postWidgetIntentByDeal` с dealId.
 *      При успехе — показывает QR-модалку. При ошибке — текст из errorToText.
 *
 * Параметры через data-атрибуты якорного элемента:
 *   - data-gw-base-url  (обязателен) — корень Payments Client, например
 *                       `https://<домен>`.
 *
 * УДАЛЕНО:
 *   - data-offer-id     — заменён проверкой всех позиций .deal-positions.
 *   - data-email        — email берётся из GC-заказа на сервере.
 *   - data-order-number — orderNumber детерминирован: числовой dealId (нормализованный).
 *   - extractOrderAmount / isAmountInRange — сумма с сервера из GC.
 *
 * Зависимости: глобал `window.GwWidgetCommon` из `common.js`.
 *
 * @file
 * ======================================================================== */

;(function (window) {
  'use strict'

  /** URL CDN QR-библиотеки (тот же что использует наша админ-панель). */
  var QR_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js'

  var common = window.GwWidgetCommon
  if (!common || typeof common.safeInit !== 'function') {
    // common.js должен быть подключён перед этим файлом.
    return
  }

  common.safeInit(function () {
    var anchor = document.getElementById('gw-lifepay-widget')
    if (!anchor) return

    var baseUrl = anchor.getAttribute('data-gw-base-url') || ''
    if (!baseUrl) return

    // Извлекаем dealId из URL страницы — если null, виджет не отображается
    // (страница не является страницей конкретного заказа).
    var dealId = common.extractDealIdFromUrl()
    if (!dealId) return

    var positions = common.extractDealPositions()
    common
      .fetchWidgetConfig(baseUrl, { dealId: dealId, positions: positions })
      .then(function (config) {
        if (!config || !config.lifepay || config.lifepay.enabled !== true) return

        renderWidget(anchor, baseUrl, dealId)
      })
      .catch(function () {})
  })

  /**
   * Создаёт кнопку виджета внутри `anchor`. Удаляет существующий рендер
   * при повторной инициализации (дублирование DOM недопустимо).
   *
   * @param {HTMLElement} anchor
   * @param {string} baseUrl
   * @param {string} dealId — id заказа GC
   */
  function renderWidget(anchor, baseUrl, dealId) {
    anchor.innerHTML = ''
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Оплатить через СБП (LifePay)'
    button.style.cssText =
      'display:inline-block;padding:12px 24px;background:#d3234b;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;font-family:inherit;line-height:1.2;'
    button.setAttribute('data-gw-method', 'lifepay')

    var error = document.createElement('div')
    error.style.cssText = 'color:#b00020;font-size:13px;margin-top:8px;display:none;'

    button.addEventListener('click', function () {
      button.disabled = true
      var originalText = button.textContent
      button.textContent = 'Создание счёта…'
      error.style.display = 'none'

      var payload = { dealId: dealId, method: 'lifepay' }

      common
        .postWidgetIntentByDeal(baseUrl, payload)
        .then(function (response) {
          button.disabled = false
          button.textContent = originalText
          if (!response || !response.ok || !response.paymentUrl) {
            var errCode = (response && response.error) || 'WIDGET_INTENT_ERROR'
            error.textContent = errorToText(errCode)
            error.style.display = 'block'
            return
          }
          showQrModal(response.paymentUrl)
        })
        .catch(function () {})
    })

    anchor.appendChild(button)
    anchor.appendChild(error)
  }

  /**
   * Загружает QR-библиотеку с CDN при необходимости, генерирует QR-код по
   * paymentUrl и показывает модалку. При ошибке — fallback со ссылкой.
   *
   * @param {string} paymentUrl
   */
  function showQrModal(paymentUrl) {
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      renderQrInModal(paymentUrl)
      return
    }
    var script = document.createElement('script')
    script.src = QR_CDN_URL
    script.async = true
    script.onload = function () {
      if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
        renderQrInModal(paymentUrl)
      } else {
        showLinkFallbackModal(paymentUrl)
      }
    }
    script.onerror = function () {
      showLinkFallbackModal(paymentUrl)
    }
    document.head.appendChild(script)
  }

  /**
   * Рендерит canvas с QR в модалке.
   *
   * @param {string} paymentUrl
   */
  function renderQrInModal(paymentUrl) {
    var wrapper = document.createElement('div')
    wrapper.style.cssText = 'text-align:center;max-width:320px;'

    var title = document.createElement('div')
    title.textContent = 'Отсканируйте QR-код для оплаты через СБП'
    title.style.cssText = 'font-size:15px;color:#222;margin-bottom:14px;font-weight:600;'
    wrapper.appendChild(title)

    var canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;margin:0 auto;'
    wrapper.appendChild(canvas)

    var link = document.createElement('a')
    link.href = paymentUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = 'или открыть ссылку оплаты'
    link.style.cssText =
      'display:inline-block;margin-top:14px;color:#1a4ea0;font-size:13px;text-decoration:underline;'
    wrapper.appendChild(link)

    var modal = common.createModal(wrapper)
    modal.show()

    try {
      window.QRCode.toCanvas(canvas, paymentUrl, { width: 256, margin: 1 }, function (err) {
        if (err) {
          modal.hide()
          showLinkFallbackModal(paymentUrl)
        }
      })
    } catch (e) {
      modal.hide()
      showLinkFallbackModal(paymentUrl)
    }
  }

  /**
   * Модалка-фоллбэк: если QR недоступен — даём кликабельную ссылку.
   *
   * @param {string} paymentUrl
   */
  function showLinkFallbackModal(paymentUrl) {
    var wrapper = document.createElement('div')
    wrapper.style.cssText = 'max-width:320px;'

    var title = document.createElement('div')
    title.textContent = 'Перейдите по ссылке для оплаты:'
    title.style.cssText = 'font-size:14px;color:#222;margin-bottom:12px;'
    wrapper.appendChild(title)

    var link = document.createElement('a')
    link.href = paymentUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = paymentUrl
    link.style.cssText = 'color:#1a4ea0;font-size:14px;word-break:break-all;'
    wrapper.appendChild(link)

    common.createModal(wrapper).show()
  }

  /**
   * Локализация серверных кодов ошибок в человекочитаемые сообщения.
   * Включает как новые коды deal-потока, так и сохранённые коды offer-потока.
   */
  function errorToText(code) {
    switch (code) {
      // Метод
      case 'WIDGET_METHOD_DISABLED':
        return 'Оплата через LifePay временно отключена.'
      case 'WIDGET_GC_METHOD_UNSUPPORTED':
        return 'Способ оплаты недоступен для этого заказа.'
      // Ограничения суммы
      case 'WIDGET_AMOUNT_INVALID':
      case 'WIDGET_AMOUNT_BELOW_MIN':
      case 'WIDGET_AMOUNT_EXCEEDS_LIMIT':
      case 'WIDGET_AMOUNT_EXCEEDS_HARD_LIMIT':
        return 'Сумма заказа вне допустимого диапазона для оплаты через LifePay.'
      // Оффер
      case 'WIDGET_OFFER_NOT_ALLOWED':
        return 'Заказ содержит товар, недоступный для оплаты этим способом.'
      // Deal-поток: коды из GC-резолвера
      case 'WIDGET_GC_DEAL_ID_INVALID':
        return 'Не удалось определить заказ для оплаты.'
      case 'WIDGET_GC_DEAL_NOT_FOUND':
        return 'Заказ не найден или недоступен.'
      case 'WIDGET_GC_ALREADY_PAID':
        return 'Этот заказ уже оплачен.'
      case 'WIDGET_GC_EMAIL_MISSING':
        return 'Не удалось определить email покупателя в заказе.'
      case 'WIDGET_GC_CURRENCY_UNSUPPORTED':
        return 'Оплата возможна только для заказов в рублях.'
      case 'WIDGET_GC_GATEWAY_ERROR':
        return 'Ошибка при создании счёта. Попробуйте ещё раз через несколько секунд.'
      default:
        return 'Не удалось создать счёт. Попробуйте ещё раз.'
    }
  }
})(window)
