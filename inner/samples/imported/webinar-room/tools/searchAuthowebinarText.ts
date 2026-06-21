import { searchInKnowledgeBaseNative } from '@knowledge-base/sdk'
import { loadAutowebinarKnowledgeBaseId } from './shared'

export const searchAutowebinarTextTool = app
  .function('/search-autowebinar-text')
  .meta({
    name: 'search_autowebinar_text',
    description: 'Поиск по базе знаний автовебинара (заполняется транскрибированным текстом видео).'
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional(),
            autowebinarId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            autowebinarId: s.string().optional(),
            queryText: s.string().describe('Текст запроса для поиска по базе знаний автовебинара.'),
            limit: s
              .number()
              .optional()
              .describe('Максимум совпадений (по умолчанию 20, максимум 50).')
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    try {
      const autowebinarId = body.input?.autowebinarId || body.context?.autowebinarId
      const rawQuery = String(body.input?.queryText || '').trim()
      const limit = Math.max(1, Math.min(50, Number(body.input?.limit) || 20))

      if (!autowebinarId) throw new Error('autowebinarId is required')
      if (!rawQuery) throw new Error('queryText is required')

      const knowledgeBaseId = await loadAutowebinarKnowledgeBaseId(ctx, autowebinarId)
      const searchResult = await searchInKnowledgeBaseNative(ctx, rawQuery, {
        knowledgeBasesIds: [knowledgeBaseId],
        limit
      })

      if (!searchResult?.ok) {
        throw new Error(searchResult?.error || 'Не удалось выполнить поиск в базе знаний')
      }

      const matches = (searchResult.results || []).map((item: any, index: number) => ({
        index: index + 1,
        documentId: item?.document?.id || null,
        documentTitle: item?.document?.title || null,
        chunkIndex: item?.chunk?.chunkIndex,
        text: item?.chunk?.content || ''
      }))

      return {
        ok: true,
        result: {
          matches
        }
      }
    } catch (error) {
      return {
        ok: false,
        result: `Ошибка: ${(error as Error).message}`
      }
    }
  })
