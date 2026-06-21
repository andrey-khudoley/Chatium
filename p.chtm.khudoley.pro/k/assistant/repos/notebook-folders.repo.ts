import NotebookFolders, { type NotebookFoldersRow } from '../tables/notebook-folders.table'

export type NotebookFolderDto = {
  id: string
  name: string
  color: string
  sortOrder: number
  isArchived: boolean
}

function rowToDto(row: NotebookFoldersRow): NotebookFolderDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
    isArchived: row.isArchived
  }
}

export async function findByUserId(
  ctx: app.Ctx,
  userId: string,
  includeArchived = false
): Promise<NotebookFolderDto[]> {
  const where: Record<string, unknown> = { userId }
  if (!includeArchived) where.isArchived = false
  const rows = await NotebookFolders.findAll(ctx, {
    where,
    order: [{ sortOrder: 'asc' }]
  })
  return rows.map(rowToDto)
}

async function nextSortOrder(ctx: app.Ctx, userId: string): Promise<number> {
  const rows = await NotebookFolders.findAll(ctx, {
    where: { userId },
    order: [{ sortOrder: 'desc' }],
    limit: 1
  })
  return (rows[0]?.sortOrder ?? 0) + 1
}

export async function createForUser(
  ctx: app.Ctx,
  userId: string,
  data: { name: string; color: string }
): Promise<NotebookFolderDto> {
  const sortOrder = await nextSortOrder(ctx, userId)
  const row = await NotebookFolders.create(ctx, {
    userId,
    name: data.name.trim() || 'Новая папка',
    color: data.color || '#888888',
    sortOrder,
    isArchived: false
  })
  return rowToDto(row)
}

async function assertOwner(ctx: app.Ctx, userId: string, id: string): Promise<NotebookFoldersRow | null> {
  const row = await NotebookFolders.findById(ctx, id)
  if (!row || row.userId !== userId) return null
  return row
}

export async function updateForUser(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: { name?: string; color?: string }
): Promise<NotebookFolderDto | null> {
  const existing = await assertOwner(ctx, userId, id)
  if (!existing) return null
  const row = await NotebookFolders.update(ctx, {
    id,
    ...(data.name !== undefined ? { name: data.name.trim() || existing.name } : {}),
    ...(data.color !== undefined ? { color: data.color } : {})
  })
  return rowToDto(row)
}

export async function deleteForUser(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await assertOwner(ctx, userId, id)
  if (!existing) return false
  await NotebookFolders.delete(ctx, id)
  return true
}

export async function archiveForUser(
  ctx: app.Ctx,
  userId: string,
  id: string,
  isArchived: boolean
): Promise<NotebookFolderDto | null> {
  const existing = await assertOwner(ctx, userId, id)
  if (!existing) return null
  const row = await NotebookFolders.update(ctx, { id, isArchived })
  return rowToDto(row)
}

export async function reorderForUser(
  ctx: app.Ctx,
  userId: string,
  orderedIds: string[]
): Promise<boolean> {
  const folders = await NotebookFolders.findAll(ctx, { where: { userId } })
  const idSet = new Set(folders.map((f) => f.id))
  if (orderedIds.length !== idSet.size || orderedIds.some((id) => !idSet.has(id))) {
    return false
  }
  const offset = 1_000_000
  let i = 0
  for (const fId of orderedIds) {
    await NotebookFolders.update(ctx, { id: fId, sortOrder: offset + i })
    i++
  }
  i = 0
  for (const fId of orderedIds) {
    await NotebookFolders.update(ctx, { id: fId, sortOrder: i })
    i++
  }
  return true
}
