import { buildLegacyImportFormBody } from '../gateway/legacyGcFormBody'
import { base64ToUtf8String, utf8StringToBase64 } from '../gateway/utf8Base64'
import { detectLegacySemanticErrorRule } from '../gateway/legacyGcSemantic'
import { detectNewSemanticErrorRule } from '../gateway/newGcSemantic'
import {
  operationsCatalog,
  findOperationCatalogEntry,
  toOperationSummaries,
  CATALOG_SCHEMA_VERSION
} from '../gateway/operationsCatalog'
import { isApplicationJsonContentType, parseSchoolHeaders } from '../gateway/v1IncomingPost'
import { parseFlatQueryArgs } from '../gateway/v1GatewayQuery'

/** Полный перечень операций каталога (рукописный SSOT, manual §3.1, §3.4). */
const EXPECTED_OPERATIONS_COUNT = 59

export type GatewayUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

function push(
  results: GatewayUnitTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

function tryPush(
  results: GatewayUnitTestResult[],
  id: string,
  title: string,
  fn: () => boolean
): void {
  try {
    push(results, id, title, fn())
  } catch (e) {
    push(results, id, title, false, (e as Error)?.message ?? String(e))
  }
}

/** Юниты gateway: семантика Legacy, form body, заголовки (без сети). */
export function runGatewayUnitChecks(): GatewayUnitTestResult[] {
  const results: GatewayUnitTestResult[] = []

  tryPush(
    results,
    'gw_legacy_semantic_success_false',
    'Legacy success:false → legacy_root_success_false',
    () => {
      const rule = detectLegacySemanticErrorRule({ success: false })
      return rule === 'legacy_root_success_false'
    }
  )

  tryPush(results, 'gw_legacy_semantic_ok', 'Legacy success:true без error → null', () => {
    return detectLegacySemanticErrorRule({ success: true, result: {} }) === null
  })

  tryPush(
    results,
    'gw_utf8_base64_roundtrip',
    'utf8StringToBase64 ↔ base64ToUtf8String (кириллица)',
    () => {
      const s = '{"x":"привет"}'
      return base64ToUtf8String(utf8StringToBase64(s)) === s
    }
  )

  tryPush(results, 'gw_form_body_fields', 'form: key, action, params base64 json', () => {
    const f = buildLegacyImportFormBody('school-key', 'add', { user: { email: 'a@b.co' } })
    if (f.key !== 'school-key' || f.action !== 'add') return false
    if (!f.params || f.params.length < 8) return false
    const decoded = JSON.parse(base64ToUtf8String(f.params)) as { user: { email: string } }
    return decoded.user.email === 'a@b.co'
  })

  tryPush(results, 'gw_content_type_json', 'application/json допустим', () => {
    return isApplicationJsonContentType({ 'Content-Type': 'application/json' })
  })

  tryPush(results, 'gw_content_type_json_charset', 'application/json; charset=utf-8', () => {
    return isApplicationJsonContentType({ 'Content-Type': 'application/json; charset=utf-8' })
  })

  tryPush(
    results,
    'gw_content_type_reject_form',
    'application/x-www-form-urlencoded отклонён',
    () => {
      return !isApplicationJsonContentType({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }
  )

  tryPush(results, 'gw_headers_ok', 'X-Gc-School-Host + Api-Key', () => {
    const r = parseSchoolHeaders({
      'X-Gc-School-Host': 'school.getcourse.ru',
      'X-Gc-School-Api-Key': 'k1'
    })
    return r.ok && r.schoolHost === 'school.getcourse.ru' && r.schoolApiKey === 'k1'
  })

  tryPush(results, 'gw_headers_missing_key', 'нет Api-Key → INVOKE_SCHOOL_KEY_MISSING', () => {
    const r = parseSchoolHeaders({ 'X-Gc-School-Host': 'school.getcourse.ru' })
    return r.ok === false && r.code === 'INVOKE_SCHOOL_KEY_MISSING'
  })

  tryPush(results, 'gw_new_semantic_n1', 'new status:false → new_status_false', () => {
    const d = detectNewSemanticErrorRule({ status: false })
    return d?.rule === 'new_status_false'
  })

  tryPush(results, 'gw_new_semantic_n2', 'new code≠200 → new_code_non_200', () => {
    const d = detectNewSemanticErrorRule({ code: 403 })
    return d?.rule === 'new_code_non_200' && d.gcNumericCode === 403
  })

  tryPush(results, 'gw_new_semantic_n3', 'new data.result:false → new_data_result_false', () => {
    const d = detectNewSemanticErrorRule({
      status: true,
      code: 200,
      data: { result: false }
    })
    return d?.rule === 'new_data_result_false'
  })

  tryPush(results, 'gw_new_semantic_ok', 'new успех без признаков ошибки → null', () => {
    return (
      detectNewSemanticErrorRule({
        status: true,
        code: 200,
        data: { result: true, items: [] }
      }) === null
    )
  })

  // manual §3.1, §3.4: рукописный operationsCatalog — единственный источник. Проверяем
  // полноту (59 записей) и наличие plain JSON-описателя argsSchema.fields у каждой записи.
  tryPush(
    results,
    'gw_catalog_entries_have_schema',
    'каждая запись каталога имеет argsSchema.fields[]',
    () => {
      if (CATALOG_SCHEMA_VERSION !== 1) return false
      for (const e of operationsCatalog) {
        if (!e.argsSchema || !Array.isArray(e.argsSchema.fields)) return false
      }
      return true
    }
  )

  // manual §3.1: все op уникальны (Set size === длине массива).
  tryPush(results, 'gw_catalog_ops_sorted_unique', 'operationsCatalog: уникальные op', () => {
    const ops = operationsCatalog.map((e) => e.op)
    return ops.length === new Set(ops).size
  })

  // manual §3.1, §3.2: единый источник каталога — operationsCatalog (TS-модуль). После
  // отказа от автогенерации проверяем полноту (59 op) и уникальность вместо сверки с mapping.
  tryPush(
    results,
    'gw_operations_catalog_matches_mapping',
    'operationsCatalog: 59 уникальных op',
    () => {
      if (operationsCatalog.length !== EXPECTED_OPERATIONS_COUNT) return false
      const ops = operationsCatalog.map((e) => e.op)
      return new Set(ops).size === EXPECTED_OPERATIONS_COUNT
    }
  )

  // manual §3.5: и роут /v1/{op}, и каталог берут запись из одного источника.
  tryPush(
    results,
    'gw_operations_catalog_has_args_schema',
    'каждая запись каталога имеет live-объект argsValidator',
    () => {
      for (const e of operationsCatalog) {
        const sch = e.argsValidator as { safeParse?: unknown }
        if (!sch || typeof sch.safeParse !== 'function') return false
      }
      return true
    }
  )

  // manual §3.5: addUser имеет ручную перекрывающую схему params.user.email.
  tryPush(
    results,
    'gw_operations_catalog_addUser_strict',
    'addUser argsValidator валидирует params.user.email',
    () => {
      const e = findOperationCatalogEntry('addUser')
      if (!e) return false
      const sch = e.argsValidator as { safeParse: (d: unknown) => { success: boolean } }
      const ok = sch.safeParse({ params: { user: { email: 'a@b.co' } } })
      const bad = sch.safeParse({ params: { user: {} } })
      return ok.success === true && bad.success === false
    }
  )

  // manual §3.5: повторяющиеся ключи query → последнее значение.
  tryPush(
    results,
    'gw_query_dup_keys_keep_last',
    'parseFlatQueryArgs: дубликаты ключей → последнее значение',
    () => {
      const a = parseFlatQueryArgs({ groupId: ['1', '2', '7'] })
      const b = parseFlatQueryArgs({ groupId: '5' })
      return a.groupId === 7 && b.groupId === 5
    }
  )

  // Smoke: обход рантайм-валидатора (`@app/schema`) в argsTree не деградировал в 'any'.
  // Ловит тихий слом интроспекции (`as unknown as RawSchema`) при смене внутренней структуры схемы.
  tryPush(
    results,
    'gw_catalog_argsTree_resolved',
    'toOperationSummaries: argsTree createDeal раскрыт (params.user.email)',
    () => {
      const createDeal = toOperationSummaries().find((s) => s.op === 'createDeal')
      if (!createDeal || createDeal.argsTree.kind !== 'object') return false
      const params = createDeal.argsTree.fields.find((f) => f.name === 'params')
      if (!params || params.node.kind !== 'object') return false
      const user = params.node.fields.find((f) => f.name === 'user')
      if (!user || user.node.kind !== 'object') return false
      return user.node.fields.some(
        (f) => f.name === 'email' && f.required && f.node.kind === 'scalar'
      )
    }
  )

  return results
}
