// Заголовки секций оплаты + распределение методов.
// Карточная зона (новые секции): «Рекомендуемые способы оплаты» / «Pay-методы» /
// «Оплата картами из РФ» / «Оплата зарубежными картами» — метки вставляются в форму,
// визуальное размещение держит CSS `order` (см. payment-page.css). Штатный внешний
// заголовок «Оплата банковскими картами» при этом скрывается.
// Кредитная зона: надписи «Рассрочки» / «Оплата по частям», детерминированное
// распределение методов по секциям + чистка внутренностей кредитных карточек
// (примечание «Только для клиентов банка…», переносы строк в вариантах рассрочки).
// xdgetId: r6794
$(function () {
  // Порядок секций: определяет sectionIndex для раскладки через CSS order.
  var SECTION_ORDER = [
    'recommended',
    'pay',
    'cards_rf',
    'cards_world',
    'installments',
    'payparts',
    'noncash'
  ]
  var SECTION_LABELS = {
    recommended: { cls: 'label-recommended', text: 'Рекомендуемые способы оплаты' },
    pay: { cls: 'label-pay-methods', text: 'Pay-методы' },
    cards_rf: { cls: 'label-rf-cards', text: 'Оплата картами из РФ' },
    cards_world: { cls: 'label-foreign-cards', text: 'Оплата зарубежными картами' },
    installments: { cls: 'label-credit', text: 'Рассрочки' },
    payparts: { cls: 'label-payparts', text: 'Оплата по частям' },
    noncash: { cls: 'label-invoice', text: 'Безналичная оплата' }
  }
  function sectionIndex(section) {
    var i = SECTION_ORDER.indexOf(section)
    return i // -1 если неизвестна
  }

  function sectionClassName(section) {
    return 'pp-section-' + String(section).replace(/_/g, '-')
  }

  function applySectionClass(el, section) {
    if (!el.classList) return
    SECTION_ORDER.forEach(function (knownSection) {
      el.classList.remove(sectionClassName(knownSection))
    })
    if (sectionIndex(section) >= 0) el.classList.add(sectionClassName(section))
  }

  function parseMoneyFromText(text) {
    var matches = String(text || '').match(/\d[\d\s\u00a0.,]*(?:\s*(?:₽|руб\.?|р\.))/gi)
    if (!matches) return null
    for (var i = 0; i < matches.length; i++) {
      var raw = matches[i].replace(/[\s\u00a0]/g, '').replace(',', '.')
      var firstDot = raw.indexOf('.')
      if (firstDot !== -1) {
        raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '')
      }
      var parsed = parseFloat(raw)
      if (isFinite(parsed) && parsed > 0) return parsed
    }
    return null
  }

  function hasPreviousPaymentMarker(text) {
    var t = String(text || '').toLowerCase()
    return /уже\s+оплач|оплачен[аоы]?|внес[её]н[ао]?|предоплат|предоплач|поступил|плат[её]ж/.test(t)
  }

  function detectTopUpPaymentFromDom() {
    var roots = document.querySelectorAll('.total-cost, .mobile-total-cost, .order-left-side')
    for (var r = 0; r < roots.length; r++) {
      var root = roots[r]
      var rootText = root.textContent || ''
      if (hasPreviousPaymentMarker(rootText) && parseMoneyFromText(rootText) !== null) return true

      var nodes = root.querySelectorAll('div, span, p, li, td, th')
      for (var i = 0; i < nodes.length; i++) {
        var text = nodes[i].textContent || ''
        if (hasPreviousPaymentMarker(text) && parseMoneyFromText(text) !== null) return true
      }
    }
    return false
  }

  function updateRecommendedMixClass(cfg) {
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (!payform || !cfg || !cfg.methods) return
    var hasCard = false
    var hasCredit = false
    Object.keys(cfg.methods).forEach(function (methodId) {
      var methodCfg = cfg.methods[methodId]
      if (!methodCfg || methodCfg.section !== 'recommended') return
      var el = resolveMethodEl(methodId, methodCfg)
      if (!el || el.dataset.ppHidden) return
      if (el.classList && el.classList.contains('pp-role-card')) hasCard = true
      if (el.classList && el.classList.contains('pp-role-credit')) hasCredit = true
    })
    payform.classList.toggle('pp-recommended-mixed-custom', hasCard && hasCredit)
  }

  function restoreOtherMethodsSpoiler(payform) {
    if (!payform) return
    payform.querySelectorAll('.pp-other-methods-spoiler').forEach(function (spoiler) {
      if (spoiler.open) {
        payform.setAttribute('data-pp-other-methods-open', '1')
      } else {
        payform.removeAttribute('data-pp-other-methods-open')
      }
      var body = spoiler.querySelector('.pp-other-methods-body')
      if (body) {
        while (body.firstChild) {
          payform.insertBefore(body.firstChild, spoiler)
        }
      }
      spoiler.remove()
    })
  }

  function isVisiblePaymentMethod(el) {
    if (!el) return false
    if (el.dataset && el.dataset.ppHidden) return false
    var cs = window.getComputedStyle ? window.getComputedStyle(el) : null
    return !cs || (cs.display !== 'none' && cs.visibility !== 'hidden')
  }

  function readFlexOrder(el) {
    var raw = el && el.style ? el.style.order : ''
    var n = parseInt(raw, 10)
    if (!isFinite(n) && window.getComputedStyle) {
      n = parseInt(window.getComputedStyle(el).order, 10)
    }
    return isFinite(n) ? n : 0
  }

  function pushUniqueNode(nodes, el, payform) {
    if (!el || el.parentNode !== payform || nodes.indexOf(el) !== -1) return
    nodes.push(el)
  }

  function applyOtherMethodsSpoiler(cfg) {
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (!payform || !cfg || !cfg.methods) return

    var methodIds = Object.keys(cfg.methods)
    var hasRecommended = false
    var maxRecommendedOrder = -1
    methodIds.forEach(function (id) {
      var mc = cfg.methods[id]
      if (!mc || mc.section !== 'recommended') return
      var el = resolveMethodEl(id, mc)
      if (!isVisiblePaymentMethod(el)) return
      hasRecommended = true
      maxRecommendedOrder = Math.max(maxRecommendedOrder, readFlexOrder(el))
    })
    if (!hasRecommended) return

    var nodes = []
    var sectionsWithOtherMethods = {}
    methodIds.forEach(function (id) {
      var mc = cfg.methods[id]
      if (!mc || mc.section === 'recommended') return
      var el = resolveMethodEl(id, mc)
      if (!isVisiblePaymentMethod(el)) return
      sectionsWithOtherMethods[mc.section] = true
      pushUniqueNode(nodes, el, payform)
    })
    if (nodes.length === 0) return

    SECTION_ORDER.forEach(function (section) {
      if (section === 'recommended' || !sectionsWithOtherMethods[section]) return
      var info = SECTION_LABELS[section]
      if (!info) return
      pushUniqueNode(nodes, payform.querySelector('.pay-section-label.' + info.cls), payform)
    })

    nodes.sort(function (a, b) {
      var byOrder = readFlexOrder(a) - readFlexOrder(b)
      if (byOrder !== 0) return byOrder
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
    })

    var spoiler = document.createElement('details')
    spoiler.className = 'pp-other-methods-spoiler'
    var summary = document.createElement('summary')
    summary.textContent = 'Другие способы оплат'
    var body = document.createElement('div')
    body.className = 'pp-other-methods-body'
    spoiler.appendChild(summary)
    spoiler.appendChild(body)

    var firstOtherOrder = readFlexOrder(nodes[0])
    var spoilerOrder = Math.max(maxRecommendedOrder + 1, firstOtherOrder - 1)
    spoiler.style.setProperty('order', String(spoilerOrder), 'important')
    spoiler.addEventListener('toggle', function () {
      if (spoiler.open) {
        payform.setAttribute('data-pp-other-methods-open', '1')
      } else {
        payform.removeAttribute('data-pp-other-methods-open')
      }
    })

    payform.appendChild(spoiler)
    nodes.forEach(function (node) {
      body.appendChild(node)
    })
    if (
      payform.getAttribute('data-pp-other-methods-open') === '1' ||
      body.querySelector('.picked')
    ) {
      spoiler.open = true
    }
  }

  /**
   * resolveMethodEl(methodId, methodCfg): находит DOM-элемент метода.
   * Если methodCfg.resolver задан — использует его (type='id' → getElementById,
   * type='class' → querySelector('.value')).
   * Иначе — FALLBACK-конвенция: сначала getElementById(methodId), затем querySelector('.'+methodId).
   * Кастомные методы без совпадения в DOM → null → пропуск (без сбоя).
   * methodId и resolver.value из нашего справочника — валидные CSS-токены ([a-zA-Z0-9_-]).
   */
  function resolveMethodEl(methodId, methodCfg) {
    var resolver = methodCfg && methodCfg.resolver
    if (resolver) {
      if (resolver.type === 'id') {
        // Защита: пустой/невалидный value — не вызывать getElementById('')
        if (!resolver.value || typeof resolver.value !== 'string') return null
        return document.getElementById(resolver.value)
      }
      if (resolver.type === 'class') {
        // Защита: пустой/невалидный value — не вызывать querySelector('.')
        if (!resolver.value || typeof resolver.value !== 'string') return null
        return document.querySelector('.' + resolver.value)
      }
    }
    // FALLBACK: нет resolver — старая конвенция (по id, затем по классу)
    // Пустой methodId — не вызываем querySelector с пустым селектором
    if (!methodId || typeof methodId !== 'string') return null
    return document.getElementById(methodId) || document.querySelector('.' + methodId)
  }

  /**
   * applyMethodCaption(el, rawCaption): upsert-вставка подписи метода (.pp-method-caption).
   * Подпись — описательный текст под методом, задаётся в панели вместо скрытых системных
   * текстов GetCourse. Блок добавляется ПОСЛЕДНИМ прямым потомком карточки метода, чтобы
   * визуально лежать под кнопкой и переезжать вместе с методом при раскладке по CSS order.
   * Пустая подпись — удаляет ранее вставленный блок. Идемпотентна (сравнение с textContent).
   */
  function applyMethodCaption(el, rawCaption) {
    var caption = typeof rawCaption === 'string' ? rawCaption.trim() : ''
    // Кредитные/рассрочечные блоки (gc-payment-method-credit) — насыщенный контент
    // разной высоты, центрируемый через ID-правило justify-content:center !important.
    // При подписи это «плавит» выравнивание: лого/кнопки/подписи у соседних карточек
    // встают на разной высоте. Правим инлайн (см. ниже).
    var isCredit = el.classList && el.classList.contains('gc-payment-method-credit')
    var existing = null
    for (var i = 0; i < el.children.length; i++) {
      var ch = el.children[i]
      if (ch.className && (' ' + ch.className + ' ').indexOf(' pp-method-caption ') !== -1) {
        existing = ch
        break
      }
    }
    if (!caption) {
      if (existing) existing.remove()
      // Карточка метода центрирует контент через flex; класс переводил её в
      // колоночную раскладку ради подписи — без подписи снимаем класс,
      // навязанное выравнивание и нормализацию логотипа.
      if (el.classList) el.classList.remove('pp-has-caption')
      if (isCredit) {
        el.style.removeProperty('justify-content')
        el.style.removeProperty('min-height')
        var logoOff = el.querySelector('img')
        if (logoOff) {
          logoOff.style.removeProperty('height')
          logoOff.style.removeProperty('object-fit')
        }
      }
      return
    }
    if (!existing) {
      existing = document.createElement('div')
      existing.className = 'pp-method-caption'
      el.appendChild(existing)
    }
    // Зануляем margin подписи инлайн-!important. GC вешает на любой <div> внутри метода
    // правило по ID (напр. `#yandex-split div { margin-bottom: 20px }`), которое
    // class-селектором .pp-method-caption{margin:0} не перебить (ID > class). Без этого
    // у части карточек подпись «висит» на 20px выше дна и не выравнивается с соседями.
    existing.style.setProperty('margin', '0', 'important')
    // Класс на карточке: CSS переключает flex-раскладку в колонку (лого сверху,
    // подпись снизу) — см. pp-style.css «.pp-has-caption».
    if (el.classList) el.classList.add('pp-has-caption')
    // Кредитный блок вне recommended: контент прижимаем к верху, подпись — к низу
    // (space-between), чтобы у соседних карточек выровнялись верхний и нижний края.
    // В recommended секции widget/standard методы стоят рядом, поэтому геометрию держит CSS.
    // Инлайн !important перебивает ID-правило justify-content:center !important —
    // class-селектором это не сделать (ID выигрывает по специфичности). У простых
    // карточек контент одинаковой высоты — там сохраняем центрирование (без правки).
    if (isCredit) {
      var isRecommended = el.classList && el.classList.contains('pp-section-recommended')
      if (isRecommended) {
        el.style.removeProperty('justify-content')
        el.style.removeProperty('min-height')
      } else {
        el.style.setProperty('justify-content', 'space-between', 'important')
        el.style.setProperty('min-height', '0', 'important')
      }
      // В обычных кредитных секциях снимаем навязанную ID-правилом min-height (~240px):
      // на коротких карточках
      // (лого + кнопка, без списка опций) она создавала большой пустой зазор между
      // кнопкой и прижатой к низу подписью. Без floor карточка ужимается под контент,
      // зазор сокращается; на карточках с длинным списком опций контент всё равно выше
      // (min-height не влияет). Подписи остаются выровнены по низу (space-between).
      // Нижний отступ контент-блока ужимается в CSS (см. pp-style.css).
      // Нормализуем высоту логотипа. У соседних кредитных карточек логотипы разной
      // высоты (напр. Я.Сплит: 17px у improved-варианта vs 32px у обычного) → блоки
      // разной высоты → кнопки и подписи расходятся. Фикс-высота + object-fit:contain
      // (без искажения, letterbox) выравнивает зоны логотипов → кнопки/подписи встают
      // на одну линию. Инлайн !important — высоту лого тоже задаёт ID-правило (max-height).
      var logo = el.querySelector('img')
      if (logo) {
        if (isRecommended) {
          logo.style.removeProperty('height')
          logo.style.removeProperty('object-fit')
        } else {
          logo.style.setProperty('height', '34px', 'important')
          logo.style.setProperty('object-fit', 'contain', 'important')
        }
      }
    }
    if (existing.textContent !== caption) existing.textContent = caption
  }

  // Явное распределение методов по секциям. Порядок в массиве = порядок отображения внутри секции.
  // Рассрочки: tinkoffcredit-2, poscredit, resource-razvitie (по запросу) + остальные кредитные.
  let creditIds = [
    '#fresh-credit',
    '#tinkoffcredit',
    '#tinkoffcredit-2',
    '#vsegdada',
    '#poscredit',
    '#resource-razvitie',
    '#sber-pokupay'
  ]
  // Оплата по частям: yandex-split-improved (по запросу) + прочие сплит-методы.
  let payPartsIds = [
    '#yandex-split-improved',
    '#yandex-split',
    '#alpha-bank-podeli',
    '#tinkoff-dolyame'
  ]

  let find = (ids) => ids.map((sel) => document.querySelector(sel)).filter((el) => el !== null)

  // placePayer(): переносит «Данные плательщика» внутрь сводки заказа (между составом и суммой)
  // в обеих раскладках через клоны. Оригинальный GC-блок прячется и служит источником данных.
  function makePayerCard(extraCls, srcInfo) {
    var card = document.createElement('div')
    card.className = 'payer-card' + (extraCls ? ' ' + extraCls : '')
    var h = document.createElement('div')
    h.className = 'payer-heading'
    h.textContent = 'Данные плательщика'
    var body = srcInfo.cloneNode(true)
    body.removeAttribute('id')
    body.removeAttribute('style')
    body.querySelectorAll('[id]').forEach(function (e) {
      e.removeAttribute('id')
    })
    body.classList.remove('xdget-currentUserInfo')
    body.classList.add('payer-info')
    // Ссылка «Изменить данные» → профиль пользователя в новой вкладке (на текущем домене).
    body.querySelectorAll('a').forEach(function (a) {
      if (/Изменить данные/i.test(a.textContent)) {
        a.setAttribute('href', window.location.origin + '/user/my/profile')
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener')
      }
    })
    card.appendChild(h)
    card.appendChild(body)
    return card
  }
  function placePayer() {
    var info = document.querySelector('.order-left-side .xdget-currentUserInfo')
    document.querySelectorAll('.payer-card').forEach(function (el) {
      el.remove()
    }) // upsert клонов
    if (!info) return

    // Прячем штатные блоки — они источник данных, показываем только клоны в сводке.
    info.style.display = 'none'
    var origHeading = Array.from(
      document.querySelectorAll('.order-left-side .left-side-content > h4')
    ).find(function (h) {
      return /Данные плательщика/i.test(h.textContent)
    })
    if (origHeading) origHeading.style.display = 'none'

    // У неавторизованного покупателя блок пуст — карточки не строим.
    var hasData =
      info.textContent.trim().length > 0 ||
      info.querySelector('input, select, textarea, table, a, img, .xdget-block')
    if (!hasData) return

    // ПК (≥992): в правую сводку .total-cost .right-info, перед «Суммой для оплаты».
    var price = document.querySelector('.total-cost .right-info .deal-finish-price-title')
    if (price && price.parentNode) {
      price.parentNode.insertBefore(makePayerCard('payer-card-desktop', info), price)
    }
    // Стопка (≤991): в левую колонку между составом (.main-info) и суммами (.mobile-total-cost).
    var mobileTotal = document.querySelector('.order-left-side .mobile-total-cost')
    if (mobileTotal && mobileTotal.parentNode) {
      mobileTotal.parentNode.insertBefore(makePayerCard('payer-card-mobile', info), mobileTotal)
    }
  }

  // styleComposition(): приводит «Состав заказа» к виду «Данные плательщика» — единый
  // заголовок с иконкой (.summary-heading) + мягкая плашка вокруг состава (.summary-box).
  // Заголовок вставляется в обе видимые сводки (ПК — .right-info, стопка — .main-info);
  // видимость держат сами контейнеры (right-info скрыт ≤991, main-info скрыт ≥992).
  // Штатный крупный h3 «Состав заказа:» прячем — его заменяет единый заголовок.
  function styleComposition() {
    document.querySelectorAll('.summary-heading').forEach(function (el) {
      el.remove()
    }) // upsert
    Array.from(document.querySelectorAll('.order-left-side .left-side-content > h3'))
      .filter(function (h) {
        return /Состав заказа/i.test(h.textContent)
      })
      .forEach(function (h) {
        h.style.display = 'none'
      })
    ;[
      document.querySelector('.total-cost .right-info .deal-positions'),
      document.querySelector('.order-left-side .main-info .deal-positions')
    ]
      .filter(Boolean)
      .forEach(function (pos) {
        pos.classList.add('summary-box')
        var h = document.createElement('div')
        h.className = 'summary-heading'
        h.textContent = 'Состав заказа'
        pos.parentNode.insertBefore(h, pos)
      })
  }

  /**
   * runCustomScript(methodId, methodCfg, container): выполняет customScript метода через
   * new Function, передавая значение выбранного radio-пункта как аргумент selectedMenuValue.
   * Ошибки в скрипте оператора — warn, не exception (не ломаем страницу).
   */
  function runCustomScript(methodId, methodCfg, container) {
    // Re-entrancy guard: предотвращает двойное срабатывание в пределах одного тика
    // (напр. когда и своя кнопка, и штатный путь GC $(".picked .btn").click()
    // сводятся к одному обработчику).
    if (container.dataset.ppRunning === '1') return
    container.dataset.ppRunning = '1'
    // Читаем актуальный конфиг с узла (FIX-3: избегаем stale-замыкания)
    var cfg = container.__ppCfg || methodCfg
    var checked = container.querySelector('input[name="pp-menu-' + methodId + '"]:checked')
    var value = checked ? checked.value : ''
    if (!cfg.customScript) {
      delete container.dataset.ppRunning
      return
    }
    try {
      // eslint-disable-next-line no-new-func
      new Function('selectedMenuValue', cfg.customScript)(value)
    } catch (e) {
      console.warn('[pp-config] Ошибка customScript ' + methodId, e)
    } finally {
      setTimeout(function () {
        delete container.dataset.ppRunning
      }, 0)
    }
  }

  /**
   * ensureCustomContainer(methodId, methodCfg, payform): upsert-создание DOM-контейнера
   * кастомного метода. Вызывается строго при methodCfg.isSystem === false.
   *
   * Контейнер получает id=methodId и атрибут data-pp-custom=methodId — resolveMethodEl
   * найдёт его по id через resolver.type='id' и применит стандартные настройки
   * (enabled/caption/amount/section-order) как к обычному методу.
   *
   * Кнопка получает классы pp-custom-btn И btn: .btn нужен чтобы штатная кнопка GC
   * $(".picked .btn").click() (pp-script-05.js) нашла её и запустила customScript
   * (B2-фикс — без перехвата .confirm-pay).
   *
   * Наполнение идемпотентно: img/menu/кнопка upsert-ятся через сравнение значений.
   * Меню дополнительно защищено data-pp-menu-src: пересборка только при изменении
   * набора пунктов (сохраняет выбор пользователя на повторных вызовах build()).
   */
  function ensureCustomContainer(methodId, methodCfg, payform) {
    // Upsert по id (идемпотентность на повторных build())
    var container = document.getElementById(methodId)
    if (!container) {
      // Альтернатива: ищем по data-атрибуту (на случай смены id между build())
      container = payform.querySelector('[data-pp-custom="' + methodId + '"]')
    }
    if (!container) {
      container = document.createElement('div')
      container.id = methodId
      container.setAttribute('data-pp-custom', methodId)
      container.className = 'pp-custom-method'
      payform.appendChild(container)
    }

    // FIX-3: сохраняем актуальный конфиг на узле — runCustomScript читает его оттуда,
    // а не из замыкания listener первого build() (защита от stale-конфига при refetch).
    container.__ppCfg = methodCfg

    // — Режим взаимодействия: standard (штатная кнопка GC) или widget (меню + своя кнопка) —
    var mode = methodCfg.interactionMode === 'widget' ? 'widget' : 'standard'
    // Ролевой класс карточки (идемпотентно): widget → как блок рассрочки (pp-role-credit),
    // standard → как карточка выбора (pp-role-card). Стили в pp-style.css привязаны к роли.
    container.classList.remove('pp-role-card', 'pp-role-credit', 'gc-payment-method-credit')
    if (mode === 'widget') {
      container.classList.add('pp-role-credit', 'gc-payment-method-credit')
    } else {
      container.classList.add('pp-role-card')
    }

    // — Изображение: upsert img.pp-custom-img —
    // FIX-5: сравниваем по data-pp-img-src (исходный URL), а не img.src (нормализованный
    // браузером в абсолютный) — устраняет повторную загрузку картинки на каждом build().
    var existingImg = container.querySelector('.pp-custom-img')
    if (methodCfg.imageUrl) {
      if (!existingImg) {
        existingImg = document.createElement('img')
        existingImg.className = 'pp-custom-img'
        container.appendChild(existingImg)
      }
      if (existingImg.getAttribute('data-pp-img-src') !== methodCfg.imageUrl) {
        existingImg.setAttribute('data-pp-img-src', methodCfg.imageUrl)
        existingImg.src = methodCfg.imageUrl
      }
    } else {
      if (existingImg) existingImg.remove()
    }

    // — Меню (radio): upsert .pp-custom-menu, только в режиме widget и при наличии пунктов —
    var existingMenu = container.querySelector('.pp-custom-menu')
    var hasMenu = Array.isArray(methodCfg.menuItems) && methodCfg.menuItems.length > 0
    if (mode === 'widget' && hasMenu) {
      // Сериализуем пункты для сравнения: JSON-строка label+value
      var menuSrc = JSON.stringify(
        methodCfg.menuItems.map(function (it) {
          return { label: it.label || '', value: it.value || '' }
        })
      )
      if (!existingMenu || container.getAttribute('data-pp-menu-src') !== menuSrc) {
        // Пересобираем меню только при изменении набора пунктов
        if (existingMenu) existingMenu.remove()
        existingMenu = document.createElement('div')
        existingMenu.className = 'pp-custom-menu'
        methodCfg.menuItems.forEach(function (item, i) {
          var lbl = document.createElement('label')
          var radio = document.createElement('input')
          radio.type = 'radio'
          radio.name = 'pp-menu-' + methodId
          radio.value = item.value || ''
          if (i === 0) radio.checked = true
          lbl.appendChild(radio)
          lbl.appendChild(document.createTextNode(' ' + (item.label || item.value || '')))
          existingMenu.appendChild(lbl)
        })
        container.appendChild(existingMenu)
        container.setAttribute('data-pp-menu-src', menuSrc)
      }
      // Если набор не изменился — ничего не делаем (сохраняем выбор пользователя)
    } else {
      // В режиме standard или при отсутствии пунктов — убираем меню
      if (existingMenu) existingMenu.remove()
      container.removeAttribute('data-pp-menu-src')
    }

    // — Кнопка: upsert button.pp-custom-btn.btn, listener один раз (ppBound) —
    // Кнопка ВСЕГДА присутствует в DOM (для делегирования штатной кнопки GC через
    // $('.picked .btn').click() — pp-script-05.js). Видимость зависит от режима:
    //   widget   → видимая (покупатель жмёт кнопку внутри метода).
    //   standard → скрытая прокси (display:none); покупатель выделяет метод и жмёт
    //              штатную кнопку GC «Оплатить заказ» справа; клик делегируется сюда.
    var existingBtn = container.querySelector('.pp-custom-btn')
    if (!existingBtn) {
      existingBtn = document.createElement('button')
      existingBtn.className = 'pp-custom-btn btn'
      existingBtn.type = 'button'
      container.appendChild(existingBtn)
    }
    // Текст кнопки — из label (если задан) или дефолт 'Оплатить'
    var btnText = methodCfg.label || 'Оплатить'
    if (existingBtn.textContent !== btnText) existingBtn.textContent = btnText
    if (mode === 'widget') {
      // Режим widget: кнопка видима
      existingBtn.style.removeProperty('display')
    } else {
      // Режим standard: скрытая прокси — !important перебивает стили .btn/.pp-custom-btn
      existingBtn.style.setProperty('display', 'none', 'important')
    }
    // Вешаем listener ровно один раз (флаг dataset.ppBound). runCustomScript внутри
    // читает актуальный конфиг с container.__ppCfg (FIX-3), поэтому замыкание не устаревает.
    if (existingBtn.dataset.ppBound !== '1') {
      existingBtn.dataset.ppBound = '1'
      existingBtn.addEventListener('click', function () {
        runCustomScript(methodId, methodCfg, container)
      })
    }

    return container
  }

  function ensureCalloutHeading() {
    var heading = document.querySelector('.order-left-side .pp-callout-heading')
    if (!heading) {
      heading = document.createElement('div')
      heading.className = 'pp-callout-heading'
      heading.textContent = 'Информация'
    }
    return heading
  }

  function getPageLogoConfig() {
    var general = window.__PP_CONFIG__ && window.__PP_CONFIG__.general
    var logoUrl = general && typeof general.logoUrl === 'string' ? general.logoUrl.trim() : ''
    if (!logoUrl) return null
    if (!/^https?:\/\//i.test(logoUrl) && !/^data:image\//i.test(logoUrl)) return null
    var rawWidth = Number(general.logoWidth)
    var logoWidth = isFinite(rawWidth) ? Math.floor(rawWidth) : 50
    logoWidth = Math.min(320, Math.max(24, logoWidth))
    return { url: logoUrl, width: logoWidth }
  }

  function findOrderTitle() {
    return Array.from(
      document.querySelectorAll(
        '.page-header h1, .page-header h2, .page-header h3, .page-header h4, .order-left-side h1, .order-left-side h2, .order-left-side h3, .order-left-side h4'
      )
    ).find(function (h) {
      return /Оплата\s+заказа\s*#/i.test(h.textContent || '')
    })
  }

  function placePageLogo(logo, payform) {
    var orderTitle = findOrderTitle()
    if (orderTitle && orderTitle.parentNode) {
      orderTitle.parentNode.insertBefore(logo, orderTitle)
      return
    }
    var isMobile = window.matchMedia && window.matchMedia('(max-width: 991px)').matches
    if (isMobile) {
      var target =
        document.querySelector('.order-left-side .pp-callout-heading') ||
        document.querySelector('.order-left-side .main-info')
      if (target && target.parentNode) {
        target.parentNode.insertBefore(logo, target)
        return
      }
    }
    payform.appendChild(logo)
  }

  function applyPageLogo() {
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (!payform) return
    var cfg = getPageLogoConfig()
    var existing = document.querySelector('.pp-page-logo')
    Array.from(document.querySelectorAll('.pp-page-logo'))
      .slice(1)
      .forEach(function (logo) {
        logo.remove()
      })
    if (!cfg) {
      if (existing) existing.remove()
      return
    }
    if (!existing) {
      existing = document.createElement('div')
      existing.className = 'pp-page-logo'
    }
    placePageLogo(existing, payform)
    if (
      existing.getAttribute('data-pp-logo-src') === cfg.url &&
      existing.getAttribute('data-pp-logo-width') === String(cfg.width)
    ) {
      return
    }
    existing.setAttribute('data-pp-logo-src', cfg.url)
    existing.setAttribute('data-pp-logo-width', String(cfg.width))
    existing.textContent = ''
    var img = document.createElement('img')
    img.src = cfg.url
    img.alt = ''
    img.setAttribute('aria-hidden', 'true')
    img.style.width = cfg.width + 'px'
    existing.appendChild(img)
  }

  function placeCallout(heading, callout, payform) {
    var isMobile = window.matchMedia && window.matchMedia('(max-width: 991px)').matches
    if (isMobile) {
      var mainInfo = document.querySelector('.order-left-side .main-info')
      if (mainInfo && mainInfo.parentNode) {
        mainInfo.parentNode.insertBefore(heading, mainInfo)
        mainInfo.parentNode.insertBefore(callout, mainInfo)
        return
      }
    }
    payform.appendChild(heading)
    payform.appendChild(callout)
  }

  // applyCallout(): вставляет/обновляет/удаляет коллаут-блок (.pp-callout) из __PP_CONFIG__.
  // Идемпотентна: при неизменном исходном html не перезаписывает DOM. Если html пуст — удаляет.
  // Инвариант: при отсутствии window.__PP_CONFIG__ html='' → isEmpty → удалить/ничего.
  // На ПК блок остаётся первым в payform через CSS order:-13; на мобиле переносится выше
  // .main-info, чтобы кастомная информация была видна до состава заказа и оплаты.
  function applyCallout() {
    var html =
      (window.__PP_CONFIG__ &&
        window.__PP_CONFIG__.general &&
        window.__PP_CONFIG__.general.calloutHtml) ||
      ''
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (!payform) return
    // Пустым считается: нет текста (без учёта <br>, &nbsp; и пустых тегов)
    var isEmpty =
      !html ||
      !html
        .replace(/<br\s*\/?>/gi, '')
        .replace(/&nbsp;/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim()
    // :not(.pp-callout-crm) — не трогаем админский CRM-коллаут (он на том же классе .pp-callout,
    // но управляется отдельной функцией applyCrmCallout).
    var heading = document.querySelector('.order-left-side .pp-callout-heading')
    var existing = document.querySelector('.order-left-side .pp-callout:not(.pp-callout-crm)')
    if (isEmpty) {
      if (heading) heading.remove()
      if (existing) existing.remove()
      return
    }
    if (!existing) {
      existing = document.createElement('div')
      existing.className = 'pp-callout'
    }
    placeCallout(ensureCalloutHeading(), existing, payform)
    // Идемпотентность: сравниваем с ИСХОДНЫМ html (через data-атрибут), а не с existing.innerHTML.
    // Браузер нормализует innerHTML при установке (регистр атрибутов, пробелы, закрытие тегов),
    // поэтому existing.innerHTML === html почти никогда не совпало бы → DOM пересоздавался бы на
    // каждом ретрае build() (1600/3600мс), сбрасывая фокус/состояние внутри коллаута.
    if (existing.getAttribute('data-pp-callout-src') === html) return
    existing.setAttribute('data-pp-callout-src', html)
    existing.innerHTML = html
  }

  // applyCrmCallout(): ссылка «Карточка заказа в CRM» — штатная фича GetCourse, которая
  // присутствует на странице ТОЛЬКО у админов (в нескольких лейаут-вариантах внутри блоков
  // .xdget-dealInfo; у покупателя её нет вовсе). Собираем её в один коллаут-блок в том же
  // стиле, что и пользовательский коллаут (класс .pp-callout), и ставим ВЫШЕ него
  // (CSS order:-14 < -13). Исходные разрозненные строки прячем. ГЕЙТ: блок создаётся
  // строго при наличии исходной ссылки → виден исключительно админам. Идемпотентна (upsert):
  // элементы исходных ссылок не удаляются (display:none), поэтому гейт по существованию
  // сохраняется на повторных вызовах build().
  function applyCrmCallout() {
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (!payform) return
    // Исходные ссылки ищем строго внутри .xdget-dealInfo (наш блок в payform не попадёт сюда —
    // иначе на повторном build() спрятали бы собственную ссылку).
    var srcLinks = Array.prototype.filter.call(
      document.querySelectorAll('.xdget-dealInfo a'),
      function (a) {
        // Без якорей ^…$: текст достаточно специфичен, а строгое совпадение промахивалось
        // бы при вложенных тегах/&nbsp;/переносах внутри ссылки.
        return /Карточка заказа в CRM/i.test((a.textContent || '').trim())
      }
    )
    var existing = payform.querySelector('.pp-callout-crm')
    if (srcLinks.length === 0) {
      // Не админ — исходной строки нет → блок не показываем (и убираем, если был).
      if (existing) existing.remove()
      return
    }
    // DOM-свойство .href отдаёт абсолютный URL (getAttribute вернул бы сырой
    // относительный путь, который с target=_blank на ином домене дал бы 404).
    var href = srcLinks[0].href || '#'
    // Прячем исходные строки (оставляем только наш блок). Элементы остаются в DOM —
    // гейт по существованию ссылки на следующих build() сохраняется.
    srcLinks.forEach(function (a) {
      a.style.setProperty('display', 'none', 'important')
    })
    if (!existing) {
      existing = document.createElement('div')
      existing.className = 'pp-callout pp-callout-crm'
      payform.appendChild(existing)
    }
    // Содержимое строим безопасно (createElement + textContent + href), без innerHTML.
    // Идемпотентность: пересобираем только при смене href.
    if (existing.getAttribute('data-pp-crm-href') !== href) {
      existing.setAttribute('data-pp-crm-href', href)
      existing.textContent = ''
      var a = document.createElement('a')
      a.setAttribute('href', href)
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener')
      a.textContent = 'Карточка заказа в CRM'
      existing.appendChild(a)
    }
  }

  // applyConfigDrivenLabels(cfg): добавляет метки секций на основе конфига.
  // Вызывается ПОСЛЕ applyMethodConfig (когда cfg есть).
  // Скрывает пустые секции: метка добавляется только при наличии ВИДИМОГО метода.
  // Инлайн order с !important — перебивает stylesheet !important по специфичности (inline > sheet).
  function applyConfigDrivenLabels(cfg) {
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (!payform) return
    SECTION_ORDER.forEach(function (section, si) {
      var info = SECTION_LABELS[section]
      if (!info) return
      // Есть ли видимый метод этой секции: id из cfg.methods с section===section, el в DOM и не скрыт
      var hasVisible = Object.keys(cfg.methods).some(function (id) {
        var mc = cfg.methods[id]
        if (!mc || mc.section !== section) return false
        var el = resolveMethodEl(id, mc)
        return el && !el.dataset.ppHidden
      })
      if (!hasVisible) return // пустая секция — метку не добавляем
      var d = document.createElement('div')
      d.className = 'pay-section-label ' + info.cls
      d.textContent = info.text
      d.style.setProperty('order', String(si * 1000 - 1), 'important')
      payform.appendChild(d)
    })
  }

  // build(): сборка секций/меток/частичной оплаты. Полностью идемпотентна (все вставки —
  // через upsert/удаление перед повторной сборкой), поэтому безопасно вызывать многократно.
  // Методы GC подгружаются асинхронно — повторяем на ready/load/с задержкой, чтобы поздно
  // появившиеся методы тоже попали в секции.
  function build() {
    var payformBeforeCleanup = document.querySelector('.order-left-side .xdget-payform')
    if (payformBeforeCleanup) restoreOtherMethodsSpoiler(payformBeforeCleanup)

    // Upsert: убираем ВСЕ ранее вставленные метки перед повторной сборкой
    document
      .querySelectorAll(
        '.label-credit, .label-payparts, .label-recommended, .label-pay-methods, ' +
          '.label-rf-cards, .label-foreign-cards, .label-invoice, .pay-section-label'
      )
      .forEach(function (el) {
        el.remove()
      })

    var cfg = window.__PP_CONFIG__

    // === Заголовки секций карточной зоны ===
    var payform = document.querySelector('.order-left-side .xdget-payform')
    if (payform) {
      // Скрываем штатный внешний заголовок «Оплата банковскими картами» — его заменяют секц-метки
      document.querySelectorAll('.order-left-side .xdget-html p').forEach(function (p) {
        if (/Оплата банковскими картами/i.test(p.textContent)) {
          var block = p.closest('.xdget-html') || p
          block.style.display = 'none'
        }
      })

      if (!cfg || !cfg.methods) {
        // === Fallback-ветка: конфига нет — добавляем hasAny-метки ===
        var hasAny = function (sel) {
          return document.querySelector(sel) !== null
        }
        var addSectionLabel = function (cls, text) {
          var d = document.createElement('div')
          d.className = 'pay-section-label ' + cls
          d.textContent = text
          payform.appendChild(d)
        }

        if (hasAny('.order-left-side #sbp-pay')) {
          addSectionLabel('label-recommended', 'Рекомендуемые способы оплаты')
        }
        if (
          hasAny(
            '.order-left-side #yandex-pay, .order-left-side #sber-pay, ' +
              '.order-left-side #alpha-pay, .order-left-side #sber-sbp, ' +
              '.order-left-side #wb-pay, .order-left-side #tinkoff-pay, ' +
              '.order-left-side form[name="tinkoff_sbp"]'
          )
        ) {
          addSectionLabel('label-pay-methods', 'Pay-методы')
        }
        if (hasAny('.order-left-side .xdget-payform .gc-payment-method-card.made-RF')) {
          addSectionLabel('label-rf-cards', 'Оплата картами из РФ')
        }
        if (
          hasAny(
            '.order-left-side .xdget-payform .gc-payment-method-card.made-world, ' +
              '.order-left-side #PAYPAL'
          )
        ) {
          addSectionLabel('label-foreign-cards', 'Оплата зарубежными картами')
        }
      }
    }

    // === Частичная оплата под мобильной кнопкой ===
    // Штатный блок частичной оплаты (.part) лежит ВНУТРИ .total-cost, который на стопке
    // (≤991px) скрыт — вместе с ним пропадала бы частичная оплата. Клонируем его под
    // .confirm-mobile (клон .part-mobile виден только ≤991px, стилизация в payment-page.css).
    // Делаем здесь (после скрипта 08, заменяющего текст) — клон копирует уже корректный текст.
    var confirmMobile = document.querySelector('.order-left-side .confirm-mobile')
    document.querySelectorAll('.order-left-side .part-mobile').forEach(function (el) {
      el.remove()
    }) // upsert
    var partSrc = document.querySelector('.total-cost .part')
    if (confirmMobile && partSrc) {
      var partClone = partSrc.cloneNode(true)
      partClone.removeAttribute('id')
      partClone.removeAttribute('style')
      partClone.classList.add('part-mobile')
      partClone.querySelectorAll('[id]').forEach(function (el) {
        el.removeAttribute('id')
      })
      confirmMobile.insertAdjacentElement('afterend', partClone)
    }

    // === «Данные плательщика» — внутри сводки заказа, между составом и суммой ===
    placePayer()
    styleComposition()

    // === Применение серверного конфига методов (window.__PP_CONFIG__) ===
    // ИНВАРИАНТ: при отсутствии __PP_CONFIG__ поведение НЕ меняется (чистый fallback).
    ;(function applyMethodConfig() {
      if (!cfg || !cfg.methods) return // fallback: конфига нет — всё как было

      var isPartialPayment = false
      try {
        isPartialPayment = new URLSearchParams(window.location.search).has('paymentValue')
      } catch (e) {
        isPartialPayment = (window.location.search || '').indexOf('paymentValue=') !== -1
      }
      var hasServerTopUpFlag = !!(cfg.deal && typeof cfg.deal.hasTopUpPayment === 'boolean')
      var isTopUpPayment = !!(hasServerTopUpFlag && cfg.deal.hasTopUpPayment === true)
      if (!hasServerTopUpFlag) isTopUpPayment = detectTopUpPaymentFromDom()

      // Определяем сумму заказа из DOM (итог «Сумма для оплаты» → <b>).
      // Если определить нельзя — amount остаётся null, amount-фильтр пропускается.
      var amount = null
      var priceEl =
        document.querySelector('.total-cost .deal-finish-price-title b') ||
        document.querySelector('.mobile-total-cost .deal-finish-price-title b')
      if (priceEl) {
        var priceText = priceEl.textContent || ''
        // Удаляем пробелы и нечисловые символы кроме точки/запятой, парсим
        var numStr = priceText.replace(/[^\d.,]/g, '').replace(',', '.')
        var parsed = parseFloat(numStr)
        if (isFinite(parsed) && parsed > 0) amount = parsed
      }
      if (amount === null) {
        console.warn(
          '[pp-config] Не удалось определить сумму заказа из DOM — amount-фильтр пропущен'
        )
      }

      // Определяем offer-позиции заказа из DOM (.deal-positions li[data-offer-id]).
      // Если определить нельзя — positions остаётся null, offer-фильтр пропускается.
      var positions = null
      try {
        var liItems = document.querySelectorAll('.deal-positions li')
        if (liItems.length > 0) {
          positions = []
          liItems.forEach(function (li) {
            var id = (li.getAttribute('data-offer-id') || '').trim()
            if (id !== '') positions.push(id)
          })
          if (positions.length === 0) positions = null // нет data-offer-id — фильтр пропускаем
        }
      } catch (e) {
        console.warn('[pp-config] Ошибка при чтении позиций заказа:', e)
      }
      if (positions === null) {
        console.warn('[pp-config] Не удалось определить позиции заказа — offer-фильтр пропущен')
      }

      // Определяем форму для создания кастомных контейнеров
      var payformForCustom = document.querySelector('.order-left-side .xdget-payform')

      // Список methodId берём из cfg.methods (конфиг с сервера) — не хардкод.
      // Кастомные методы: ensureCustomContainer создаёт контейнер до resolveMethodEl.
      Object.keys(cfg.methods).forEach(function (methodId) {
        try {
          var methodCfg = cfg.methods[methodId]
          if (!methodCfg) return // нет конфига для этого метода — не трогаем

          // Для кастомных методов создаём/обновляем контейнер ДО resolveMethodEl.
          // Гейт строго по isSystem === false (не по «элемент отсутствует» — B-фикс).
          if (methodCfg.isSystem === false && payformForCustom) {
            ensureCustomContainer(methodId, methodCfg, payformForCustom)
          }

          // Ищем DOM-элемент метода через resolver (id/class) или fallback-конвенцию.
          var el = resolveMethodEl(methodId, methodCfg)
          if (!el) return // метод не в DOM — ничего не делаем

          // (1) enabled===false → скрыть карточку и пропустить всё остальное.
          //     setProperty(...,'important'): часть card-методов (#sbp-pay, #sber-sbp,
          //     #wb-pay, #alpha-pay) имеют `display:flex !important` в pp-style.css —
          //     инлайн без !important их не скрыл бы (sheet !important > inline без него),
          //     и метод оставался видимым со статическим отрицательным CSS order, всплывая
          //     в начало над метками секций.
          if (methodCfg.enabled === false) {
            el.style.setProperty('display', 'none', 'important')
            el.dataset.ppHidden = 'disabled'
            return
          }

          // Восстанавливаем, если ранее был скрыт этим же механизмом и теперь enabled
          if (el.dataset.ppHidden) {
            el.style.removeProperty('display')
            delete el.dataset.ppHidden
          }

          // (1a) Частичная оплата: скрыть метод, если оператор включил настройку
          //      «Скрывать при частичной оплате» и URL содержит paymentValue.
          if (isPartialPayment && methodCfg.hideOnPartialPayment === true) {
            el.style.setProperty('display', 'none', 'important')
            el.dataset.ppHidden = 'partial'
            return
          }

          // (1b) Доплата: скрыть метод, если по GC-заказу уже есть внесённая оплата.
          if (isTopUpPayment && methodCfg.hideOnTopUpPayment === true) {
            el.style.setProperty('display', 'none', 'important')
            el.dataset.ppHidden = 'topup'
            return
          }

          applySectionClass(el, methodCfg.section)

          // (2) Применяем label (непустой) к подписи кнопки метода.
          //     Меняем только текстовый узел/value — не сносим вложенные иконки.
          if (methodCfg.label) {
            var btn = el.querySelector(
              '.btn, .btn-info, .gc-payment-method-button, input[type="submit"]'
            )
            if (btn) {
              if (btn.value !== undefined && btn.type === 'submit') {
                btn.value = methodCfg.label
              } else {
                // Меняем первый текстовый узел-потомок
                var textNode = null
                btn.childNodes.forEach(function (n) {
                  if (!textNode && n.nodeType === 3 && n.nodeValue.trim()) {
                    textNode = n
                  }
                })
                if (textNode) {
                  textNode.nodeValue = methodCfg.label
                } else {
                  btn.textContent = methodCfg.label
                }
              }
            }
          }

          // (3) Применяем imageUrl (непустой) к изображению метода.
          if (methodCfg.imageUrl) {
            var img = el.querySelector('img')
            if (img) img.src = methodCfg.imageUrl
          }

          // (3a) Подпись метода (caption) — описательная строка под методом.
          //      Вставляется как блок .pp-method-caption внутрь карточки метода
          //      (последним потомком), поэтому держится визуально под кнопкой и
          //      переезжает вместе с методом при раскладке по CSS order. Пустая
          //      подпись удаляет ранее вставленный блок (идемпотентный upsert).
          //      textContent (а не innerHTML) — без HTML-инъекций (caption — план-текст).
          applyMethodCaption(el, methodCfg.caption)

          // (5) Amount-фильтр: скрыть если сумма вне диапазона [minAmount, maxAmount].
          //     Пропускаем если сумму не удалось определить.
          if (amount !== null) {
            var min = methodCfg.minAmount || 0
            var max = methodCfg.maxAmount || 0
            var outOfRange = (min > 0 && amount < min) || (max > 0 && amount > max)
            if (outOfRange) {
              el.style.setProperty('display', 'none', 'important')
              el.dataset.ppHidden = 'amount'
              return
            }
          }

          // (6) Offer-фильтр: скрыть/показать по whitelist/blacklist.
          //     Пропускаем если позиции не удалось определить или тип = 'off'.
          var listType = methodCfg.offerListType
          if (listType && listType !== 'off' && positions !== null) {
            var offerIds = Array.isArray(methodCfg.offerIds) ? methodCfg.offerIds : []
            // Проверяем пересечение позиций заказа с offerIds
            var hasIntersection = positions.some(function (posId) {
              return offerIds.indexOf(posId) !== -1
            })
            var shouldHide = listType === 'whitelist' ? !hasIntersection : hasIntersection
            if (shouldHide) {
              el.style.setProperty('display', 'none', 'important')
              el.dataset.ppHidden = 'offer'
              return
            }
          }

          // (4) Section/order — section-driven раскладка через инлайн CSS order с !important.
          //     Схема: sectionIndex * 1000 + position (без коллизий между секциями).
          //     Инлайн !important перебивает stylesheet !important (специфичность inline > sheet).
          var si = sectionIndex(methodCfg.section)
          if (si >= 0) {
            var ord =
              typeof methodCfg.order === 'number' && isFinite(methodCfg.order)
                ? Math.floor(methodCfg.order)
                : 0
            el.style.setProperty('order', String(si * 1000 + ord), 'important')
          }
          // Если si < 0 (неизвестная секция) — НЕ трогаем order, метод остаётся на своём месте
        } catch (e) {
          console.warn('[pp-config] Ошибка при обработке метода ' + methodId + ':', e)
        }
      })

      // FIX-4: зачистка осиротевших кастомных контейнеров — элементов с data-pp-custom,
      // чей методKey отсутствует в cfg.methods (например, после смены id метода).
      // Идемпотентно, защищает от «мёртвых» контейнеров при refetch.
      if (payformForCustom) {
        payformForCustom.querySelectorAll('[data-pp-custom]').forEach(function (node) {
          var key = node.getAttribute('data-pp-custom')
          if (key && !cfg.methods[key]) {
            node.remove()
          }
        })
      }

      // После применения конфига методов — добавляем метки секций (только непустых)
      applyConfigDrivenLabels(cfg)
      applyOtherMethodsSpoiler(cfg)
      updateRecommendedMixClass(cfg)
    })()
    // === Конец применения конфига ===

    // Fallback-ветка: DOM-перенос кредитных методов + метки — только когда конфига нет
    if (!cfg || !cfg.methods) {
      let credits = find(creditIds)
      let payParts = find(payPartsIds)
      let lastAnchor = null // последний размещённый элемент — к нему примыкает следующая секция

      // === Заголовок раздела «Безналичная оплата» — настоящий full-width лейбл перед #invoice ===
      // Раньше это был ::before у карточки #invoice, который НЕ переносил строку: при малом числе
      // методов выше карточка вставала рядом со «Сплит», и заголовок «плыл» во 2-ю колонку.
      // Лейбл (order:3, flex-basis:100%) форсирует новую строку, как «Рассрочки»/«Оплата по частям».
      var invoiceEl = document.querySelector('.order-left-side .xdget-payform #invoice')
      if (invoiceEl) {
        invoiceEl.insertAdjacentHTML(
          'beforebegin',
          '<div class="label-invoice">Безналичная оплата</div>'
        )
      }

      // Секция «Рассрочки»: метка перед первым найденным методом, затем переносим методы по порядку
      if (credits.length > 0) {
        credits[0].insertAdjacentHTML('beforebegin', `<div class="label-credit">Рассрочки</div>`)
        let anchor = document.querySelector('.label-credit')
        credits.forEach(function (el) {
          anchor.insertAdjacentElement('afterend', el)
          anchor = el
        })
        lastAnchor = anchor
      }

      // Секция «Оплата по частям»: всегда сразу после блока рассрочек (если он есть)
      if (payParts.length > 0) {
        if (lastAnchor !== null) {
          lastAnchor.insertAdjacentHTML(
            'afterend',
            `<div class="label-payparts">Оплата по частям</div>`
          )
        } else {
          payParts[0].insertAdjacentHTML(
            'beforebegin',
            `<div class="label-payparts">Оплата по частям</div>`
          )
        }
        let anchor = document.querySelector('.label-payparts')
        payParts.forEach(function (el) {
          anchor.insertAdjacentElement('afterend', el)
          anchor = el
        })
      }
    }

    // Чистка внутреннего содержимого кредитных карточек (идемпотентно):

    // 1. Убираем примечание «Только для клиентов банка / Заявка подаётся через СберБанк Онлайн»
    document
      .querySelectorAll('.xdget-payform .gc-payment-method-credit .margin-bottom-10')
      .forEach(function (el) {
        if (/Только для клиентов банка/i.test(el.textContent)) {
          el.remove()
        }
      })

    // 2. Нормализуем переносы строк в списках вариантов рассрочки:
    //    пустая строка перед первым пунктом и после последнего, без пустых строк между пунктами.
    //    Обёртка вариантов = любой контейнер (div, td, …), прямые потомки которого содержат
    //    и <label>, и <br> (у «Ресурс развития» список лежит в <td>, а не в <div>).
    //    Тонкость: часть лейблов в CSS блочные (display:block — #fresh-credit, #tinkoffcredit-2,
    //    #poscredit, #resource-razvitie, #yandex-split-improved), часть inline-block (остальные).
    //    У блочных каждый пункт и так на своей строке, поэтому <br> между ними даёт ЛИШНЮЮ пустую
    //    строку — между блочными пунктами <br> не ставим. У inline-block <br> нужен для переноса.
    document
      .querySelectorAll('.xdget-payform .gc-payment-method-credit *')
      .forEach(function (wrap) {
        let labels = Array.from(wrap.children).filter((c) => c.tagName === 'LABEL')
        let brs = Array.from(wrap.children).filter((c) => c.tagName === 'BR')
        if (labels.length === 0 || brs.length === 0) return

        let isBlock = getComputedStyle(labels[0]).display === 'block'

        // Сбрасываем все <br> и пересобираем детерминированно
        brs.forEach((br) => br.remove())
        if (isBlock) {
          // блочные пункты: переносятся сами; <br> только после последнего => пустая строка снизу
          labels[labels.length - 1].insertAdjacentElement('afterend', document.createElement('br'))
        } else {
          // inline-block пункты: <br> после каждого (последний => пустая строка снизу)
          labels.forEach((lbl) =>
            lbl.insertAdjacentElement('afterend', document.createElement('br'))
          )
        }
        labels[0].insertAdjacentElement('beforebegin', document.createElement('br')) // <br> перед первым => пустая строка сверху
      })

    // 3. Переименовываем заголовок метода «Счет на безналичную оплату» → «Оплата от юр. лица».
    //    Идемпотентно: ставим фиксированный текст только если ещё стоит исходная GC-подпись.
    var invoiceLabel = document.querySelector('#invoice tr > td:last-child > label')
    if (invoiceLabel && /Сч[её]т на безналичную оплату/i.test(invoiceLabel.textContent)) {
      invoiceLabel.textContent = 'Оплата от юр. лица'
    }

    // 4. Унифицируем подпись кнопок рассрочки: «Купить в рассрочку» → «Оформить рассрочку»
    //    (приводим к одной формулировке со «Сплитами»/прочими «Оформить …»). Кнопки
    //    «Показать варианты рассрочки» НЕ трогаем — у них другая логика (раскрытие списка
    //    сроков, а не подача заявки), переименование сбило бы смысл действия. Идемпотентно:
    //    после замены текст уже не совпадает с «Купить в рассрочку». Меняем только текстовый
    //    узел/value, чтобы не снести возможные вложенные иконки (font-size:0 + :before).
    document
      .querySelectorAll(
        '.xdget-payform .gc-payment-method-credit .btn, ' +
          '.xdget-payform .gc-payment-method-credit .btn-info, ' +
          '.xdget-payform .gc-payment-method-credit .gc-payment-method-button'
      )
      .forEach(function (btn) {
        var label = btn.value || btn.textContent || ''
        if (!/Купить в рассрочку/i.test(label) || /Показать варианты/i.test(label)) return
        if (btn.value && /Купить в рассрочку/i.test(btn.value)) {
          btn.value = btn.value.replace(/Купить в рассрочку/gi, 'Оформить рассрочку')
          return
        }
        var replaced = false
        btn.childNodes.forEach(function (node) {
          if (node.nodeType === 3 && /Купить в рассрочку/i.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(/Купить в рассрочку/gi, 'Оформить рассрочку')
            replaced = true
          }
        })
        if (!replaced) btn.textContent = 'Оформить рассрочку'
      })

    // 5. Коллаут-блок из серверного конфига (выше «Рекомендуемые способы оплаты»)
    applyCallout()

    // 6. Админский коллаут «Карточка заказа в CRM» (выше пользовательского коллаута;
    //    появляется только у админов — см. applyCrmCallout)
    applyCrmCallout()

    // 7. Логотип страницы оплаты — выше заголовка «Оплата заказа #...».
    applyPageLogo()
  }

  // Коллауты (.pp-callout / .pp-callout-crm) лежат внутри .xdget-payform, и делегированный
  // обработчик выбора метода у GC помечает клик-цель классом .picked (рамка-акцент, исчезает
  // фон-плашка) — коллаут «активируется» как несуществующий метод оплаты. Гасим это
  // capture-листенером на document: он срабатывает РАНЬШЕ обработчика GC (capture идёт
  // сверху вниз) и для кликов внутри коллаута останавливает распространение. stopPropagation
  // НЕ отменяет действие по умолчанию — ссылки внутри коллаута продолжают работать; выделение
  // текста (mousedown) не трогаем (глушим только click). Вешаем один раз.
  if (!window.__PP_CALLOUT_CLICK_GUARD__) {
    window.__PP_CALLOUT_CLICK_GUARD__ = true
    document.addEventListener(
      'click',
      function (e) {
        var t = e.target
        if (
          t &&
          t.closest &&
          t.closest(
            '.pp-callout-heading, .pp-callout, .pp-page-logo, .pp-other-methods-spoiler > summary'
          )
        ) {
          e.stopPropagation()
          if (e.stopImmediatePropagation) e.stopImmediatePropagation()
        }
      },
      true
    )
  }

  setTimeout(build, 0) // даём отработать извлечению/иконкам
  $(window).on('load', build) // и после полной загрузки страницы
  $(window).on('resize', function () {
    applyCallout()
    applyPageLogo()
  }) // переставляем верхние блоки при смене мобильной/ПК раскладки
  setTimeout(build, 1600) // ретраи на случай поздней асинхронной догрузки методов
  setTimeout(build, 3600)
})
