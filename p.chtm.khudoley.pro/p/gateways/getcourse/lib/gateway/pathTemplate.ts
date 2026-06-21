/**
 * Подстановка `{pathParam}` в шаблоне URL GC и возврат оставшихся args для query/body (manual §2.4).
 */

const PATH_PARAM_RE = /\{([^/{}]+)\}/g

export function extractPathParamNames(pathTemplate: string): string[] {
  const names: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(PATH_PARAM_RE.source, 'g')
  while ((m = re.exec(pathTemplate)) !== null) {
    if (m[1] !== undefined) names.push(m[1])
  }
  return names
}

/**
 * Заменяет `{name}` на значение из args[name]; удаляет использованные ключи из копии args.
 */
export function applyPathTemplate(
  pathTemplate: string,
  args: Record<string, unknown>
): {
  path: string
  restArgs: Record<string, unknown>
} {
  const restArgs = { ...args }
  let path = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`
  const names = extractPathParamNames(pathTemplate)
  for (const name of names) {
    if (!(name in restArgs)) {
      throw new Error(`MISSING_PATH_PARAM:${name}`)
    }
    const v = restArgs[name]
    delete restArgs[name]
    const encoded =
      v === undefined || v === null ? '' : encodeURIComponent(typeof v === 'string' ? v : String(v))
    path = path.replace(`{${name}}`, encoded)
  }
  return { path, restArgs }
}
