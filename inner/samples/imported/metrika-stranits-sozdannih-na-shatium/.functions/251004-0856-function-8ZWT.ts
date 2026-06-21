// Проверим какие поля есть в meetings и сколько там записей
import MeetingsTable from '../aurora/admin/tables/meetings.table'

async function main(ctx) {
  const meetings = await MeetingsTable.findAll(ctx, {
    limit: 5,
    order: [{ createdAt: 'desc' }]
  })

  const totalCount = await MeetingsTable.countBy(ctx, {})

  return {
    totalMeetings: totalCount,
    sampleMeetings: meetings.map((m) => ({
      id: m.id,
      clientId: m.clientId,
      userId: m.userId,
      createdAt: m.createdAt,
      fields: Object.keys(m)
    }))
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
