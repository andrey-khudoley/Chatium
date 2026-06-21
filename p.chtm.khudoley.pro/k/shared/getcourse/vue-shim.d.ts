declare module '*.vue' {
  const component: any
  export default component
}

declare module 'vue' {
         function ref<T>(value: T): { value: T }
         function reactive<T extends object>(obj: T): T
         function computed<T>(getter: () => T): { value: T }
         function watch<T>(source: any, callback: (newVal: T, oldVal: T) => void): void
         function watchEffect(effect: () => void): void
         function onMounted(callback: () => void): void
         function onBeforeMount(callback: () => void): void
         function onBeforeUpdate(callback: () => void): void
         function onUpdated(callback: () => void): void
         function onBeforeUnmount(callback: () => void): void
         function onUnmounted(callback: () => void): void
         function defineProps<T>(): T
         function defineEmits<T>(): T
         function withDefaults<T, D>(props: T, defaults: D): T & D
  
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
