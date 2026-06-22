import { jsx } from '@app/html-jsx'

/**
 * Редирект из html-роута (`app.html`).
 *
 * `ctx.resp.redirect()` возвращает `UgcHttpResponseTuner` — платформа корректно
 * обрабатывает его в рантайме (документированный паттерн редиректа), но в типах `@app`
 * он НЕ входит в `UgcHtmlHandlerResult` (тот допускает только
 * `SingleElement | TuneHttpHeadersResponse<SingleElement>`, у tuner отсутствует `rawHttpBody`).
 *
 * Чтобы строгая проверка типов проходила без правки поведения, приведение к типу
 * результата html-обработчика (тот же тип, что возвращает JSX-фабрика `jsx`)
 * централизовано здесь — это единственная точка с приведением.
 */
type HtmlRouteResult = ReturnType<typeof jsx>

type RespRedirectCtx = {
  resp: { redirect(location: string, statusCode?: number): unknown }
}

export function htmlRedirect(
  ctx: RespRedirectCtx,
  location: string,
  statusCode?: number
): HtmlRouteResult {
  return ctx.resp.redirect(location, statusCode) as unknown as HtmlRouteResult
}
