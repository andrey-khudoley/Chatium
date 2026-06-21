import LeadsPuV11 from '../pu-v1-1/tables/leads.table'

async function main() {
  // Получаем первую запись чтобы увидеть структуру
  const sample = await LeadsPuV11.findAll(ctx, { limit: 1 })
  return {
    sample: sample[0],
    fields: sample[0] ? Object.keys(sample[0]) : []
  }
}

app.function('/').handle(async (ctx) => {
  try {
    return {
      success: true,
      result: await main(ctx)
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message
    }
  }
})
