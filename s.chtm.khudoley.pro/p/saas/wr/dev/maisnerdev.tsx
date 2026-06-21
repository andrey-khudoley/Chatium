import { requireAccountRole } from '@app/auth'
import TWebinarRoomWebinarRoomFormSubmissions from '../tables/form_submissions.table'

app.screen('/', async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const total = await TWebinarRoomWebinarRoomFormSubmissions.countBy(ctx)
  const migratedCount = await TWebinarRoomWebinarRoomFormSubmissions.countBy(ctx, {
    __migrated: true
  })

  return (
    <screen>
      <text>
        {migratedCount.toString()} / {total.toString()}
      </text>

      <button title={'call api call'} onClick={api.apiCall()} class={['section', 'primary']} />
    </screen>
  )
})

const api = app.apiCall('api', async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const batch = await TWebinarRoomWebinarRoomFormSubmissions.findAll(ctx, {
    limit: 20,
    where: { __migrated: { $not: true } }
  })

  for (const record of batch) {
    await TWebinarRoomWebinarRoomFormSubmissions.update(ctx, {
      id: record.id,
      __migrated: true,
      phone: record.data['телефон'],
      email: record.data['email'],
      name: record.data['имя'],
      status: !!record.paymentId ? 'paid' : 'not_paid'
    })
  }

  if (batch.length === 20) {
    return api.apiCall()
  }
})
