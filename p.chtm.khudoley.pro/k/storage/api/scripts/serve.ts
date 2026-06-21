// Отдача скриптов/стилей по query-параметру file (внешние обращения без интерфейса — в api).
// URL: ./api/scripts/serve?file=name.js или ./api/scripts/serve?file=name.css
import * as repo from '../../repos/scripts.repo'

export const serveScriptRoute = app.get('/', async (ctx, req) => {
  const file = (req.query?.file as string) ?? ''
  const match = file.match(/^(.+)\.(js|css)$/i)
  if (!match) {
    return { statusCode: 400, rawHttpBody: 'Parameter file required (e.g. ?file=name.js)', headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  }
  const [, name, ext] = match
  const script = await repo.findByName(ctx, name)
  if (!script) {
    return { statusCode: 404, rawHttpBody: 'Script not found', headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  }
  const contentType = ext.toLowerCase() === 'css' ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8'
  return {
    statusCode: 200,
    rawHttpBody: script.content,
    headers: { 'Content-Type': contentType }
  }
})
