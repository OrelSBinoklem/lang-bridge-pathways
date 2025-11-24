import React from 'react';
import axios from 'axios';
import { checkTranslation, getWordDisplayStatusEducation, getWordDisplayStatusExamen, formatTime, getCooldownTime, groupWordsByStatus, getWordsStats } from '../utils/helpers';
import CategoryWordManagement from '../components/CategoryWordManagement';

/**
 * Универсальный layout для кастомных категорий
 * 
 * Обрабатывает всю логику, предоставляет render-функцию для контента
 * 
 * Использование:
 * <CategoryLayout {...props}>
 *   {({ renderWord, renderGroup, stats, helpers }) => (
 *     // Ваш кастомный контент
 *   )}
 * </CategoryLayout>
 */
const CategoryLayout = ({
  category,
  words,
  dictionaryId,
  dictionaryWords,
  dictionaryWordsById,
  userWordsData,
  displayStatuses,
  editingWordId,
  onToggleEdit,
  onRefreshDictionaryWords,
  onRefreshUserData,
  formatTime,
  mode,
  currentTime,
  children, // Render-функция
  categoryId, // Прямая передача categoryId (опционально, для надежности)
}) => {
  
  // ============================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ============================================================================
  
  /**
   * Проверить группу слов и обновить БД
   * @param {array} wordIds - Массив ID слов для проверки
   * @param {object} answers - Объект ответов { [wordId]: "ответ" }
   * @param {boolean} isRevert - Тип перевода: true = обратный (rus→lat), false = прямой (lat→rus)
   * @returns {object} - Результаты проверки { [wordId]: true/false }
   */
  const checkGroupWords = async (wordIds, answers, isRevert = false) => {
    const results = {};
    let hasChanges = false;
    
    console.log('🔍 checkGroupWords начало', { wordIds, isRevert });
    
    for (const wordId of wordIds) {
      const word = dictionaryWordsById[wordId];
      if (!word) {
        console.warn(`⚠️ Слово ${wordId} не найдено`);
        continue;
      }
      
      const answer = answers[wordId] || '';
      console.log(`📝 Слово ${wordId}: ответ = "${answer}"`);
      
      if (answer.trim()) {
        const isCorrect = checkTranslation(word, answer, isRevert);
        console.log(`✓ Результат проверки: ${isCorrect ? '✅ правильно' : '❌ неправильно'}`);
        
        results[wordId] = isCorrect;
        
        // Обновляем прогресс в БД
        try {
          const formData = new FormData();
          formData.append("action", "update_word_attempts");
          formData.append("word_id", wordId);
          formData.append("is_revert", isRevert ? 1 : 0);
          formData.append("is_correct", isCorrect ? 1 : 0);
          formData.append("is_first_attempt", 1);
          
          console.log('📤 Отправка в БД...', { wordId, isCorrect, isRevert });
          const response = await axios.post(window.myajax.url, formData);
          console.log('📥 Ответ БД:', response.data);
          
          hasChanges = true;
        } catch (err) {
          console.error('❌ Ошибка обновления прогресса:', err);
        }
      }
    }
    
    // Обновляем данные пользователя только если были изменения
    console.log(`🔄 hasChanges = ${hasChanges}, onRefreshUserData = ${!!onRefreshUserData}`);
    if (hasChanges && onRefreshUserData) {
      console.log('🔄 Вызываем onRefreshUserData...');
      await onRefreshUserData();
      console.log('✅ onRefreshUserData завершён');
    }
    
    return results;
  };
  
  /**
   * Получить props для Word компонента
   */
  const getWordProps = (wordId, extraProps = {}) => {
    return {
      key: wordId,
      wordId,
      dictionaryWords,
      userWordsData,
      displayStatus: displayStatuses[wordId],
      dictionaryId,
      editingWordId,
      onToggleEdit,
      onRefreshDictionaryWords,
      mode,
      currentTime,
      ...extraProps,
    };
  };
  
  /**
   * Получить слово по ID
   */
  const getWord = (wordId) => {
    return dictionaryWordsById[wordId];
  };
  
  /**
   * Создаём эффективный индекс: { [categoryId]: { [word]: wordObject } }
   */
  const wordIndexByCategory = {};
  dictionaryWords.forEach(word => {
    if (Array.isArray(word.category_ids)) {
      word.category_ids.forEach(catId => {
        if (!wordIndexByCategory[catId]) {
          wordIndexByCategory[catId] = {};
        }
        wordIndexByCategory[catId][word.word] = word;
      });
    }
  });
  
  /**
   * Получить слово по тексту из текущей категории
   */
  const getWordByText = (wordText, categoryId = category.id) => {
    return wordIndexByCategory[categoryId]?.[wordText] || null;
  };
  
  /**
   * Получить ID слова по тексту (только из текущей категории)
   */
  const getWordIdByText = (wordText, categoryId = category.id) => {
    const word = getWordByText(wordText, categoryId);
    return word?.id || null;
  };
  
  /**
   * Проверить принадлежность слова к текущей категории
   */
  const isWordInCurrentCategory = (wordText, categoryId = category.id) => {
    return wordIndexByCategory[categoryId]?.hasOwnProperty(wordText) || false;
  };
  
  /**
   * Хелпер для Word с текстом слова
   */
  const getWordPropsByText = (wordText, extraProps = {}) => {
    const wordId = getWordIdByText(wordText);
    if (!wordId) {
      console.warn(`Слово "${wordText}" не найдено в категории ${category.id}`);
      return null;
    }
    return getWordProps(wordId, extraProps);
  };
  
  /**
   * Фильтровать слова
   */
  const filterWords = (filterFn) => {
    return words.filter(filterFn);
  };
  
  /**
   * Группировать слова по статусу
   */
  const groupByStatus = () => {
    return {
      learned: words.filter(w => displayStatuses[w.id]?.fullyLearned),
      learning: words.filter(w => !displayStatuses[w.id]?.fullyLearned),
      all: words,
    };
  };
  
  /**
   * Получить статистику
   */
  const getStats = () => {
    const learned = words.filter(w => displayStatuses[w.id]?.fullyLearned).length;
    const total = words.length;
    
    return {
      total,
      learned,
      learning: total - learned,
      progress: total > 0 ? Math.round((learned / total) * 100) : 0,
    };
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  /**
   * Render-пропсы для детей
   */
  const renderProps = {
    // Данные
    category,
    words,
    dictionaryWordsById,
    userWordsData,
    displayStatuses,
    
    // Методы для Word
    getWordProps,      // (wordId, extraProps) => props для Word
    getWord,           // (wordId) => word объект
    getWordByText,     // (wordText, categoryId?) => word объект
    getWordIdByText,   // (wordText, categoryId?) => wordId
    getWordPropsByText, // (wordText, extraProps) => props для Word
    isWordInCurrentCategory, // (wordText, categoryId?) => boolean
    wordIndexByCategory, // { [categoryId]: { [word]: wordObject } }
    
    // Фильтрация и группировка
    filterWords,       // (filterFn) => отфильтрованные слова
    groupByStatus,     // () => {learned, learning, all}
    
    // Статистика
    stats: getStats(), // {total, learned, learning, progress}
    
    // Групповая проверка
    checkGroupWords,   // (wordIds, answers, isRevert) => results
    
    // Все остальные пропсы
    dictionaryId,
    editingWordId,
    onToggleEdit,
    onRefreshDictionaryWords,
    onRefreshUserData,
    mode,
    currentTime,
  };
  
  // ============================================================================
  // РЕНДЕР
  // ============================================================================
  
  // Определяем categoryId для управления словами
  // Приоритет: прямой проп categoryId > category.id > 0
  const categoryIdForManagement = categoryId || category?.id || (category && typeof category === 'object' && 'id' in category ? category.id : null) || 0;
  
  return (
    <>
      {children(renderProps)}
      {/* Управление словами - отображается во всех категориях (и кастомных, и обычных) */}
      <CategoryWordManagement
        dictionaryId={dictionaryId}
        categoryId={categoryIdForManagement}
        categoryWords={words}
        onWordsChanged={onRefreshDictionaryWords}
      />
    </>
  );
};

export default CategoryLayout;

