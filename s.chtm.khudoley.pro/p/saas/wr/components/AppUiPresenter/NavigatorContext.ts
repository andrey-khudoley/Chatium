// @shared

import { provide, inject, InjectionKey, ref, Ref } from 'vue'

// Create a Symbol as injection key for type safety
export const NavigatorKey = Symbol() as InjectionKey<any>

// Provide method to set up the navigator context
export function provideNavigator(navigator: any) {
  provide(NavigatorKey, navigator)
}

// Hook to use the navigator context
export function useNavigatorContext() {
  const navigator = inject(NavigatorKey)

  if (!navigator) {
    console.warn(
      'NavigatorContext was not provided. Make sure to call provideNavigator at a parent component.'
    )
    return {}
  }

  return navigator
}
