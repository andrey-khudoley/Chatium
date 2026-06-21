import { jsx } from '@app/html-jsx'
import PaymentSuccessPage from './pages/PaymentSuccessPage.vue'
import { headContent } from './styles'

// @shared-route
export const paymentSuccessRoute = app.get('/:submissionId', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Оплата прошла успешно</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {headContent}
      </head>
      <body>
        <PaymentSuccessPage submissionId={req.params.submissionId} />
      </body>
    </html>
  )
})
