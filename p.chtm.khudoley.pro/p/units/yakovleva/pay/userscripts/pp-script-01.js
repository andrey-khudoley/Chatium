// Вытаскивание методов из контейнеров-обёрток GetCourse и БЕЗОПАСНОЕ скрытие пустых обёрток.
// Принцип: платёжный метод НИКОГДА не должен оказаться скрытым.
// Поэтому сначала выносим все методы (form/div) из обёртки наружу, и только если внутри
// не осталось ни одного «методоподобного» элемента — скрываем саму обёртку (через JS, не CSS).
// Скрытие этих обёрток намеренно НЕ дублируется в CSS: при сбое JS метод тогда останется
// видимым (безопасный режим деградации), а не исчезнет под `display:none`.
// xdgetId: r7449
$(function () {
  // box  — контейнер GC, из которого выносим методы.
  // hide — что скрываем после извлечения (для альт-блока это родительская обёртка -main).
  var wrappers = [
    { box: '.alternative-payments-block', hide: '.alternative-payments-block-main' },
    { box: '#alternative-methods-container', hide: '#alternative-methods-container' },
    { box: '#pay-methods', hide: '#pay-methods' },
    { box: '.credit-payments-block', hide: '.credit-payments-block' }
  ]

  // Теги, которые точно не являются платёжным методом и не мешают скрыть пустую обёртку.
  var SAFE_TAGS = { STYLE: 1, SCRIPT: 1, BR: 1, LINK: 1, NOSCRIPT: 1, HR: 1 }

  function extractAll() {
    wrappers.forEach(function (w) {
      var $box = $(w.box)
      if (!$box.length) return
      var $hide = $(w.hide)
      if (!$hide.length) return // некуда выносить — обёртку не трогаем, метод остаётся как есть

      // 1) Выносим все потенциальные методы (form/div) наружу, перед скрываемым блоком.
      //    Идемпотентно: при повторном запуске методы уже вынесены, внутри form/div не осталось.
      $box.children('form, div').each(function () {
        $(this).insertBefore($hide)
      })

      // 2) Скрываем обёртку ТОЛЬКО если внутри не осталось ничего методоподобного.
      //    Любой неожиданный непустой элемент (не style/script/br/…) => НЕ скрываем и предупреждаем,
      //    чтобы никогда не спрятать платёжный метод, который не удалось извлечь.
      var leftover = $box.children().filter(function () {
        return !SAFE_TAGS[this.tagName]
      })
      if (leftover.length === 0) {
        $hide.hide()
      } else if (window.console && console.warn) {
        console.warn(
          '[GC payment] обёртка ' +
            w.box +
            ' содержит неизвлечённый элемент — НЕ скрыта во избежание потери метода оплаты',
          leftover.toArray()
        )
      }
    })
  }

  // Методы оплаты GC подгружаются асинхронно (после DOMReady). Извлечение идемпотентно,
  // поэтому повторяем его на window.load и с задержкой — чтобы поздно появившиеся методы
  // тоже были вынесены наружу, а обёртки/тоггл «Альтернативный способ» — скрыты.
  extractAll()
  $(window).on('load', extractAll)
  setTimeout(extractAll, 1500)
  setTimeout(extractAll, 3500)
})
