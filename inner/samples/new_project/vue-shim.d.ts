declare module '*.vue' {
  const component: any
  export default component
}

declare module 'vue' {
  export function ref<T>(value: T): { value: T }
  export function reactive<T extends object>(obj: T): T
  export function computed<T>(getter: () => T): { value: T }
  export function watch<T>(source: any, callback: (newVal: T, oldVal: T) => void): void
  export function watchEffect(effect: () => void): void
  export function onMounted(callback: () => void): void
  export function onBeforeMount(callback: () => void): void
  export function onBeforeUpdate(callback: () => void): void
  export function onUpdated(callback: () => void): void
  export function onBeforeUnmount(callback: () => void): void
  export function onUnmounted(callback: () => void): void
  export function defineProps<T>(): T
  export function defineEmits<T>(): T
  export function withDefaults<T, D>(props: T, defaults: D): T & D

  export type Ref<T> = { value: T }
  export type ComputedRef<T> = { value: T }
  export type DefineComponent = any
}

declare namespace app {
  interface Req {
    body?: any
    query?: any
    params?: any
  }

  interface Ctx {
    user?: any
    account?: any
    log?: (message: string) => void
    [key: string]: any
  }
}

type RichUgcCtx = app.Ctx
