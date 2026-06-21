// @shared

export interface TestDefinition {
  name: string
  description: string
}

export interface TestCategory {
  name: string
  title: string
  icon: string
  tests: TestDefinition[]
}

export const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'basic',
    title: 'Базовые тесты',
    icon: 'fa-flask',
    tests: [{ name: 'app_loads', description: 'Приложение загружается' }]
  }
]

export async function runTest(
  ctx: any,
  category: string,
  testName: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (category === 'basic') {
      if (testName === 'app_loads') {
        return { success: true, message: 'Приложение успешно загружено' }
      }
    }

    return { success: false, message: `Тест ${category}/${testName} не найден` }
  } catch (error: any) {
    return { success: false, message: error.message || 'Неизвестная ошибка' }
  }
}
