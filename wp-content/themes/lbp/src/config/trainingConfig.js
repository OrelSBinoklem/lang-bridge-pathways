/**
 * Настройки тренировки
 *
 * RETRAINING_NOTICE_MODE — когда показывать окно о режиме дообучения после завершения стека:
 *   'always' — всегда при завершении стека (direct + revert)
 *   'only_if_non_retraining' — только если в стеке было хотя бы одно слово НЕ в режиме дообучения
 */
export const TRAINING_CONFIG = {
  RETRAINING_NOTICE_MODE: 'always',
  // Доп. попытка при ручном вводе: даём только если ошибка НЕ только в гарумзиме.
  ALLOW_SECOND_MANUAL_ATTEMPT_NON_GARUM: false,
  // Доп. попытка для фраз: при любой ошибке, если в ответе >= N слов (ручной ввод).
  ALLOW_SECOND_ATTEMPT_FOR_PHRASE: true,
  PHRASE_WORD_MIN_COUNT: 3,
};
