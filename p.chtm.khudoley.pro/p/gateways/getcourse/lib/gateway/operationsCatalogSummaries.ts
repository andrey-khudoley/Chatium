/**
 * Построение wire-дерева формата запроса из рантайм-валидатора `@app/schema` и
 * плоского `argsSchema` + словарь fallback-подписей полей GetCourse. Вынесено из
 * operationsCatalog ради лимита размера файла; используется toOperationSummaries.
 */
import type {
  ArgsFieldSchema,
  ArgsSchemaJson,
  ArgsTreeNode,
  ArgsTreeField
} from '../../shared/operationsCatalogShared'
import { type AnyArgsValidator } from './operationsCatalogTypes'

/**
 * Структурная (JSON-Schema-подобная) проекция рантайм-валидатора `@app/schema`:
 * у каждого `ZType` есть `type` ('object'/'array'/'string'/'number'/'integer'/'boolean'),
 * у `ZObject` — `properties` + `required` + `additionalProperties`, у `ZArray` — `items`.
 * Необязательность определяется отсутствием имени в `required` родителя.
 */
type RawSchema = {
  type?: string
  properties?: Record<string, RawSchema | undefined>
  required?: string[]
  items?: RawSchema
  additionalProperties?: boolean
  description?: string
}

/** Рекурсивно переводит рантайм-валидатор в сериализуемое дерево формата запроса. */
function schemaToArgsNode(schema: RawSchema | undefined): ArgsTreeNode {
  if (!schema || typeof schema !== 'object') return { kind: 'any' }
  if (schema.type === 'object') {
    const required = new Set(schema.required ?? [])
    const props = schema.properties ?? {}
    const fields: ArgsTreeField[] = Object.keys(props).map((name) => ({
      name,
      required: required.has(name),
      description: props[name]?.description,
      node: schemaToArgsNode(props[name])
    }))
    return { kind: 'object', fields, additionalProperties: schema.additionalProperties !== false }
  }
  if (schema.type === 'array') {
    return { kind: 'array', items: schemaToArgsNode(schema.items) }
  }
  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  ) {
    return { kind: 'scalar', type: schema.type }
  }
  return { kind: 'any' }
}

/**
 * Назначение полей GetCourse по официальной документации (getcourse.ru/help/api): fallback-подписи
 * для полей, у которых нет явного `.describe()` в валидаторе и описания в `argsSchema`. Ключ — имя поля.
 */
const FIELD_DESCRIPTIONS: Record<string, string> = {
  // Идентификаторы сущностей
  dealId: 'ID сделки в GetCourse',
  userId: 'ID пользователя в GetCourse',
  user_id: 'ID пользователя в GetCourse',
  dialogId: 'ID диалога',
  chatId: 'ID чата',
  lessonId: 'ID урока',
  lessonAnswerId: 'ID ответа на задание урока',
  offerId: 'ID предложения (offer)',
  groupId: 'ID группы',
  managerId: 'ID менеджера',
  manager_user_id: 'ID пользователя-менеджера сделки',
  moderatorId: 'ID модератора',
  newDepartmentId: 'ID нового отдела (куда переводится диалог)',
  templateId: 'ID шаблона (например, диплома)',
  productId: 'ID продукта',
  webinarId: 'ID вебинара',
  commentId: 'ID комментария',
  exportId: 'ID задания экспорта (для получения результата)',
  replyToUserId: 'ID пользователя, которому адресован ответ',
  // Списки идентификаторов
  ids: 'Список идентификаторов',
  positionIds: 'Список ID позиций сделки',
  positions: 'Позиции сделки (массив объектов)',
  idgrouplist: 'Список ID групп (через запятую)',
  groups: 'Список групп',
  tags: 'Теги',
  customFields: 'Пользовательские (дополнительные) поля',
  // Контакт/профиль
  email: 'Email пользователя',
  phone: 'Телефон',
  first_name: 'Имя',
  last_name: 'Фамилия',
  userName: 'Имя пользователя',
  city: 'Город',
  country: 'Страна',
  gender: 'Пол',
  birthday: 'Дата рождения',
  // Тексты/комментарии
  text: 'Текст',
  comment: 'Комментарий',
  commentText: 'Текст комментария',
  cancel_reason_comment: 'Комментарий причины отмены сделки',
  // Статусы/типы/действия (значение зависит от операции)
  status: 'Статус (допустимые значения зависят от операции)',
  type: 'Тип (допустимые значения зависят от операции)',
  action: 'Выполняемое действие',
  userType: 'Тип пользователя',
  replyToUserType: 'Тип пользователя, которому адресован ответ',
  value: 'Значение (например, сумма для операции с балансом)',
  number: 'Номер (например, номер диплома)',
  trainingName: 'Название тренинга',
  allowDuplicates: 'Разрешить дубликаты',
  isPrivateReply: 'Приватный ответ',
  user_in_group: 'Фильтр: пользователь состоит в группе',
  transport: 'Канал доставки (transport)',
  uri: 'URI/адрес',
  event_id: 'ID события',
  event_object_id: 'ID объекта события',
  webinarLaunchNumber: 'Номер запуска вебинара',
  // Пагинация
  limit: 'Максимум записей в ответе (постранично)',
  offset: 'Смещение выборки (постранично)',
  // Фильтры по датам (bracket-параметры GetCourse)
  'created_at[from]': 'Фильтр по дате создания: начало периода',
  'created_at[to]': 'Фильтр по дате создания: конец периода',
  'added_at[from]': 'Фильтр по дате добавления: начало периода',
  'added_at[to]': 'Фильтр по дате добавления: конец периода',
  'payed_at[from]': 'Фильтр по дате оплаты: начало периода',
  'payed_at[to]': 'Фильтр по дате оплаты: конец периода',
  'status_changed_at[from]': 'Фильтр по дате смены статуса: начало периода',
  'status_changed_at[to]': 'Фильтр по дате смены статуса: конец периода'
}

/** Узел дерева из плоского описателя `argsSchema` (для полей, задокументированных только в нём). */
function argsFieldToNode(field: ArgsFieldSchema): ArgsTreeNode {
  if (field.type === 'array') {
    return { kind: 'array', items: field.items ? argsFieldToNode(field.items) : { kind: 'any' } }
  }
  if (field.type === 'object') {
    return { kind: 'object', fields: [], additionalProperties: true }
  }
  return { kind: 'scalar', type: field.type }
}

/** Рекурсивно проставляет fallback-подписи из `FIELD_DESCRIPTIONS` полям без описания. */
function fillFieldDescriptions(node: ArgsTreeNode): void {
  if (node.kind === 'object') {
    for (const field of node.fields) {
      if (!field.description) field.description = FIELD_DESCRIPTIONS[field.name]
      fillFieldDescriptions(field.node)
    }
  } else if (node.kind === 'array') {
    fillFieldDescriptions(node.items)
  }
}

/**
 * Дерево формата запроса из `argsValidator` (вся вложенность) + поля, задокументированные только
 * в `argsSchema` (bracket-параметры GC через passthrough), + наложение UI-описаний и словаря.
 */
export function buildArgsTree(
  validator: AnyArgsValidator,
  argsSchema: ArgsSchemaJson
): ArgsTreeNode {
  const node = schemaToArgsNode(validator as unknown as RawSchema)
  if (node.kind === 'object') {
    // Описания верхнего уровня из argsSchema (в валидаторе их нет).
    for (const field of node.fields) {
      if (!field.description) {
        const fromSchema = argsSchema.fields.find((f) => f.name === field.name)?.description
        if (fromSchema) field.description = fromSchema
      }
    }
    // Поля, описанные только в argsSchema (passthrough-параметры GC), которых нет в валидаторе.
    const present = new Set(node.fields.map((f) => f.name))
    for (const sf of argsSchema.fields) {
      if (!present.has(sf.name)) {
        node.fields.push({
          name: sf.name,
          required: sf.required,
          description: sf.description,
          node: argsFieldToNode(sf)
        })
      }
    }
  }
  fillFieldDescriptions(node)
  return node
}
