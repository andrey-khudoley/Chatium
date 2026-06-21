import { sendDataToSocket } from '@app/socket'

const ADMIN_LOGS_SOCKET_ID = 'admin-logs'

// Callback для сохранения логов в БД (устанавливается извне, чтобы избежать циклической зависимости)
let persistLogCallback:
  | ((
      ctx: RichUgcCtx,
      payload: { level: DebugLevel; message: string; code?: string }
    ) => Promise<void>)
  | null = null

/**
 * Установить callback для сохранения логов в БД.
 * Вызывается из logs-operations.ts при инициализации.
 */
export function setPersistLogCallback(
  callback: (
    ctx: RichUgcCtx,
    payload: { level: DebugLevel; message: string; code?: string }
  ) => Promise<void>
): void {
  persistLogCallback = callback
}

export type DebugLevel = 'info' | 'warn' | 'error'

/**
 * Библиотека подробного логирования системы.
 *
 * - Запись в ctx.log и ctx.account.log (с префиксом)
 * - Задать префикс: Debug.setLogPrefix(prefix) или Debug.configure({ prefix: '[MODULE]' })
 * - Задать уровень: Debug.setLevel('info'|'warn'|'error') или Debug.configure({ level: 'warn' })
 * - Записать лог уровня: Debug.info(ctx, msg), Debug.warn(ctx, msg), Debug.error(ctx, msg, code?)
 * - Выбросить ошибку: Debug.throw(ctx, message, code?)
 *
 * Логи также сохраняются в таблицу (через setPersistLogCallback) и при новом логе отправляются
 * в WebSocket и при активном вебхуке — в настроенный URL.
 */
export class Debug extends Error {
  /** Префикс для серверных логов (должен быть в скобках, например: "[PROJECT]"). */
  static logPrefix: string = '[PROJECT]'

  /** Глобальный порог логирования. */
  private static globalLevel: DebugLevel = 'info'

  /** Установить глобальные параметры. */
  static configure(opts: { level?: DebugLevel; prefix?: string } = {}): void {
    if (opts.level) Debug.globalLevel = opts.level
    if (opts.prefix) Debug.logPrefix = opts.prefix
  }

  /** Установить глобальный уровень. */
  static setLevel(level: DebugLevel): void {
    Debug.globalLevel = level
  }

  /** Установить префикс серверных логов. */
  static setLogPrefix(prefix: string): void {
    Debug.logPrefix = prefix
  }

  /** Лог уровня `info`. */
  static info(ctx: RichUgcCtx, message: string): void {
    // eslint-disable-next-line no-new
    new Debug(ctx, message, 'info')

    // Если есть socketId для тестов, отправляем через WebSocket
    const socketId = (ctx as any)._testSocketId
    const category = (ctx as any)._testCategory
    const testName = (ctx as any)._testName
    if (socketId && typeof socketId === 'string') {
      // Отправляем асинхронно, но не ждём завершения (fire-and-forget)
      // Это позволяет не блокировать выполнение, но логи всё равно отправляются
      sendDataToSocket(ctx, socketId, {
        type: 'test-info',
        data: {
          category: category || '',
          testName: testName || '',
          message,
          timestamp: new Date().toISOString()
        }
      }).catch(() => {
        // Игнорируем ошибки отправки через WebSocket (не критично для логирования)
      })
    }
  }

  /** Лог уровня `warn`. */
  static warn(ctx: RichUgcCtx, message: string): void {
    // eslint-disable-next-line no-new
    new Debug(ctx, message, 'warn')
  }

  /** Лог уровня `error` без выброса. */
  static error(ctx: RichUgcCtx, message: string, code?: string): Debug {
    return new Debug(ctx, message, 'error', code)
  }

  /** Выброс ошибки. */
  static throw(ctx: RichUgcCtx, message: string, code?: string): never {
    throw new Debug(ctx, message, 'error', code)
  }

  /** Код ошибки (если ошибка выброшена). */
  code?: string

  /** Конструктор: (ctx, message, level?, code?). */
  constructor(ctx: RichUgcCtx, message: string, level: DebugLevel = 'error', code?: string) {
    super(message)
    this.name = 'Debug'
    this.code = code

    if (Debug.shouldLog(Debug.globalLevel, level)) {
      this.write(ctx, message, level, code)
    }
  }

  /** Проверка порога логирования. */
  private static shouldLog(configLevel: DebugLevel, level: DebugLevel): boolean {
    const order: DebugLevel[] = ['info', 'warn', 'error']
    return order.indexOf(level) >= order.indexOf(configLevel)
  }

  /** Запись в `ctx.log` и `ctx.account.log`. */
  private write(ctx: RichUgcCtx, message: string, level: DebugLevel, code?: string): void {
    const ts = new Date().toISOString()
    const head = `[${level.toUpperCase()}][${ts}]${code ? `[${code}]` : ''}`
    const line = `${head}: ${message}`

    try {
      ctx.log?.(line)
    } catch {}
    try {
      ctx.account?.log?.(`${Debug.logPrefix}${line}`)
    } catch {}

    // Асинхронно сохраняем лог и отправляем обновление в WebSocket
    void Debug.persistLog(ctx, { level, message, code, createdAt: ts })
  }

  private static async persistLog(
    ctx: RichUgcCtx,
    payload: { level: DebugLevel; message: string; code?: string; createdAt: string }
  ): Promise<void> {
    const createdAt = payload.createdAt

    if (!persistLogCallback) {
      try {
        const module = await import('../lib/logs-operations')
        if (typeof module.persistLog === 'function') {
          persistLogCallback = async (innerCtx, innerPayload) => {
            await module.persistLog(
              innerCtx,
              innerPayload.level,
              innerPayload.message,
              innerPayload.code
            )
          }
        }
      } catch {
        // Если ленивый импорт недоступен, пропускаем сохранение
      }
    }

    // Сохраняем в БД через callback (если установлен)
    if (persistLogCallback) {
      try {
        await persistLogCallback(ctx, {
          level: payload.level,
          message: payload.message,
          code: payload.code
        })
      } catch {
        // Игнорируем ошибки записи в БД, чтобы не ломать основной поток
      }
    }

    // Отправляем в WebSocket
    try {
      await sendDataToSocket(ctx, ADMIN_LOGS_SOCKET_ID, {
        type: 'new-log',
        data: {
          level: payload.level,
          message: payload.message,
          code: payload.code,
          createdAt
        }
      })
    } catch {
      // Игнорируем ошибки отправки через WebSocket
    }
  }
}
