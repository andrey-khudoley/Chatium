/* ============================================================
 * pp-loader.js — Загрузчик страницы оплаты GetCourse (dealPay)
 *
 * Вычисляет URL конфига из собственного src, показывает прелоадер,
 * запрашивает конфиг, инжектит стили и скрипты в правильном порядке.
 * Без внешних зависимостей, vanilla ES5+.
 * ============================================================ */
;(function () {
  'use strict'

  function isDealPayPage() {
    return (
      String(window.location && window.location.pathname ? window.location.pathname : '').indexOf(
        '/sales/shop/dealPay/'
      ) !== -1
    )
  }

  function hideExistingPreloader() {
    var el = document.getElementById('pp-preloader')
    if (el) el.style.display = 'none'
  }

  // 1. Идемпотентность: при повторной загрузке ничего не делаем.
  if (window.__PP_LOADER_STARTED__) return
  window.__PP_LOADER_STARTED__ = true

  // Лоадер предназначен только для страницы оплаты GC.
  // Если тег случайно подключили глобально, не запрашиваем конфиг и не инжектим скрипты.
  if (!isDealPayPage()) {
    hideExistingPreloader()
    return
  }

  // Режим редактирования страницы в конструкторе GC (?editMode=1): лоадер полностью отключён —
  // не запрашиваем конфиг, не инжектим стили и скрипты, не показываем прелоадер. Кастомизация
  // не должна мешать редактору. Прелоадер, вставленный школой в HTML, прячет собственный
  // inline-скрипт сниппета (см. svgPreloaderSnippet) — независимо от лоадера.
  if (/[?&]editMode=1(?:&|$)/.test(window.location.search || '')) return

  // ── Вспомогательные функции ──────────────────────────────────

  /** Показываем оверлей ошибки (непрозрачный, поверх всего). */
  function showError() {
    if (document.getElementById('pp-error-overlay')) return
    var overlay = document.createElement('div')
    overlay.id = 'pp-error-overlay'
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#fff;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:sans-serif;font-size:16px;color:#333;text-align:center;'
    overlay.textContent = 'Ошибка рендеринга страницы оплаты'
    document.body && document.body.appendChild(overlay)
  }

  /** Убираем прелоадер. */
  function hidePreloader() {
    var el = document.getElementById('pp-preloader')
    if (el) el.style.display = 'none'
  }

  /** Убираем прелоадер только после полной загрузки страницы оплаты. */
  function hidePreloaderAfterPageLoad() {
    if (document.readyState === 'complete') {
      hidePreloader()
      return
    }

    window.addEventListener(
      'load',
      function () {
        hidePreloader()
      },
      { once: true }
    )
  }

  /** Извлекаем GC deal id из /sales/shop/dealPay/id/<id>/hash/... */
  function extractDealIdFromUrl() {
    try {
      var path = String(window.location && window.location.pathname ? window.location.pathname : '')
      var m = path.match(/\/sales\/shop\/dealPay\/id\/(\d+)(?:\/|$)/)
      return m && m[1] ? m[1] : ''
    } catch (e) {
      return ''
    }
  }

  /** Показываем SVG-прелоадер, если ещё нет в DOM. */
  function showPreloader() {
    if (document.getElementById('pp-preloader')) return
    var div = document.createElement('div')
    div.id = 'pp-preloader'
    div.style.cssText =
      'position:fixed;inset:0;z-index:99998;background:#fff;' +
      'display:flex;align-items:center;justify-content:center;'
    div.innerHTML =
      '<style>' +
      '@keyframes pp-spin{to{transform:rotate(360deg)}}' +
      '#pp-preloader svg{animation:pp-spin 0.9s linear infinite}' +
      '</style>' +
      '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="24" cy="24" r="20" stroke="#e0e0e0" stroke-width="4"/>' +
      '<path d="M44 24 A20 20 0 0 1 24 44" stroke="#F85C50" stroke-width="4" stroke-linecap="round"/>' +
      '</svg>'
    document.body && document.body.appendChild(div)
  }

  /**
   * Загружаем один скрипт как <script src=...>, ждём onload/onerror,
   * затем вызываем callback.
   */
  function loadScript(url, callback) {
    var s = document.createElement('script')
    s.src = url
    s.onload = function () {
      callback(null)
    }
    s.onerror = function () {
      console.error('[pp-loader] Ошибка загрузки скрипта: ' + url)
      callback(new Error('script load error'))
    }
    ;(document.head || document.documentElement).appendChild(s)
  }

  /**
   * Загружаем скрипты последовательно (гарантируем порядок 01..13).
   * При ошибке одного — логируем и продолжаем.
   * По завершении всех — вызываем done().
   */
  function loadScriptsSequentially(urls, done) {
    var index = 0
    function next() {
      if (index >= urls.length) {
        done()
        return
      }
      var url = urls[index++]
      loadScript(url, function () {
        next()
      })
    }
    next()
  }

  // ── Вычисляем URL конфига ────────────────────────────────────

  var configUrl = null
  try {
    // Пробуем document.currentScript (не работает в IE11, но ES5+ браузеры поддерживают).
    var scriptEl = document.currentScript
    if (!scriptEl) {
      // Фоллбэк: ищем последний тег <script> с pp-loader.js в src.
      var all = document.getElementsByTagName('script')
      for (var i = all.length - 1; i >= 0; i--) {
        if (/pp-loader\.js/.test(all[i].src)) {
          scriptEl = all[i]
          break
        }
      }
    }

    if (scriptEl && scriptEl.src && scriptEl.src.indexOf('/userscripts/pp-loader.js') !== -1) {
      configUrl = scriptEl.src.replace('/userscripts/pp-loader.js', '/api/payment-page/config')
    }
  } catch (e) {
    console.error('[pp-loader] Ошибка при вычислении src:', e)
  }

  if (!configUrl) {
    console.error('[pp-loader] Не удалось вычислить configUrl из src тега скрипта')
    showPreloader()
    showError()
    return
  }

  // ── Основная логика ──────────────────────────────────────────

  try {
    showPreloader()

    var dealId = extractDealIdFromUrl()
    var requestBody = dealId ? JSON.stringify({ dealId: dealId }) : '{}'

    // Таймаут 5 секунд на запрос конфига.
    var fetchPromise = fetch(configUrl, {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain' },
      body: requestBody
    })
    var timeoutPromise = new Promise(function (_, rej) {
      setTimeout(function () {
        rej(new Error('timeout'))
      }, 5000)
    })

    Promise.race([fetchPromise, timeoutPromise])
      .then(function (response) {
        return response.json()
      })
      .then(function (json) {
        // 5. Проверяем success.
        if (!json || json.success !== true) {
          console.error('[pp-loader] Конфиг не получен:', json && json.error)
          hidePreloader()
          showError()
          return
        }

        // 6. Успех — сохраняем конфиг глобально.
        window.__PP_CONFIG__ = json

        var general = json.general || {}

        // 6a. Если страница отключена — просто убираем прелоадер после загрузки страницы.
        if (general.enabled === false) {
          hidePreloaderAfterPageLoad()
          return
        }

        // Загружаем стили как текст и инжектим через <style>.
        var stylesPromise = Promise.resolve()
        if (general.stylesUrl) {
          stylesPromise = fetch(general.stylesUrl, { cache: 'no-store' })
            .then(function (r) {
              return r.text()
            })
            .then(function (css) {
              var style = document.getElementById('pp-style') || document.createElement('style')
              style.id = 'pp-style'
              style.textContent = css
              ;(document.head || document.documentElement).appendChild(style)
            })
            .catch(function (e) {
              console.warn('[pp-loader] Ошибка загрузки стилей, продолжаем:', e)
            })
        }

        // 6b. После стилей грузим скрипты последовательно.
        stylesPromise.then(function () {
          var scriptUrls = Array.isArray(general.scriptUrls) ? general.scriptUrls : []
          loadScriptsSequentially(scriptUrls, function () {
            // 6c. После последнего скрипта и загрузки страницы убираем прелоадер.
            hidePreloaderAfterPageLoad()
          })
        })
      })
      .catch(function (err) {
        console.error('[pp-loader] Ошибка запроса конфига:', err)
        hidePreloader()
        showError()
      })
  } catch (e) {
    console.error('[pp-loader] Критическая ошибка:', e)
    showError()
  }
})()
