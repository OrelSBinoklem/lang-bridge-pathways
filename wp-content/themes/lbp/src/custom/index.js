/**
 * Главный экспорт модуля кастомных категорий
 */

// Конфигурация
export {
  customCategoryComponents,
  getCustomCategoryComponent,
} from './config/customComponents';

// Компоненты
export { default as Word } from './components/Word';
export { default as WordField } from './components/WordField';
export { default as WordInGroup } from './components/WordInGroup';

// Layouts
export { default as CategoryLayout } from './layouts/CategoryLayout';

// Хуки
export { default as useGroupCheck } from './hooks/useGroupCheck';

// Полезные утилиты
export {
  normalizeString,
  checkTranslation,
  groupWordsByStatus,
  splitIntoGroups,
  getWordsStats,
  formatTime,
  getCooldownTime,
  getWordDisplayStatusEducation,
  getWordDisplayStatusExamen,
} from './utils/helpers';

// Примеры компонентов
export { default as SimpleExampleCategory } from './categories/SimpleExampleCategory';
export { default as TestCategory } from './categories/TestCategory';
