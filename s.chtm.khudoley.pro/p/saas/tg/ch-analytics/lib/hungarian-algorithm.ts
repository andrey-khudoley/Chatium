/**
 * Венгерский алгоритм для решения задачи назначения
 *
 * Находит оптимальное назначение элементов из множества A в множество B,
 * минимизируя сумму стоимостей назначений.
 *
 * Алгоритм работает с прямоугольными матрицами (N != M):
 * - Если N < M: добавляем фиктивные строки с высокой стоимостью (алгоритм их не выберет)
 * - Если N > M: добавляем фиктивные столбцы со стоимостью 0 (некоторые элементы A не будут назначены)
 *
 * Для максимизации (когда веса - это вероятности):
 * - Используются отрицательные веса: cost[i][j] = -log(probability)
 * - Минимизация отрицательных весов эквивалентна максимизации вероятностей
 */

// Константа для приближенного сравнения нуля (для учета ошибок округления)
const EPSILON = 1e-9

/**
 * Решает задачу назначения методом венгерского алгоритма
 *
 * @param costMatrix - матрица стоимостей размера N×M, где costMatrix[i][j] = стоимость назначения i→j
 * @returns массив назначений размера N: assignment[i] = j (индекс в множестве B) или -1 если не назначено
 */
export function solveAssignment(costMatrix: number[][]): number[] {
  if (!costMatrix || costMatrix.length === 0) {
    return []
  }

  const n = costMatrix.length // количество элементов в множестве A
  const m = costMatrix[0]?.length || 0 // количество элементов в множестве B

  if (m === 0) {
    // Нет кандидатов - все без назначения
    return new Array(n).fill(-1)
  }

  // Для прямоугольных матриц используем расширенную матрицу
  const squareSize = Math.max(n, m)
  const matrix = createSquareMatrix(costMatrix, squareSize)

  // Шаг 1: Редукция строк (вычитаем минимум из каждой строки)
  const rowMin = new Array(squareSize).fill(Infinity)
  for (let i = 0; i < squareSize; i++) {
    for (let j = 0; j < squareSize; j++) {
      rowMin[i] = Math.min(rowMin[i], matrix[i][j])
    }
  }

  for (let i = 0; i < squareSize; i++) {
    for (let j = 0; j < squareSize; j++) {
      matrix[i][j] -= rowMin[i]
    }
  }

  // Шаг 2: Редукция столбцов (вычитаем минимум из каждого столбца)
  const colMin = new Array(squareSize).fill(Infinity)
  for (let j = 0; j < squareSize; j++) {
    for (let i = 0; i < squareSize; i++) {
      colMin[j] = Math.min(colMin[j], matrix[i][j])
    }
  }

  for (let j = 0; j < squareSize; j++) {
    for (let i = 0; i < squareSize; i++) {
      matrix[i][j] -= colMin[j]
    }
  }

  // Итеративный поиск оптимального назначения
  let assignment: number[] = new Array(squareSize).fill(-1)
  const maxIterations = squareSize * squareSize
  let iterations = 0

  while (iterations < maxIterations) {
    // Пытаемся найти совершенное паросочетание
    const matching = findMaximumMatching(matrix, squareSize)

    // Bug 1 Fix: Проверяем, что все строки имеют назначение (нет -1), а не просто длину массива
    const isPerfectMatching = matching.every((value) => value !== -1)

    if (isPerfectMatching) {
      // Нашли совершенное паросочетание
      assignment = matching
      break
    }

    // Обновляем матрицу для следующей итерации
    updateMatrix(matrix, matching, squareSize)
    iterations++
  }

  // Обрезаем результат до исходного размера N и корректируем индексы
  const result = new Array(n).fill(-1)
  for (let i = 0; i < n; i++) {
    if (assignment[i] !== -1 && assignment[i] < m) {
      result[i] = assignment[i]
    }
  }

  return result
}

/**
 * Создаёт квадратную матрицу из прямоугольной
 * - Если N < M: добавляем фиктивные строки с очень высокой стоимостью (чтобы алгоритм их не выбирал)
 * - Если N > M: добавляем фиктивные столбцы с нулевой стоимостью
 */
function createSquareMatrix(original: number[][], size: number): number[][] {
  const n = original.length
  const m = original[0]?.length || 0
  const matrix: number[][] = []

  // Для фиктивных строк используем очень большое число (но не Infinity для численной стабильности)
  // Это гарантирует, что алгоритм не выберет фиктивные строки
  const PENALTY_FOR_DUMMY_ROWS = 1e10

  for (let i = 0; i < size; i++) {
    matrix[i] = []
    for (let j = 0; j < size; j++) {
      if (i < n && j < m) {
        // Реальные элементы из исходной матрицы
        matrix[i][j] = original[i][j]
      } else if (i >= n && j < m) {
        // Фиктивная строка (N < M): используем высокую стоимость
        matrix[i][j] = PENALTY_FOR_DUMMY_ROWS
      } else {
        // Фиктивный столбец (N > M) или пересечение фиктивных: нулевая стоимость
        matrix[i][j] = 0
      }
    }
  }

  return matrix
}

/**
 * Находит максимальное паросочетание в двудольном графе (алгоритм Куна)
 * Работает с приближенным сравнением нуля для учета ошибок округления
 */
function findMaximumMatching(matrix: number[][], size: number): number[] {
  const matching: number[] = new Array(size).fill(-1) // matching[j] = i означает, что j назначен на i
  const reverseMatching: number[] = new Array(size).fill(-1) // reverseMatching[i] = j

  // Для каждой строки пытаемся найти назначение
  for (let i = 0; i < size; i++) {
    if (reverseMatching[i] === -1) {
      const visited = new Array(size).fill(false)
      dfsMatching(matrix, i, visited, matching, reverseMatching, size)
    }
  }

  return reverseMatching
}

/**
 * Поиск в глубину для расширения паросочетания (алгоритм Куна)
 * Bug 2 Fix: Использует приближенное сравнение нуля вместо строгого равенства
 */
function dfsMatching(
  matrix: number[][],
  i: number,
  visited: boolean[],
  matching: number[],
  reverseMatching: number[],
  size: number
): boolean {
  for (let j = 0; j < size; j++) {
    // Bug 2 Fix: Используем приближенное сравнение для учета ошибок округления
    // После updateMatrix значения могут быть не точно нулевыми из-за операций с плавающей точкой
    if (!visited[j] && Math.abs(matrix[i][j]) < EPSILON) {
      visited[j] = true

      // Если j свободен или можно переназначить текущее назначение j
      if (
        matching[j] === -1 ||
        dfsMatching(matrix, matching[j], visited, matching, reverseMatching, size)
      ) {
        matching[j] = i
        reverseMatching[i] = j
        return true
      }
    }
  }
  return false
}

/**
 * Обновляет матрицу для следующей итерации венгерского алгоритма
 * Bug 3 Fix: Правильно использует markedRows и markedCols для нахождения минимального покрытия
 *
 * matching[i] = j означает, что строка i назначена на столбец j
 */
function updateMatrix(matrix: number[][], matching: number[], size: number): void {
  // Bug 3 Fix: Правильно находим покрытие строк и столбцов
  const markedRows = new Array(size).fill(false)
  const markedCols = new Array(size).fill(false)

  // Шаг 1: Помечаем непокрытые строки (строки без назначения в matching)
  for (let i = 0; i < size; i++) {
    if (matching[i] === -1) {
      markedRows[i] = true
    }
  }

  // Шаг 2: Используем алгоритм разметки для нахождения покрытия
  let changed = true
  while (changed) {
    changed = false

    // Для каждой помеченной строки, помечаем все непомеченные столбцы с нулевыми элементами
    for (let i = 0; i < size; i++) {
      if (markedRows[i]) {
        for (let j = 0; j < size; j++) {
          if (!markedCols[j] && Math.abs(matrix[i][j]) < EPSILON) {
            markedCols[j] = true
            changed = true

            // Если столбец j имеет назначение, помечаем соответствующую строку
            // Ищем строку k, для которой matching[k] === j
            for (let k = 0; k < size; k++) {
              if (matching[k] === j && !markedRows[k]) {
                markedRows[k] = true
                changed = true
              }
            }
          }
        }
      }
    }
  }

  // Шаг 3: Находим минимальное значение среди непомеченных элементов
  let minUnmarked = Infinity
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!markedRows[i] && !markedCols[j]) {
        minUnmarked = Math.min(minUnmarked, matrix[i][j])
      }
    }
  }

  // Если не нашли непомеченных элементов или минимальное значение равно нулю, выходим
  if (minUnmarked === Infinity || minUnmarked <= EPSILON) {
    return
  }

  // Шаг 4: Обновляем матрицу согласно правилу венгерского алгоритма
  // Вычитаем minUnmarked из непомеченных строк, прибавляем к помеченным столбцам
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!markedRows[i] && !markedCols[j]) {
        // Непомеченная строка, непомеченный столбец - вычитаем
        matrix[i][j] -= minUnmarked
      } else if (!markedRows[i] && markedCols[j]) {
        // Непомеченная строка, помеченный столбец - прибавляем
        matrix[i][j] += minUnmarked
      }
      // Помеченная строка - не меняем (независимо от столбца)
    }
  }
}
