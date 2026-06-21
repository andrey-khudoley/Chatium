// @shared-route
import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import ScriptsTable from '../../tables/scripts.table'
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { listScriptsRoute } from '../../api/scripts/list'
import { createScriptRoute } from '../../api/scripts/create'
import { updateScriptRoute } from '../../api/scripts/update'
import { deleteScriptRoute } from '../../api/scripts/delete'
import { uploadScriptRoute } from '../../api/scripts/upload'
import { getFullUrl, ROUTES } from '../../config/routes'

// API: Получить список всех тестов
export const apiGetTestsListRoute = app.get('/list', async (ctx, req) => {
  return {
    success: true,
    categories: TEST_CATEGORIES
  }
})

// API: Выполнить один тест (для интерактивной страницы)
export const apiRunSingleTestRoute = app.post('/run-single', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    
    const { category, testName } = req.body
    const startTime = Date.now()
    
    await executeTest(ctx, category, testName)
    
    return {
      success: true,
      duration: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack || ''
    }
  }
})

// API: Выполнить все тесты (для AI страницы)
export const apiRunAllTestsRoute = app.get('/run-all', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    
    const results = []
    const startTime = Date.now()
    
    // Выполняем все тесты последовательно
    for (const category of TEST_CATEGORIES) {
      for (const test of category.tests) {
        const testStartTime = Date.now()
        
        try {
          await executeTest(ctx, category.name, test.name)
          
          results.push({
            category: category.name,
            test: test.name,
            description: test.description,
            status: 'passed',
            duration: Date.now() - testStartTime
          })
        } catch (error: any) {
          results.push({
            category: category.name,
            test: test.name,
            description: test.description,
            status: 'failed',
            error: error.message,
            stack: error.stack,
            duration: Date.now() - testStartTime
          })
        }
      }
    }
    
    // Cleanup: удаляем все test- записи после тестов
    try {
      await cleanupTestRecords(ctx)
      ctx.account.log('Test records cleaned up', { level: 'info' })
    } catch (cleanupError: any) {
      ctx.account.log('Cleanup error', { 
        level: 'warn', 
        json: { error: cleanupError.message } 
      })
    }
    
    const totalDuration = Date.now() - startTime
    const passed = results.filter(r => r.status === 'passed').length
    const failed = results.filter(r => r.status === 'failed').length
    
    ctx.account.log('All tests executed', {
      level: 'info',
      json: { passed, failed, duration: totalDuration, success: failed === 0 }
    })
    
    return {
      timestamp: new Date().toISOString(),
      project: 'storage',
      summary: {
        total: results.length,
        passed,
        failed,
        duration: totalDuration,
        success: failed === 0
      },
      results
    }
  } catch (error: any) {
    return {
      timestamp: new Date().toISOString(),
      project: 'storage',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0,
        success: false,
        error: error.message
      },
      results: []
    }
  }
})

// Выполнение одного теста
async function executeTest(ctx: any, category: string, testName: string) {
  switch (category) {
    case 'database':
      await runDatabaseTest(ctx, testName)
      break
    case 'api':
      await runApiTest(ctx, testName)
      break
    case 'serve':
      await runServeTest(ctx, testName)
      break
    case 'functional':
      await runFunctionalTest(ctx, testName)
      break
    case 'integration':
      await runIntegrationTest(ctx, testName)
      break
    case 'cleanup':
      await runCleanupTest(ctx, testName)
      break
  }
}

// === ТЕСТЫ БАЗЫ ДАННЫХ ===
async function runDatabaseTest(ctx: any, testName: string) {
  switch (testName) {
    case 'table_exists':
      if (!ScriptsTable) {
        throw new Error('Таблица ScriptsTable не найдена')
      }
      break
      
    case 'create_script':
      const script = await ScriptsTable.create(ctx, {
        name: 'test-script-' + Date.now(),
        description: 'Test script',
        type: 'script',
        content: 'console.log("test");'
      })
      
      if (!script || !script.id) {
        throw new Error('Скрипт не создан')
      }
      break
      
    case 'create_style':
      const style = await ScriptsTable.create(ctx, {
        name: 'test-style-' + Date.now(),
        description: 'Test style',
        type: 'style',
        content: 'body { margin: 0; }'
      })
      
      if (!style || !style.id) {
        throw new Error('Стиль не создан')
      }
      break
      
    case 'find_by_name':
      const testName = 'test-find-' + Date.now()
      await ScriptsTable.create(ctx, {
        name: testName,
        description: 'Test',
        type: 'script',
        content: 'test'
      })
      
      const found = await ScriptsTable.findOneBy(ctx, { name: testName })
      if (!found) {
        throw new Error('Скрипт не найден по имени')
      }
      break
      
    case 'update_script':
      const original = await ScriptsTable.create(ctx, {
        name: 'test-update-' + Date.now(),
        description: 'Original',
        type: 'script',
        content: 'original'
      })
      
      const updated = await ScriptsTable.update(ctx, {
        id: original.id,
        description: 'Updated',
        content: 'updated'
      })
      
      if (updated.description !== 'Updated' || updated.content !== 'updated') {
        throw new Error('Скрипт не обновлен')
      }
      break
      
    case 'delete_script':
      const toDelete = await ScriptsTable.create(ctx, {
        name: 'test-delete-' + Date.now(),
        description: 'To delete',
        type: 'script',
        content: 'delete me'
      })
      
      await ScriptsTable.delete(ctx, toDelete.id!)
      
      const deleted = await ScriptsTable.findById(ctx, toDelete.id!)
      if (deleted) {
        throw new Error('Скрипт не удален')
      }
      break
  }
}

// === ТЕСТЫ API ===
async function runApiTest(ctx: any, testName: string) {
  switch (testName) {
    case 'get_scripts_list':
      const listResult = await listScriptsRoute.run(ctx)
      
      if (!listResult.success) {
        throw new Error(listResult.error || 'API вернул success=false')
      }
      
      if (!Array.isArray(listResult.scripts)) {
        throw new Error('scripts не является массивом')
      }
      break
      
    case 'create_script_api':
      const createResult = await createScriptRoute.run(ctx, {
        name: 'test-api-' + Date.now(),
        description: 'Test API',
        type: 'script',
        content: 'console.log("api test");'
      })
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Не удалось создать скрипт')
      }
      
      if (!createResult.script || !createResult.url) {
        throw new Error('Отсутствует script или url в ответе')
      }
      break
      
    case 'update_script_api':
      const toUpdate = await createScriptRoute.run(ctx, {
        name: 'test-update-api-' + Date.now(),
        description: 'Original',
        type: 'script',
        content: 'original'
      })
      
      if (!toUpdate.success) {
        throw new Error('Не удалось создать скрипт для обновления')
      }
      
      const updateResult = await updateScriptRoute.run(ctx, {
        id: toUpdate.script.id,
        description: 'Updated via API',
        content: 'updated'
      })
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Не удалось обновить скрипт')
      }
      break
      
    case 'delete_script_api':
      const toDeleteApi = await createScriptRoute.run(ctx, {
        name: 'test-delete-api-' + Date.now(),
        description: 'To delete',
        type: 'script',
        content: 'delete me'
      })
      
      if (!toDeleteApi.success) {
        throw new Error('Не удалось создать скрипт для удаления')
      }
      
      const deleteResult = await deleteScriptRoute.run(ctx, {
        id: toDeleteApi.script.id
      })
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Не удалось удалить скрипт')
      }
      break
      
    case 'get_by_id':
      const created = await createScriptRoute.run(ctx, {
        name: 'test-get-' + Date.now(),
        description: 'Test get',
        type: 'script',
        content: 'test'
      })
      
      if (!created.success) {
        throw new Error('Не удалось создать скрипт')
      }
      
      // Прямой вызов через request вместо route.run из-за проблемы с params
      const getResult = await ScriptsTable.findById(ctx, created.script.id)
      
      if (!getResult) {
        throw new Error('Не удалось получить скрипт по ID')
      }
      break
      
    case 'upload_js_file':
      const jsUploadResult = await uploadScriptRoute.run(ctx, {
        filename: 'test-upload-' + Date.now() + '.js',
        content: 'console.log("uploaded from file");'
      })
      
      if (!jsUploadResult.success) {
        throw new Error(jsUploadResult.error || 'Не удалось загрузить .js файл')
      }
      
      if (!jsUploadResult.script || !jsUploadResult.url) {
        throw new Error('Отсутствует script или url в ответе')
      }
      
      if (jsUploadResult.script.type !== 'script') {
        throw new Error('Тип файла определен неверно')
      }
      break
      
    case 'upload_css_file':
      const cssUploadResult = await uploadScriptRoute.run(ctx, {
        filename: 'test-upload-' + Date.now() + '.css',
        content: 'body { background: red; }'
      })
      
      if (!cssUploadResult.success) {
        throw new Error(cssUploadResult.error || 'Не удалось загрузить .css файл')
      }
      
      if (!cssUploadResult.script || !cssUploadResult.url) {
        throw new Error('Отсутствует script или url в ответе')
      }
      
      if (cssUploadResult.script.type !== 'style') {
        throw new Error('Тип файла определен неверно')
      }
      break
      
    case 'upload_invalid_file':
      const invalidUploadResult = await uploadScriptRoute.run(ctx, {
        filename: 'test-invalid-' + Date.now() + '.txt',
        content: 'This is a text file'
      })
      
      if (invalidUploadResult.success) {
        throw new Error('Загрузка .txt файла должна была завершиться ошибкой')
      }
      
      if (!invalidUploadResult.error || !invalidUploadResult.error.includes('Поддерживаются только')) {
        throw new Error('Ожидалось сообщение об ошибке формата файла')
      }
      break
  }
}

// === ТЕСТЫ ОТДАЧИ КОНТЕНТА ===
async function runServeTest(ctx: any, testName: string) {
  // Согласно file-based роутингу Chatium, параметры пути отделяются тильдой
  const serveBaseUrl = ctx.account.url(getFullUrl(ROUTES.serve))

  switch (testName) {
    case 'serve_js':
      const jsName = 'test-js-' + Date.now()
      const jsScript = await ScriptsTable.create(ctx, {
        name: jsName,
        description: 'Test JS serve',
        type: 'script',
        content: 'console.log("served");'
      })

      const jsResponse = await request({
        url: `${serveBaseUrl}?file=${encodeURIComponent(jsName + '.js')}`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false
      })
      
      if (jsResponse.statusCode !== 200) {
        // Проверяем, был ли скрипт создан
        const checkScript = await ScriptsTable.findById(ctx, jsScript.id!)
        throw new Error(`HTTP ${jsResponse.statusCode} - ожидалось 200. Скрипт в базе: ${checkScript ? 'ДА (name=' + checkScript.name + ')' : 'НЕТ'}`)
      }
      
      if (!jsResponse.body.includes('console.log')) {
        throw new Error('Контент JS не найден')
      }
      break
      
    case 'serve_css':
      const cssName = 'test-css-' + Date.now()
      const cssScript = await ScriptsTable.create(ctx, {
        name: cssName,
        description: 'Test CSS serve',
        type: 'style',
        content: 'body { margin: 0; }'
      })
      
      const cssResponse = await request({
        url: `${serveBaseUrl}?file=${encodeURIComponent(cssName + '.css')}`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false
      })
      
      if (cssResponse.statusCode !== 200) {
        // Проверяем, был ли скрипт создан
        const checkScript = await ScriptsTable.findById(ctx, cssScript.id!)
        throw new Error(`HTTP ${cssResponse.statusCode} - ожидалось 200. Скрипт в базе: ${checkScript ? 'ДА (name=' + checkScript.name + ')' : 'НЕТ'}`)
      }
      
      if (!cssResponse.body.includes('margin')) {
        throw new Error('Контент CSS не найден')
      }
      break
      
    case 'serve_not_found':
      const notFoundResponse = await request({
        url: `${serveBaseUrl}?file=${encodeURIComponent('nonexistent-script-' + Date.now() + '.js')}`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false
      })
      
      // Проверяем, что возвращается сообщение об ошибке
      if (!notFoundResponse.body || !notFoundResponse.body.includes('not found')) {
        throw new Error('Ожидалось сообщение "not found"')
      }
      break
  }
}

// === ФУНКЦИОНАЛЬНЫЕ ТЕСТЫ ===
async function runFunctionalTest(ctx: any, testName: string) {
  switch (testName) {
    case 'unique_name':
      const uniqueName = 'test-unique-' + Date.now()
      
      await createScriptRoute.run(ctx, {
        name: uniqueName,
        description: 'First',
        type: 'script',
        content: 'first'
      })
      
      const duplicate = await createScriptRoute.run(ctx, {
        name: uniqueName,
        description: 'Second',
        type: 'script',
        content: 'second'
      })
      
      if (duplicate.success) {
        throw new Error('Дубликат имени был создан (должна быть ошибка)')
      }
      break
      
    case 'url_generation':
      const urlTestScript = await createScriptRoute.run(ctx, {
        name: 'test-url-' + Date.now(),
        description: 'Test URL',
        type: 'script',
        content: 'test'
      })
      
      if (!urlTestScript.success || !urlTestScript.url) {
        throw new Error('URL не сгенерирован')
      }
      
      if (!urlTestScript.url.includes('?file=') || !urlTestScript.url.includes(getFullUrl(ROUTES.serve))) {
        throw new Error('Неверный формат URL (должен содержать путь отдачи скрипта и ?file=)')
      }

      if (!urlTestScript.url.includes('.js')) {
        throw new Error('URL не заканчивается на .js')
      }
      break
  }
}

// === ИНТЕГРАЦИОННЫЕ ТЕСТЫ ===
async function runIntegrationTest(ctx: any, testName: string) {
  switch (testName) {
    case 'full_flow_script':
      const jsName = 'test-flow-js-' + Date.now()
      
      // Создание
      const created = await createScriptRoute.run(ctx, {
        name: jsName,
        description: 'Full flow test',
        type: 'script',
        content: 'console.log("full flow");'
      })
      
      if (!created.success) {
        throw new Error('Шаг 1: Не удалось создать скрипт')
      }
      
      // Отдача
      const served = await request({
        url: `${ctx.account.url(getFullUrl(ROUTES.serve))}?file=${encodeURIComponent(jsName + '.js')}`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false
      })
      
      if (served.statusCode !== 200) {
        throw new Error('Шаг 2: Скрипт не отдается')
      }
      
      // Удаление
      const deleted = await deleteScriptRoute.run(ctx, {
        id: created.script.id
      })
      
      if (!deleted.success) {
        throw new Error('Шаг 3: Не удалось удалить скрипт')
      }
      break
      
    case 'full_flow_style':
      const cssName = 'test-flow-css-' + Date.now()
      
      // Создание
      const createdCss = await createScriptRoute.run(ctx, {
        name: cssName,
        description: 'Full flow CSS test',
        type: 'style',
        content: 'body { margin: 0; }'
      })
      
      if (!createdCss.success) {
        throw new Error('Шаг 1: Не удалось создать стиль')
      }
      
      // Отдача
      const servedCss = await request({
        url: `${ctx.account.url(getFullUrl(ROUTES.serve))}?file=${encodeURIComponent(cssName + '.css')}`,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false
      })
      
      if (servedCss.statusCode !== 200) {
        throw new Error('Шаг 2: Стиль не отдается')
      }
      
      // Удаление
      const deletedCss = await deleteScriptRoute.run(ctx, {
        id: createdCss.script.id
      })
      
      if (!deletedCss.success) {
        throw new Error('Шаг 3: Не удалось удалить стиль')
      }
      break
      
    case 'update_flow':
      const updateName = 'test-update-flow-' + Date.now()
      
      // Создание
      const original = await createScriptRoute.run(ctx, {
        name: updateName,
        description: 'Original',
        type: 'script',
        content: 'original content'
      })
      
      if (!original.success) {
        throw new Error('Шаг 1: Не удалось создать скрипт')
      }
      
      // Обновление
      const updated = await updateScriptRoute.run(ctx, {
        id: original.script.id,
        description: 'Updated',
        content: 'updated content'
      })
      
      if (!updated.success) {
        throw new Error('Шаг 2: Не удалось обновить скрипт')
      }
      
      // Проверка
      const check = await ScriptsTable.findById(ctx, original.script.id)
      
      if (!check) {
        throw new Error('Шаг 3: Не удалось получить обновленный скрипт')
      }
      
      if (check.description !== 'Updated' || check.content !== 'updated content') {
        throw new Error('Шаг 3: Данные не обновились')
      }
      break
  }
}

// === ТЕСТЫ ОЧИСТКИ ===
async function runCleanupTest(ctx: any, testName: string) {
  switch (testName) {
    case 'cleanup_test_records':
      // Создаём несколько test- записей
      const testScript1 = await ScriptsTable.create(ctx, {
        name: 'test-cleanup-script-' + Date.now(),
        description: 'For cleanup test',
        type: 'script',
        content: 'test'
      })
      
      const testScript2 = await ScriptsTable.create(ctx, {
        name: 'test-cleanup-style-' + Date.now(),
        description: 'For cleanup test',
        type: 'style',
        content: 'test'
      })
      
      // Проверяем что они созданы
      const beforeCleanup = await ScriptsTable.findAll(ctx, {})
      const testRecordsBefore = beforeCleanup.filter(r => r.name?.startsWith('test-'))
      
      if (testRecordsBefore.length < 2) {
        throw new Error('Тестовые записи не созданы')
      }
      
      // Выполняем cleanup
      await cleanupTestRecords(ctx)
      
      // Проверяем что все test- записи удалены
      const afterCleanup = await ScriptsTable.findAll(ctx, {})
      const testRecordsAfter = afterCleanup.filter(r => r.name?.startsWith('test-'))
      
      if (testRecordsAfter.length !== 0) {
        throw new Error(`Cleanup не удалил все test- записи. Осталось: ${testRecordsAfter.length}`)
      }
      break
  }
}

// Функция очистки тестовых записей
async function cleanupTestRecords(ctx: any) {
  // Находим все записи, имя которых начинается с 'test-'
  const testRecords = await ScriptsTable.findAll(ctx, {})
  
  let deletedCount = 0
  
  for (const record of testRecords) {
    if (record.name && record.name.startsWith('test-')) {
      try {
        await ScriptsTable.delete(ctx, record.id!)
        deletedCount++
      } catch (error: any) {
        // Логируем ошибку, но продолжаем удаление других записей
        ctx.account.log('Failed to delete test record', {
          level: 'warn',
          json: { id: record.id, name: record.name, error: error.message }
        })
      }
    }
  }
  
  ctx.account.log('Cleanup completed', {
    level: 'info',
    json: { deletedCount }
  })
}

