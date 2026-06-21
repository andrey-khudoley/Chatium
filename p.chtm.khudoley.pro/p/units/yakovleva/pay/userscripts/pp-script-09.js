// Замена текста в блоке Итоговой стоимости
// xdgetId: r5046
// GC-оригиналы фиксированы как константы — не зависим от того, запускался ли скрипт раньше
var GC_TOTAL_VARIANTS = ['Итого к оплате', 'Сумма текущего платежа']
var GC_TOTAL_REPLACEMENTS = { 'Итого к оплате': 'Итого', 'Сумма текущего платежа': 'К оплате' }

$(function () {
  var el = $('.total-cost .deal-finish-price-title:not(b)')[0]
  var mobileEl = $('.mobile-total-cost .deal-finish-price-title:not(b)')[0]
  if (!el) return

  // Нормализуем к GC-оригиналу (откатываем предыдущую замену если была)
  var html = el.innerHTML
  Object.keys(GC_TOTAL_REPLACEMENTS).forEach(function (orig) {
    html = html.replace(GC_TOTAL_REPLACEMENTS[orig], orig)
  })

  // Применяем замену
  GC_TOTAL_VARIANTS.forEach(function (orig) {
    if (html.indexOf(orig) !== -1) {
      var result = html.replace(orig, GC_TOTAL_REPLACEMENTS[orig])
      $(el).html(result)
      if (mobileEl) $(mobileEl).html(result)
    }
  })
})
