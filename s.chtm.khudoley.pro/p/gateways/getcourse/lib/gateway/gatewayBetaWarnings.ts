/** Предупреждение §10 для операций с availability = beta (manual §9.1). */
export const GATEWAY_OP_BETA_WARNING_ENTRY = {
  code: 'GATEWAY_OP_BETA_UNSTABLE',
  message:
    'Этот метод gateway находится в режиме бета: поведение и ответы могут меняться, возможны ошибки интеграции. Используйте на свой риск и сверяйтесь с каталогом GET /v1/operations.'
} as const
