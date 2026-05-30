/**
 * Конфигурация кастомных компонентов для категорий
 * 
 * Здесь вы привязываете свои React компоненты к конкретным словарям и категориям
 */

// ============================================================================
// ИМПОРТЫ КАСТОМНЫХ КОМПОНЕНТОВ КАТЕГОРИЙ
// ============================================================================
// Примеры кастомных категорий:
import SimpleExampleCategory from '../categories/SimpleExampleCategory';
import BaseTemplate from '../categories/BaseTemplate';
import VerbConjugationCategory from '../categories/VerbConjugationCategory';
import VerbConjugationCategory1 from '../categories/VerbConjugationCategory1';
import VerbConjugationCategory2 from '../categories/VerbConjugationCategory2';

// Ваши компоненты:
// import MyCategoryComponent from '../categories/MyCategoryComponent';


// ============================================================================
// КОНФИГУРАЦИЯ КАТЕГОРИЙ
// ============================================================================
/**
 * Привязка кастомных компонентов к категориям
 * 
 * Ключ может быть:
 * - 'dictionary_id:category_id' - для конкретной категории в конкретном словаре
 * - 'category_id' - для категории в любом словаре
 * 
 * Значение - React компонент
 */
export const customCategoryComponents = {
  // 📝 ПРИМЕРЫ - замените на свои ID!
  // Чтобы узнать ID вашего словаря и категории:
  // 1. Откройте категорию в браузере
  // 2. Откройте консоль (F12)
  // 3. Посмотрите логи: "dictionaryId = X, categoryId = Y"
  
  //'20:1721': SimpleExampleCategory,     // Простой пример с группировкой
  //'20:1721': BaseTemplate,           // Базовый шаблон для копирования
  '20:1721': VerbConjugationCategory,    // Таблица спряжений глаголов
  '20:1733': VerbConjugationCategory,    // Таблица спряжений глаголов
  '20:1736': VerbConjugationCategory1,    // Таблица спряжений глаголов (первая группа)
  '20:1737': VerbConjugationCategory2,    // Таблица спряжений глаголов (вторая группа)
  
  // Примеры регистрации:
  // '1:5': SimpleExampleCategory,    // Словарь ID=1, Категория ID=5
  // '10': BaseTemplate,              // Категория ID=10 в любом словаре
  
  // Ваши компоненты:
  // '1:3': MyCategoryComponent,
};


// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Получить кастомный компонент для категории
 * @param {number|string} dictionaryId - ID словаря
 * @param {number|string} categoryId - ID категории
 * @returns {React.Component|null} - Кастомный компонент или null
 */
/** Категории со спряжением: тренировка в полях таблицы, без модального окна */
const INLINE_FIELD_TRAINING_KEYS = new Set([
  '20:1721',
  '20:1733',
  '20:1736',
  '20:1737',
]);

export const usesInlineFieldTraining = (dictionaryId, categoryId) => {
  return INLINE_FIELD_TRAINING_KEYS.has(`${dictionaryId}:${categoryId}`);
};

export const getCustomCategoryComponent = (dictionaryId, categoryId) => {
  // Пробуем найти по точному совпадению dictionary:category
  const exactKey = `${dictionaryId}:${categoryId}`;
  if (customCategoryComponents[exactKey]) {
    return customCategoryComponents[exactKey];
  }
  
  // Пробуем найти по ID категории
  const categoryKey = `${categoryId}`;
  if (customCategoryComponents[categoryKey]) {
    return customCategoryComponents[categoryKey];
  }
  
  return null;
};
