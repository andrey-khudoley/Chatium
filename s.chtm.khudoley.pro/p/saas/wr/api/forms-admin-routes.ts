// @shared

import { requireAccountRole } from '@app/auth'
import { s } from '@app/schema'
import { reporterApp } from '../shared/error-handler-middleware'
import { FormSubmitAction } from '../shared/enum'
import EpisodeForms from '../tables/episode_forms.table'

// @shared-route
export const apiFormsAllRoute = reporterApp.get('/all', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const forms = await EpisodeForms.findAll(ctx, {
    order: [{ createdAt: 'desc' }],
    limit: 200
  })
  return forms
})

// @shared-route
export const apiFormsSearchRoute = reporterApp.get('/search', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const query = ((req.query.q as string) || '').trim()

  if (!query) {
    // Если пустой поиск - возвращаем все
    return await EpisodeForms.findAll(ctx, {
      order: [{ createdAt: 'desc' }],
      limit: 200
    })
  }

  // Ищем через $ilike по title
  const forms = await EpisodeForms.findAll(ctx, {
    where: {
      title: { $ilike: `%${query}%` }
    },
    order: [{ createdAt: 'desc' }],
    limit: 200
  })

  return forms
})

// @shared-route
export const apiFormCreateRoute = reporterApp
  .body((s) => ({
    title: s.string(),
    buttonText: s.string(),
    buttonColor: s.string().optional(),
    fields: s.any(),
    submitAction: s.enum(FormSubmitAction),
    thankYouTitle: s.string().optional(),
    thankYouText: s.string().optional(),
    redirectUrl: s.string().optional(),
    paymentAmount: s.number().optional(),
    paymentCurrency: s.string().optional(),
    paymentDescription: s.string().optional(),
    paymentOldPrice: s.number().optional(),
    paymentProviders: s.any().optional()
  }))
  .post('/create', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const count = await EpisodeForms.countBy(ctx, {})

    const form = await EpisodeForms.create(ctx, {
      title: req.body.title,
      buttonText: req.body.buttonText,
      buttonColor: req.body.buttonColor,
      fields: req.body.fields,
      submitAction: req.body.submitAction,
      thankYouTitle: req.body.thankYouTitle,
      thankYouText: req.body.thankYouText,
      redirectUrl: req.body.redirectUrl,
      paymentAmount: req.body.paymentAmount,
      paymentCurrency: req.body.paymentCurrency || 'RUB',
      paymentDescription: req.body.paymentDescription,
      paymentOldPrice: req.body.paymentOldPrice,
      paymentProviders: req.body.paymentProviders,
      sortOrder: count
    })

    return form
  })

// @shared-route
export const apiFormUpdateRoute = reporterApp
  .body((s) => ({
    title: s.string().optional(),
    buttonText: s.string().optional(),
    buttonColor: s.string().optional(),
    fields: s.any().optional(),
    submitAction: s.enum(FormSubmitAction).optional(),
    thankYouTitle: s.string().optional(),
    thankYouText: s.string().optional(),
    redirectUrl: s.string().optional(),
    paymentAmount: s.number().optional(),
    paymentCurrency: s.string().optional(),
    paymentDescription: s.string().optional(),
    paymentOldPrice: s.number().optional(),
    paymentProviders: s.any().optional()
  }))
  .post('/update/:id', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const form = await EpisodeForms.update(ctx, {
      id: req.params.id as string,
      ...req.body
    })

    return form
  })

// @shared-route
export const apiFormDeleteRoute = reporterApp.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await EpisodeForms.delete(ctx, req.params.id as string)
  return { success: true }
})
