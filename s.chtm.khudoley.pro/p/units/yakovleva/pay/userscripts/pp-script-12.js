// Цена предложения в листе позиций
// xdgetId: r7664
$(function () {
  let dealPositions = document.querySelectorAll('.order-left-side .main-info .deal-positions li')
  if (dealPositions.length !== 1) return

  let priceEl = dealPositions[0].querySelector('.deal-position-price')
  if (priceEl.innerText === '' || priceEl.dataset.filledByScript) {
    let actualPrice = document.querySelector('.right-info p:nth-of-type(1) b').innerText
    priceEl.innerText = actualPrice
    priceEl.dataset.filledByScript = '1'
  }
})
