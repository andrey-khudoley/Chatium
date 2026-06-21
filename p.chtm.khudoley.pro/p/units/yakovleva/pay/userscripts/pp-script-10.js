// Скрываем рассрочки при частичной оплате
// xdgetId: r7321
$(function () {
  if (window.__PP_CONFIG__ && window.__PP_CONFIG__.methods) return

  let url = window.location.href

  if (url.indexOf('?paymentValue') != -1) {
    ;[
      '#vsegdada',
      '#alpha-bank-podeli',
      '#tinkoff-dolyame',
      '#yandex-split',
      '#yandex-split-improved'
    ].forEach(function (sel) {
      var el = document.querySelector(sel)
      if (el) {
        el.style.display = 'none'
        el.dataset.hiddenByPartial = '1'
      }
    })
  }
})
