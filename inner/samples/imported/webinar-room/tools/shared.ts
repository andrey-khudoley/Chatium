import Autowebinars from '../tables/autowebinars.table'

export async function loadAutowebinarSubtitles(ctx: app.Ctx, autowebinarId: string) {
  const aw = await Autowebinars.findById(ctx, autowebinarId)
  if (!aw) throw new Error('Автовебинар не найден')
  if (!aw.subtitles) throw new Error('Текст видео из Muuvee еще не готов')

  return aw.subtitles
}

export async function loadAutowebinarKnowledgeBaseId(ctx: app.Ctx, autowebinarId: string) {
  const aw = await Autowebinars.findById(ctx, autowebinarId)
  if (!aw) throw new Error('Автовебинар не найден')
  if (!aw.knowledgeBaseId) throw new Error('У автовебинара не создана база знаний')

  return aw.knowledgeBaseId
}
