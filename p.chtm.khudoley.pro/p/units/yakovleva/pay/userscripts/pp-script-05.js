// Механизм работы методов оплаты.
// Кнопка «ОПЛАТИТЬ ЗАКАЗ» заблокирована (серая), пока способ оплаты не выбран.
// При выборе метода кнопка активируется (акцентный цвет) и страница скроллит к ней.
// Выделение по умолчанию управляется из админки (general.defaultMethod):
//   - пустое значение → ни один метод не выделен (кнопка заблокирована);
//   - methodKey → этот метод выделен сразу при загрузке.
// GetCourse штатно помечает один метод (#sber-pay) классом .picked при рендере —
// normalizeDefaultSelection() снимает это «навязанное» выделение и применяет настройку,
// пока покупатель сам не выбрал способ оплаты (после ручного выбора не вмешиваемся).
// xdgetId: r6675
$(function () {
  // Покупатель сделал явный выбор → перестаём навязывать дефолт из конфига.
  var userHasPicked = false

  // Кредит/рассрочка/безнал — у них есть под-опции (срок, реквизиты), поэтому при выборе
  // к кнопке НЕ скроллим, чтобы пользователь мог настроить метод на месте.
  function isCreditBlock(el) {
    return $(el).is(
      '#sber-pokupay, #vsegdada, #yandex-split, #alpha-bank-podeli, #tinkoff-dolyame, ' +
        '#yandex-split-improved, #fresh-credit, #tinkoffcredit, #tinkoffcredit-2, ' +
        '#poscredit, #resource-razvitie, #invoice'
    )
  }

  // Активность кнопки оплаты = выбран ли способ. Обе кнопки (desktop в .total-cost и
  // мобильная .confirm-mobile) переключаются классом .pay-disabled (серый/заблок. вид в CSS).
  function syncPayState() {
    var hasPicked = document.querySelector('.xdget-payform .picked') !== null
    document.querySelectorAll('.confirm-pay, .confirm-mobile').forEach(function (btn) {
      btn.classList.toggle('pay-disabled', !hasPicked)
    })
  }

  // Видимая в текущей раскладке кнопка оплаты: на десктопе — в .total-cost (справа),
  // на мобайле — .confirm-mobile (сверху). Скрытая кнопка имеет offsetParent === null.
  function visibleConfirm() {
    return Array.from(document.querySelectorAll('.confirm-pay, .confirm-mobile')).find(
      function (b) {
        return b.offsetParent !== null
      }
    )
  }
  // Якорь прокрутки при выборе метода — верх блока «Состав заказа», а НЕ сама кнопка.
  // Иначе при подмотке снизу вверх в кадр попадает одна кнопка; нужно показать всю сводку
  // (состав + суммы + кнопку). Фоллбэк — .main-info, затем видимая кнопка.
  function summaryAnchor() {
    var isMobile = window.matchMedia && window.matchMedia('(max-width: 991px)').matches
    if (isMobile) {
      return (
        document.querySelector('.order-left-side .confirm-mobile') ||
        document.querySelector('.order-left-side .mobile-total-cost') ||
        visibleConfirm()
      )
    }
    var h3 = Array.from(document.querySelectorAll('.order-left-side h3')).find(function (el) {
      return /Состав заказа/i.test(el.textContent)
    })
    return h3 || document.querySelector('.order-left-side .main-info') || visibleConfirm()
  }
  function pulseConfirm(el) {
    if (!el || !el.classList || el.classList.contains('pay-disabled')) return
    window.setTimeout(function () {
      el.classList.remove('pp-confirm-pulse')
      void el.offsetWidth
      el.classList.add('pp-confirm-pulse')
      window.setTimeout(function () {
        el.classList.remove('pp-confirm-pulse')
      }, 1800)
    }, 550)
  }
  function scrollToSummary() {
    var el = summaryAnchor()
    if (el) {
      var isMobile = window.matchMedia && window.matchMedia('(max-width: 991px)').matches
      var offset = 20
      if (isMobile && el.classList && el.classList.contains('confirm-mobile')) {
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
        offset = Math.max(20, Math.round(viewportHeight * 0.38))
      }
      var top = Math.max(0, $(el).offset().top - offset)
      if (isMobile && el.classList && el.classList.contains('confirm-mobile')) {
        pulseConfirm(el)
      }
      if (window.scrollTo) {
        try {
          window.scrollTo({ top: top, behavior: 'smooth' })
          return
        } catch (e) {}
      }
      $('html,body').animate({ scrollTop: top }, 500)
    }
  }

  // Выбор метода: снимаем выделение с прочих, выделяем кликнутый, активируем кнопку,
  // для обычных методов — скроллим к кнопке.
  function pick(el) {
    $('.xdget-payform div').not(el).removeClass('picked')
    $('.xdget-payform form').not(el).removeClass('picked')
    $(el).addClass('picked')
    syncPayState()
    // Скроллим только на стопке (≤991px): там кнопка/сводка вверху, а пользователь — внизу
    // среди методов. На ПК (≥992px) кнопка в sticky-блоке справа всегда видна — скролл не нужен.
    if (!isCreditBlock(el) && window.matchMedia('(max-width: 991px)').matches) {
      scrollToSummary()
    }
  }

  // isHidden(el): метод скрыт конфигом (pp-script-11 ставит display:none + data-pp-hidden)
  // или CSS. Выделять по умолчанию скрытый метод нельзя — на странице его нет.
  function isHidden(el) {
    if (!el) return true
    if (el.dataset && el.dataset.ppHidden) return true
    var cs = window.getComputedStyle ? window.getComputedStyle(el) : null
    return cs ? cs.display === 'none' || cs.visibility === 'hidden' : false
  }

  // resolveDefaultEl(): DOM-элемент метода, заданного в general.defaultMethod.
  // Сначала через resolver метода из конфига (id/class), затем fallback по methodKey.
  // Возвращает null, если ключ пуст, элемент не найден или скрыт.
  function resolveDefaultEl() {
    var cfg = window.__PP_CONFIG__
    if (!cfg || !cfg.general) return null
    var key = cfg.general.defaultMethod
    if (!key || typeof key !== 'string') return null
    var el = null
    var mc = cfg.methods && cfg.methods[key]
    if (mc && mc.resolver && typeof mc.resolver.value === 'string' && mc.resolver.value) {
      el =
        mc.resolver.type === 'class'
          ? document.querySelector('.' + mc.resolver.value)
          : document.getElementById(mc.resolver.value)
    }
    if (!el) {
      el = document.getElementById(key) || document.querySelector('.' + key)
    }
    return el && !isHidden(el) ? el : null
  }

  // normalizeDefaultSelection(): приводит стартовое выделение к настройке админки.
  // Снимает любое «навязанное» выделение (в т.ч. штатный .picked GetCourse на #sber-pay)
  // и подсвечивает метод из конфига, если он задан. После ручного выбора покупателя —
  // не вмешивается (userHasPicked). Идемпотентна: вызывается на каждом проходе wire().
  function normalizeDefaultSelection() {
    if (userHasPicked) return
    $('.xdget-payform .picked').removeClass('picked')
    var el = resolveDefaultEl()
    if (el) $(el).addClass('picked')
    syncPayState()
  }

  // wire(): навешивание обработчиков выбора + синхронизация состояния кнопки.
  // Идемпотентно (.off перед .on), поэтому повторяем на ready/load/с задержкой —
  // методы GC подгружаются асинхронно, и поздно появившиеся тоже получат обработчики.
  function wire() {
    // Клик по методу-«дивке». Исключаем обёртку альт-методов и заголовки секций
    // (.pay-section-label / .label-credit / .label-payparts / .label-invoice — это не методы).
    $(
      '.xdget-payform > div:not(.alternative-payments-block-main):not(.pay-section-label):not(.label-credit):not(.label-payparts):not(.label-invoice), ' +
        '.xdget-payform .pp-other-methods-body > div:not(.alternative-payments-block-main):not(.pay-section-label):not(.label-credit):not(.label-payparts):not(.label-invoice)'
    )
      .off('click.picker')
      .on('click.picker', function () {
        userHasPicked = true
        pick(this)
      })

    // Клик по методу-«форме»
    $('.xdget-payform > form, .xdget-payform .pp-other-methods-body > form')
      .off('click.picker')
      .on('click.picker', function () {
        userHasPicked = true
        pick(this)
      })

    // На случай неизвлечённых альт-методов (идемпотентно с extraction-скриптом)
    $(
      '.xdget-payform .alternative-payments-block > div, .xdget-payform .alternative-payments-block > form'
    )
      .off('click.picker')
      .on('click.picker', function () {
        userHasPicked = true
        pick(this)
      })

    // Кнопка оплаты: пока способ не выбран — заблокирована (запускать нечего, подсказываем);
    // иначе кликаем кнопку выбранного метода.
    $('.confirm-pay')
      .off('click.picker')
      .on('click.picker', function () {
        if ($('.xdget-payform .picked').length) {
          $('.picked .btn').click()
        } else {
          alert('Выберите способ оплаты.')
        }
      })

    // Приводим стартовое выделение к настройке админки (снимает штатный .picked GC,
    // применяет defaultMethod). Внутри — syncPayState(). После ручного выбора no-op.
    normalizeDefaultSelection()
  }

  wire()
  $(window).on('load', wire)
  setTimeout(wire, 1600)
  setTimeout(wire, 3600)
})
