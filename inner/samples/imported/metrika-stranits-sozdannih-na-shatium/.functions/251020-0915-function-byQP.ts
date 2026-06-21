async function main(ctx: app.Ctx) {
  const { apiGetEngagementStatsRoute, apiGetScrollHeatmapRoute } = await import('/api/analytics')

  // Тест 1: engagement-stats
  const engagementResult = await apiGetEngagementStatsRoute
    .query({
      period: '30'
    })
    .run(ctx)

  // Тест 2: scroll-heatmap для /pu-v2-8
  const heatmapResult = await apiGetScrollHeatmapRoute
    .query({
      path: '/pu-v2-8'
    })
    .run(ctx)

  return {
    engagement: {
      success: engagementResult.success,
      dataCount: engagementResult.data?.length || 0,
      sample: engagementResult.data?.slice(0, 3)
    },
    heatmap: {
      success: heatmapResult.success,
      totalUsers: heatmapResult.totalUsers,
      dataRanges: heatmapResult.data?.map((d) => ({
        range: d.depth_range,
        users: d.users_count,
        percent: d.percentage
      }))
    }
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
