// @shared
/**
 * Чистая модель формы GC-операций для вкладки «Создать запрос».
 *
 * Дерево `argsTree` приходит от GC gateway как wire-контракт, но этот клиент
 * не импортирует код соседнего проекта: опубликованный проект должен собираться
 * внутри собственного project root.
 */

/** Wire-зеркало `ArgsTreeNode` из GC gateway. */
export type ArgsTreeNode =
  | { kind: 'object'; fields: ArgsTreeField[]; additionalProperties: boolean }
  | { kind: 'array'; items: ArgsTreeNode }
  | { kind: 'scalar'; type: string }
  | { kind: 'any' }

/** Wire-зеркало `ArgsTreeField`. */
export type ArgsTreeField = {
  name: string
  required: boolean
  description?: string
  node: ArgsTreeNode
}

export type LeafInput = 'string' | 'number' | 'boolean' | 'json'

export type FormGroup = {
  kind: 'group'
  path: string
  name: string
  depth: number
  required: boolean
  description?: string
}

export type FormLeaf = {
  kind: 'leaf'
  path: string
  name: string
  depth: number
  inputType: LeafInput
  typeLabel: string
  required: boolean
  description?: string
}

export type FormRow = FormGroup | FormLeaf

function nodeTypeLabel(node: ArgsTreeNode): string {
  if (node.kind === 'object') return 'object'
  if (node.kind === 'array') return `${nodeTypeLabel(node.items)}[]`
  if (node.kind === 'scalar') return node.type
  return 'any'
}

function scalarInputType(type: string): LeafInput {
  if (type === 'number' || type === 'integer') return 'number'
  if (type === 'boolean') return 'boolean'
  return 'string'
}

// Поле считается обязательным только когда обязателен весь путь до него:
// required-лист внутри опционального объекта не блокирует форму.
function walkArgsField(
  field: ArgsTreeField,
  parentPath: string,
  depth: number,
  ancestorsRequired: boolean,
  rows: FormRow[]
) {
  const path = parentPath ? `${parentPath}.${field.name}` : field.name
  const node = field.node
  const required = field.required && ancestorsRequired

  if (node.kind === 'object' && node.fields.length > 0) {
    rows.push({
      kind: 'group',
      path,
      name: field.name,
      depth,
      required,
      description: field.description
    })
    for (const child of node.fields) walkArgsField(child, path, depth + 1, required, rows)
    return
  }

  const inputType: LeafInput = node.kind === 'scalar' ? scalarInputType(node.type) : 'json'
  rows.push({
    kind: 'leaf',
    path,
    name: field.name,
    depth,
    inputType,
    typeLabel: nodeTypeLabel(node),
    required,
    description: field.description
  })
}

export function buildFormRows(tree: ArgsTreeNode | null): FormRow[] {
  if (!tree || tree.kind !== 'object') return []
  const rows: FormRow[] = []
  for (const f of tree.fields) walkArgsField(f, '', 0, true, rows)
  return rows
}

export function jsonPlaceholder(typeLabel: string): string {
  return typeLabel.endsWith('[]') ? '[ ... ]' : '{ ... }'
}

function validateLeaf(row: FormLeaf, raw: string): string {
  const trimmed = (raw ?? '').trim()
  if (row.required && trimmed === '') return `Поле «${row.path}» обязательно.`
  if (trimmed === '') return ''
  if (row.inputType === 'number' && !Number.isFinite(Number(trimmed)))
    return `Поле «${row.path}»: ожидается число.`
  if (row.inputType === 'boolean' && trimmed !== 'true' && trimmed !== 'false')
    return `Поле «${row.path}»: ожидается true/false.`
  if (row.inputType === 'json') {
    try {
      JSON.parse(trimmed)
    } catch {
      return `Поле «${row.path}»: ожидается корректный JSON.`
    }
  }
  return ''
}

export function buildFieldErrors(
  formRows: FormRow[],
  argsValues: Record<string, string>,
  requiredHeaders: { name: string; value: string }[]
): Record<string, string> {
  const errs: Record<string, string> = {}
  for (const h of requiredHeaders) {
    if (!h.value.trim()) errs[h.name] = `Заголовок ${h.name} обязателен.`
  }
  for (const row of formRows) {
    if (row.kind !== 'leaf') continue
    const err = validateLeaf(row, argsValues[row.path] ?? '')
    if (err) errs[row.path] = err
  }
  return errs
}

function ensurePath(target: Record<string, unknown>, path: string) {
  for (const key of path.split('.')) {
    const next = target[key]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) target[key] = {}
    target = target[key] as Record<string, unknown>
  }
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  const last = parts.pop()
  if (last === undefined) return
  let cur = target
  for (const key of parts) {
    const next = cur[key]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[last] = value
}

export function buildArgsObject(
  formRows: FormRow[],
  argsValues: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const row of formRows) {
    if (row.kind === 'group' && row.required) ensurePath(result, row.path)
  }

  for (const row of formRows) {
    if (row.kind !== 'leaf') continue
    const raw = (argsValues[row.path] ?? '').trim()
    if (raw === '') continue

    let value: unknown
    if (row.inputType === 'number') {
      value = Number(raw)
    } else if (row.inputType === 'boolean') {
      value = raw === 'true'
    } else if (row.inputType === 'json') {
      try {
        value = JSON.parse(raw)
      } catch {
        continue
      }
    } else {
      value = raw
    }

    setByPath(result, row.path, value)
  }

  return result
}
