// Закрываем кнопку оплаты если истёк срок
// xdgetId: r232
$(function () {
  var expireText = $('.total-cost .order-info > div').text()
  if (expireText === 'Срок действия предложения закончен') {
    $('.confirm-pay').css('display', 'none')
  }
})
