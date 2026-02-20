/**
 * Настройки тренировки
 *
 * RETRAINING_NOTICE_MODE — когда показывать окно о режиме дообучения после завершения стека:
 *   'always' — всегда при завершении стека (direct + revert)
 *   'only_if_non_retraining' — только если в стеке было хотя бы одно слово НЕ в режиме дообучения
 */
export const TRAINING_CONFIG = {
  RETRAINING_NOTICE_MODE: 'always',
};
