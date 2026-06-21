import { queryAi } from '@app/datascience'

async function main() {
  // Получим список зарегистрированных пользователей с их ID
  const result = await queryAi(`
    SELECT DISTINCT
      user_id,
      user_phone,
      user_email,
      user_telegram_id
    FROM events
    WHERE event_type = 'registration'
    LIMIT 20
  `)

  return result
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
