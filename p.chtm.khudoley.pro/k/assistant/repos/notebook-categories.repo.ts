import NotebookCategories, { type NotebookCategoriesRow } from '../tables/notebook-categories.table'

export type NotebookCategoryDto = {
  id: string
  name: string
  color: string
  sortOrder: number
}

function rowToDto(row: NotebookCategoriesRow): NotebookCategoryDto {
  return { id: row.id, name: row.name, color: row.color, sortOrder: row.sortOrder }
}

export async function findByUserId(ctx: app.Ctx, userId: string): Promise<NotebookCategoryDto[]> {
  const rows = await NotebookCategories.findAll(ctx, {
    where: { userId },
    order: [{ sortOrder: 'asc' }]
  })
  return rows.map(rowToDto)
}

async function nextSortOrder(ctx: app.Ctx, userId: string): Promise<number> {
  const rows = await NotebookCategories.findAll(ctx, {
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
): Promise<NotebookCategoryDto> {
  const sortOrder = await nextSortOrder(ctx, userId)
  const row = await NotebookCategories.create(ctx, {
    userId,
    name: data.name.trim() || 'Новая категория',
    color: data.color || '#888888',
    sortOrder
  })
  return rowToDto(row)
}

async function assertOwner(ctx: app.Ctx, userId: string, id: string): Promise<NotebookCategoriesRow | null> {
  const row = await NotebookCategories.findById(ctx, id)
  if (!row || row.userId !== userId) return null
  return row
}

export async function updateForUser(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: { name?: string; color?: string }
): Promise<NotebookCategoryDto | null> {
  const existing = await assertOwner(ctx, userId, id)
  if (!existing) return null
  const row = await NotebookCategories.update(ctx, {
    id,
    ...(data.name !== undefined ? { name: data.name.trim() || existing.name } : {}),
    ...(data.color !== undefined ? { color: data.color } : {})
  })
  return rowToDto(row)
}

export async function deleteForUser(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await assertOwner(ctx, userId, id)
  if (!existing) return false
  await NotebookCategories.delete(ctx, id)
  return true
}
