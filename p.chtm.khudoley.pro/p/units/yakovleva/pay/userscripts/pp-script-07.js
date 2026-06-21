// Оплата с бонусного баланса
// xdgetId: r3941
$(function () {
  var appearBalanceForm = $('.xdget-payform #yw0').html()
  if (appearBalanceForm !== undefined) {
    $('.xdget-payform #yw0').css('display', 'none')
    $('.confirm-pay').css('display', 'none')
    $('.confirm-mobile').css('display', 'none')
    $('.balance-pay').css('display', 'block')
    $('.pay-methods-text').css('display', 'none')
  }

  $('.balance-pay')
    .off('click.balance')
    .on('click.balance', function () {
      $('.xdget-payform #yw0 button.btn').click()
    })
})
