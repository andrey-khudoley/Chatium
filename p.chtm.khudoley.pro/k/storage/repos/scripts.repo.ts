import ScriptsTable from '../tables/scripts.table'

export async function findAll(ctx: app.Ctx, order: [string, string][] = [['createdAt', 'DESC']]) {
  return ScriptsTable.findAll(ctx, { order })
}

export async function findById(ctx: app.Ctx, id: string) {
  return ScriptsTable.findById(ctx, id)
}

export async function findByName(ctx: app.Ctx, name: string) {
  return ScriptsTable.findOneBy(ctx, { name })
}

export async function create(
  ctx: app.Ctx,
  data: { name: string; description: string; type: string; content: string }
) {
  return ScriptsTable.create(ctx, data)
}

export async function update(
  ctx: app.Ctx,
  data: { id: string; name?: string; description?: string; type?: string; content?: string }
) {
  return ScriptsTable.update(ctx, data)
}

export async function deleteById(ctx: app.Ctx, id: string) {
  return ScriptsTable.delete(ctx, id)
}
