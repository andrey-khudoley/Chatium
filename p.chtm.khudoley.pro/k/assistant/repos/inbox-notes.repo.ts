import InboxNotes, { type InboxNotesRow } from '../tables/inbox-notes.table'

export type InboxNoteSummary = {
  id: string
  title: string
  isArchived: boolean
  sortOrder: number
}

function rowToSummary(row: InboxNotesRow): InboxNoteSummary {
  return {
    id: row.id,
    title: row.title,
    isArchived: row.isArchived ?? false,
    sortOrder: row.sortOrder ?? 0
  }
}

export async function findSummariesByUserId(
  ctx: app.Ctx,
  userId: string,
  opts?: { includeArchived?: boolean }
): Promise<InboxNoteSummary[]> {
  const rows = await InboxNotes.findAll(ctx, {
    where: { userId },
    order: [{ sortOrder: 'asc' }]
  })
  const includeArchived = opts?.includeArchived ?? false
  const mapped = rows.map(rowToSummary)
  if (includeArchived) return mapped
  return mapped.filter((n) => !n.isArchived)
}

async function nextSortOrder(ctx: app.Ctx, userId: string): Promise<number> {
  const rows = await InboxNotes.findAll(ctx, {
    where: { userId },
    order: [{ sortOrder: 'desc' }],
    limit: 1
  })
  return (rows[0]?.sortOrder ?? 0) + 1
}

export interface CreateInboxNoteData {
  title: string
  content: string
}

export async function createForUser(
  ctx: app.Ctx,
  userId: string,
  data: CreateInboxNoteData
): Promise<InboxNotesRow> {
  const sortOrder = await nextSortOrder(ctx, userId)
  return InboxNotes.create(ctx, {
    userId,
    title: data.title,
    content: data.content,
    sortOrder,
    isArchived: false
  })
}

export async function findByIdForUser(
  ctx: app.Ctx,
  userId: string,
  id: string
): Promise<InboxNotesRow | null> {
  const row = await InboxNotes.findById(ctx, id)
  if (!row || row.userId !== userId) {
    return null
  }
  return row
}

export interface UpdateInboxNoteData {
  title?: string
  content?: string
  isArchived?: boolean
}

export async function updateForUser(
  ctx: app.Ctx,
  userId: string,
  id: string,
  data: UpdateInboxNoteData
): Promise<InboxNotesRow | null> {
  const existing = await findByIdForUser(ctx, userId, id)
  if (!existing) return null

  const patch: Record<string, unknown> = { id }
  if (data.title !== undefined) patch.title = data.title
  if (data.content !== undefined) patch.content = data.content
  if (data.isArchived !== undefined) patch.isArchived = data.isArchived

  return InboxNotes.update(ctx, patch as Parameters<typeof InboxNotes.update>[1])
}

export async function deleteByIdForUser(ctx: app.Ctx, userId: string, id: string): Promise<boolean> {
  const existing = await findByIdForUser(ctx, userId, id)
  if (!existing) return false
  await InboxNotes.delete(ctx, id)
  return true
}
