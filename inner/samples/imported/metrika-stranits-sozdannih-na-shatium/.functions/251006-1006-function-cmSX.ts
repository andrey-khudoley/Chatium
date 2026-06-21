import { readFileFromWorkspace } from '@app/workspace'

async function main() {
  const analyticsApi = await readFileFromWorkspace(ctx, '/waitroom-analytics', 'api/analytics.ts')
  const analyticsPage = await readFileFromWorkspace(
    ctx,
    '/waitroom-analytics',
    'pages/AnalyticsPage.vue'
  )

  return {
    analyticsApi,
    analyticsPage
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
