import { gcQueryAi } from '@gc-mcp-server/sdk'

app.get('/', async (ctx, req) => {
  const answer = await gcQueryAi(ctx, {
    query: 'SELECT count() as cnt FROM chatium_ai.access_log'
  })
  return answer
})
