// Выводим поле промокода в нужное место
// xdgetId: r2740
$(function () {
  $('.promo-zone a.dotted-link')
    .off('click.promo')
    .on('click.promo', function () {
      $('.order-left-side #promoCode').css('display', 'none')
      $('.promo-zone #promoCode').toggle()
    })
})
