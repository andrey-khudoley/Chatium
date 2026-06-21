import * as repo from '../repos/scripts.repo'
import { getFullUrl, ROUTES } from '../config/routes'

/** Полный URL для подключения скрипта/стиля (без тильды: ?file=name.js). */
export function getServeUrl(ctx: app.Ctx, name: string, type: string): string {
  const ext = type === 'script' ? 'js' : 'css'
  const base = ctx.account.url(getFullUrl(ROUTES.serve))
  return `${base}?file=${encodeURIComponent(name + '.' + ext)}`
}

/** Список всех скриптов */
export async function listScripts(ctx: app.Ctx) {
  return repo.findAll(ctx)
}

/** Создать скрипт (валидация имени и полей) */
export async function createScript(
  ctx: app.Ctx,
  data: { name: string; description?: string; type: string; content: string }
) {
  if (!data.name?.trim() || !data.type || !data.content) {
    throw new Error('Имя, тип и контент обязательны')
  }
  const name = String(data.name).trim()
  const existing = await repo.findByName(ctx, name)
  if (existing) {
    throw new Error('Скрипт с таким именем уже существует')
  }
  return repo.create(ctx, {
    name,
    description: data.description ?? '',
    type: data.type,
    content: data.content
  })
}

/** Обновить скрипт */
export async function updateScript(
  ctx: app.Ctx,
  data: { id: string; name?: string; description?: string; type?: string; content?: string }
) {
  if (!data.id) throw new Error('ID обязателен')
  const script = await repo.findById(ctx, data.id)
  if (!script) throw new Error('Скрипт не найден')
  if (data.name != null && data.name !== script.name) {
    const existing = await repo.findByName(ctx, data.name)
    if (existing) throw new Error('Скрипт с таким именем уже существует')
  }
  return repo.update(ctx, {
    id: data.id,
    name: data.name ?? script.name,
    description: data.description !== undefined ? data.description : script.description,
    type: data.type ?? script.type,
    content: data.content !== undefined ? data.content : script.content
  })
}

/** Удалить скрипт */
export async function deleteScript(ctx: app.Ctx, id: string) {
  if (!id) throw new Error('ID обязателен')
  await repo.deleteById(ctx, id)
}

/** Загрузить из файла: по filename определяет type и name, создаёт запись */
export async function uploadFromFile(
  ctx: app.Ctx,
  filename: string,
  content: string
) {
  if (!filename?.trim() || content == null) {
    throw new Error('Имя файла и содержимое обязательны')
  }
  const ext = filename.toLowerCase().split('.').pop()
  let type: string
  let name: string
  if (ext === 'js') {
    type = 'script'
    name = filename.replace(/\.js$/i, '')
  } else if (ext === 'css') {
    type = 'style'
    name = filename.replace(/\.css$/i, '')
  } else {
    throw new Error('Поддерживаются только файлы .js и .css')
  }
  const existing = await repo.findByName(ctx, name)
  if (existing) {
    throw new Error('Скрипт с таким именем уже существует')
  }
  return repo.create(ctx, {
    name,
    description: `Загружен из файла ${filename}`,
    type,
    content
  })
}
