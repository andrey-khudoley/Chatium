import { queryAi } from '@traffic/sdk'

async function main(ctx) {
  // Проверим структуру таблицы events и наличие данных
  const testQuery = `
    SELECT *
    FROM chatium_ai.events
    WHERE action = 'scrollDepth'
    LIMIT 5
  `

  const result = await queryAi(ctx, testQuery)

  return {
    rowsCount: result.rows.length,
    sampleRows: result.rows,
    columns: Object.keys(result.rows[0] || {})
  }
}

return await main(ctx)

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
