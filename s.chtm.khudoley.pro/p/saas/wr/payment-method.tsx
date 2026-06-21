import { jsx } from '@app/html-jsx'
import PaymentMethodPage from './pages/PaymentMethodPage.vue'
import { headContent } from './styles'
import FormSubmissions from './tables/form_submissions.table'
import { paymentSuccessRoute } from './payment-success'

// @shared-route
export const paymentMethodRoute = app.get('/:submissionId', async (ctx, req) => {
  // Проверяем, была ли уже оплата
  const submission = await FormSubmissions.findById(ctx, req.params.submissionId as string)

  if (submission?.paymentId) {
    // Если оплата уже была — редиректим на страницу благодарности
    return ctx.resp.redirect(paymentSuccessRoute({ submissionId: submission.id }).url())
  }

  return (
    <html>
      <head>
        <title>Выбор способа оплаты</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {headContent}
      </head>
      <body>
        <PaymentMethodPage submissionId={req.params.submissionId} />
      </body>
    </html>
  )
})
