async function main() {
  // Читаем код из /waitroom-analytics
  const fs = await import('@app/fs')

  try {
    const code = await fs.readFile('/waitroom-analytics/api/analytics.ts', 'utf-8')
    return { success: true, code: code.slice(0, 15000) }
  } catch (e) {
    return { error: e.message }
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
