/** Минимальные типы для `Buffer` в серверном UGC; полный `@types/node` в этом workspace недоступен через npm. */
declare const Buffer: {
  from(
    data: string,
    encoding?: 'utf8' | 'base64'
  ): { toString(encoding: 'base64' | 'utf8'): string }
}
