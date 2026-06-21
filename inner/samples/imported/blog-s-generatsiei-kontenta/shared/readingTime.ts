// @shared

export function calculateReadingTime(content: string): number {
  if (!content) return 1

  // Удаляем HTML-теги и получаем чистый текст
  const textContent = content
    .replace(/<[^>]*>/g, '') // Убираем HTML теги
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на одинарные
    .trim()

  // Считаем количество слов
  const wordCount = textContent.split(' ').filter((word) => word.length > 0).length

  // Среднескоростное чтение: 200 слов в минуту
  const readingTime = Math.ceil(wordCount / 200)

  // Минимум 1 минута
  return Math.max(1, readingTime)
}
