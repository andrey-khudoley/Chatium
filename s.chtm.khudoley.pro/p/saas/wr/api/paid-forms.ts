import FormSubmissions from '../tables/form_submissions.table'

// @shared-route
export const apiPaidFormIdsRoute = app.get('/my-paid-forms', async (ctx, req) => {
  if (!ctx.user) {
    return { paidFormIds: [] }
  }

  const submissions = await FormSubmissions.findAll(ctx, {
    where: {
      user: ctx.user.id,
      paymentId: { $not: null }
    },
    limit: 200
  })

  const paidFormIds = [...new Set(submissions.map((s) => s.form?.id).filter(Boolean))]

  return { paidFormIds }
})
