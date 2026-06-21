// Если есть частичная оплата, то заменяем текст внутри
// xdgetId: r8570
// GC-оригинал фиксирован как константа — не зависим от предыдущего запуска
var GC_PARTIAL_ORIG = 'Этот заказ можно оплатить частично'
var GC_PARTIAL_TARGET = 'Сумма частичной оплаты'

$(function () {
  if ($('.total-cost .xdget-partialpay').length) {
    var span = $('.xdget-partialpay span')[0]
    // Нормализуем к оригиналу (откатываем предыдущую замену если была), затем применяем
    var html = span.innerHTML.replace(GC_PARTIAL_TARGET, GC_PARTIAL_ORIG)
    $(span).html(html.replace(GC_PARTIAL_ORIG, GC_PARTIAL_TARGET))
  }
})
