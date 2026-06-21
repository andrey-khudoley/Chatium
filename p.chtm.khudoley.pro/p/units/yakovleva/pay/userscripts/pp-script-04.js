// Проверка нажатия по координатам на "?"
// xdgetId: r6877
$(function () {
  $('.mobile-total-cost .deal-finish-price-title')
    .off('click.scrollqm')
    .on('click.scrollqm', function () {
      if (this.offsetWidth - event.offsetX >= 4 && this.offsetWidth - event.offsetX <= 13) {
        $('html,body').animate({ scrollTop: $('.total-cost').offset().top }, 600)
      }
    })
})
