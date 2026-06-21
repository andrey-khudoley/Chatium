import JournalNotes, { type JournalNotesRow } from '../tables/journal-notes.table'

export type JournalNoteSummary = {
  id: string
  title: string
  folderId: string | null
  categoryIds: string[]
  linkedTaskId: string | null
  linkedProjectId: string | null
  linkedClientId: string | null
  noteDate: string | null
  isArchived: boolean
  sortOrder: number
}

function parseCategoryIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function rowToSummary(row: JournalNotesRow): JournalNoteSummary {
  return {
    id: row.id,
    title: row.title,
    folderId: row.folderId ?? null,
    categoryIds: parseCategoryIds(row.categoryIds),
    linkedTaskId: row.linkedTaskId ?? null,
    linkedProjectId: row.linkedProjectId ?? null,
    linkedClientId: row.linkedClientId ?? null,
    noteDate: row.noteDate ?? null,
    isArchived: row.isArchived ?? false,
    sortOrder: row.sortOrder ?? 0
  }
}

export async function findSummariesByUserId(
  ctx: app.Ctx,
  userId: string,
  opts?: { includeArchived?: boolean }
): Promise<JournalNoteSummary[]> {
  const rows = await JournalNotes.findAll(ctx, {
    where: { userId },
    order: [{ sortOrder: 'asc' }]
  })
  const includeArchived = opts?.includeArchived ?? false
  const mapped = rows.map(rowToSummary)
  if (includeArchived) return mapped
  return mapped.filter((n) => !n.isArchived)
}

async function nextSortOrder(ctx: app.Ctx, userId: string, folderId?: string | null): Promise<number> {
  const where: Record<string, unknown> = { userId }
  if (folderId) {
    where.folderId = folderId
  }
  const rows = await JournalNotes.findAll(ctx, {
    where,
    order: [{ sortOrder: 'desc' }],
    limit: 1
  })
  return (rows[0]?.sortOrder ?? 0) + 1
}

export interface CreateNoteData {
  title: string
  content: string
  folderId?: string | null
  categoryIds?: string[]
  linkedTaskId?: string | null
  linkedProjectId?: string | null
  linkedClientId?: string | null
  noteDate?: string | null
}

export async function createForUser(
  ctx: app.Ctx,
  userId: string,
  data: CreateNoteData
): Promise<JournalNotesRow> {
  const sortOrder = await nextSortOrder(ctx, userId, data.folderId)
  return JournalNotes.create(ctx, {
    userId,
    title: data.title,
    content: data.content,
    sortOrder,
    isArchived: false,
    ...(data.folderId ? { folderId: data.folderId } : {}),
    ...(data.categoryIds?.length ? { categoryIds: JSON.stringify(data.categoryIds) } : {}),
    ...(data.linkedTaskId ? { linkedTaskId: data.linkedTaskId } : {}),
    ...(data.linkedProjectId ? { linkedProjectId: data.linkedProjectId } : {}),
    ...(data.linkedClientId ? { linkedClientId: data.linkedClientId } : {}),
    ...(data.noteDate ? { noteDate: data.noteDate } : {})
  })
}

export async function findByIdForUser(
  ctx: app.Ctx,
  userId: string,
  id: string
): Promise<JournalNotesRow | null> {
  const row = await JournalNotes.findById(ctx, id)
  if (!row || row.userId !== userId) {
    return null
  }
  return row
}

export interface UpdateNoteData {
  title?: string
  content?: string
  folderId?: string | null
  categoryIds?: string[]
  linkedTaskId?: string | null
  linkedProjectId?: string | null
  linkedClientId?: string | null
  noteDate?: string | null
  isArchived?: boolean
}

export async function updateForUser(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: UpdateNoteData
): Promise<JournalNotesRow | null> {
  const existing = await findByIdForUser(ctx, userId, id)
  if (!existing) return null

  const patch: Record<string, unknown> = { id }
  if (data.title !== undefined) patch.title = data.title
  if (data.content !== undefined) patch.content = data.content
  if (data.folderId !== undefined) {
    patch.folderId = data.folderId ?? (null as JournalNotesRow['folderId'])
  }
  if (data.categoryIds !== undefined) {
    patch.categoryIds = data.categoryIds.length > 0
      ? JSON.stringify(data.categoryIds)
      : (null as JournalNotesRow['categoryIds'])
  }
  if (data.linkedTaskId !== undefined) {
    patch.linkedTaskId = data.linkedTaskId ?? (null as JournalNotesRow['linkedTaskId'])
  }
  if (data.linkedProjectId !== undefined) {
    patch.linkedProjectId = data.linkedProjectId ?? (null as JournalNotesRow['linkedProjectId'])
  }
  if (data.linkedClientId !== undefined) {
    patch.linkedClientId = data.linkedClientId ?? (null as JournalNotesRow['linkedClientId'])
  }
  if (data.noteDate !== undefined) {
    patch.noteDate = data.noteDate ?? (null as JournalNotesRow['noteDate'])
  }
  if (data.isArchived !== undefined) {
    patch.isArchived = data.isArchived
  }

  return JournalNotes.update(ctx, patch as Parameters<typeof JournalNotes.update>[1])
}

export async function deleteByIdForUser(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await findByIdForUser(ctx, userId, id)
  if (!existing) return false
  await JournalNotes.delete(ctx, id)
  return true
}

export async function reorderForUser(
  ctx: app.Ctx,
  userId: string,
  orderedIds: string[],
  folderId?: string | null
): Promise<boolean> {
  const where: Record<string, unknown> = { userId }
  if (folderId) where.folderId = folderId
  const notes = await JournalNotes.findAll(ctx, { where })
  const targetNotes = folderId
    ? notes.filter((n) => n.folderId === folderId)
    : notes.filter((n) => !n.folderId)
  const idSet = new Set(targetNotes.map((n) => n.id))
  if (orderedIds.length !== idSet.size || orderedIds.some((nId) => !idSet.has(nId))) {
    return false
  }
  const offset = 1_000_000
  let i = 0
  for (const nId of orderedIds) {
    await JournalNotes.update(ctx, { id: nId, sortOrder: offset + i })
    i++
  }
  i = 0
  for (const nId of orderedIds) {
    await JournalNotes.update(ctx, { id: nId, sortOrder: i })
    i++
  }
  return true
}

export async function bulkArchiveForUser(
  ctx: app.Ctx,
  userId: string,
  ids: string[],
  isArchived: boolean
): Promise<number> {
  let count = 0
  for (const id of ids) {
    const row = await findByIdForUser(ctx, userId, id)
    if (row) {
      await JournalNotes.update(ctx, { id, isArchived })
      count++
    }
  }
  return count
}

export async function bulkMoveToFolderForUser(
  ctx: app.Ctx,
  userId: string,
  ids: string[],
  folderId: string | null
): Promise<number> {
  let count = 0
  for (const id of ids) {
    const row = await findByIdForUser(ctx, userId, id)
    if (row) {
      const sortOrder = await nextSortOrder(ctx, userId, folderId)
      await JournalNotes.update(ctx, {
        id,
        folderId: folderId ?? (null as JournalNotesRow['folderId']),
        sortOrder
      })
      count++
    }
  }
  return count
}

export async function bulkDeleteForUser(
  ctx: app.Ctx,
  userId: string,
  ids: string[]
): Promise<number> {
  let count = 0
  for (const id of ids) {
    const ok = await deleteByIdForUser(ctx, userId, id)
    if (ok) count++
  }
  return count
}

export async function bulkSetCategoryForUser(
  ctx: app.Ctx,
  userId: string,
  ids: string[],
  categoryIds: string[]
): Promise<number> {
  let count = 0
  const serialized = categoryIds.length > 0 ? JSON.stringify(categoryIds) : (null as JournalNotesRow['categoryIds'])
  for (const id of ids) {
    const row = await findByIdForUser(ctx, userId, id)
    if (row) {
      await JournalNotes.update(ctx, { id, categoryIds: serialized })
      count++
    }
  }
  return count
}

export async function archiveByFolderForUser(
  ctx: app.Ctx,
  userId: string,
  folderId: string,
  isArchived: boolean
): Promise<number> {
  const notes = await JournalNotes.findAll(ctx, { where: { userId, folderId } })
  for (const n of notes) {
    await JournalNotes.update(ctx, { id: n.id, isArchived })
  }
  return notes.length
}

export async function clearFolderIdForUser(
  ctx: app.Ctx,
  userId: string,
  folderId: string
): Promise<number> {
  const notes = await JournalNotes.findAll(ctx, { where: { userId, folderId } })
  for (const n of notes) {
    await JournalNotes.update(ctx, { id: n.id, folderId: null as JournalNotesRow['folderId'] })
  }
  return notes.length
}

export async function removeCategoryFromAllNotes(
  ctx: app.Ctx,
  userId: string,
  categoryId: string
): Promise<number> {
  const notes = await JournalNotes.findAll(ctx, { where: { userId } })
  let count = 0
  for (const n of notes) {
    const cats = parseCategoryIds(n.categoryIds)
    if (cats.includes(categoryId)) {
      const next = cats.filter((c) => c !== categoryId)
      await JournalNotes.update(ctx, {
        id: n.id,
        categoryIds: next.length > 0 ? JSON.stringify(next) : (null as JournalNotesRow['categoryIds'])
      })
      count++
    }
  }
  return count
}
