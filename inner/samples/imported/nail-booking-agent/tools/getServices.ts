import { servicesConfig } from '../config/services'

app.accountHook('@start/agent/tools', async (ctx, params) => {
  return getServicesTool
})

export const getServicesTool = app
  .function('/get-services')
  .meta({
    name: 'get-services',
    description: `Use this tool to get the list of available nail services with their descriptions, prices, and duration. Use this when user asks about services, prices, or what is available.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object({}, { additionalProperties: true })
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('🛠️ getServicesTool', { json: body })

    const services = servicesConfig.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      currency: service.currency,
      duration: service.duration
    }))

    return {
      ok: true,
      services
    }
  })
