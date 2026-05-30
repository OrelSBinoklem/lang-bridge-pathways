import React from 'react';
import axios from 'axios';
import { checkTranslation, getWordDisplayStatusEducation, getWordDisplayStatusExamen, formatTime, getCooldownTime, groupWordsByStatus, getWordsStats, normalizeString } from '../utils/helpers';
import CategoryWordManagement from '../components/CategoryWordManagement';
import ExamenViewModeSwitch from '../components/ExamenViewModeSwitch';
import { hasCustomCategoryTemplate } from '../utils/examenViewMode';
import { useAdminMode } from '../contexts/AdminModeContext';

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
  categories: categoriesProp = [],
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
  const submitWordAttempt = async (wordId, isRevertMode, isCorrect, isFirstAttempt) => {
    const formData = new FormData();
    formData.append('action', 'update_word_attempts');
    formData.append('word_id', wordId);
    formData.append('is_revert', isRevertMode ? 1 : 0);
    formData.append('is_correct', isCorrect ? 1 : 0);
    formData.append('is_first_attempt', isFirstAttempt);
    const response = await axios.post(window.myajax.url, formData);
    return response.data;
  };

  /**
   * @param {object} [options]
   * @param {boolean} [options.creditDirectOnRevertCorrect] — при верном обратном ответе засчитать и прямой перевод
   */
  const checkGroupWords = async (wordIds, answers, isRevert = false, options = {}) => {
    const { creditDirectOnRevertCorrect = false } = options;
    const results = {};
    let hasChanges = false;
    const seen = new Set();
    const uniqueWordIds = wordIds.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    for (const wordId of uniqueWordIds) {
      const word = dictionaryWordsById[wordId];
      if (!word) {
        console.warn(`⚠️ Слово ${wordId} не найдено`);
        continue;
      }
      // Не отправляем на сервер слова, которые сейчас на откате (таймер)
      const displayStatus = displayStatuses[wordId];
      const onCooldown = isRevert ? displayStatus?.cooldownRevert : displayStatus?.cooldownDirect;
      if (onCooldown) continue;

      const answer = answers[wordId] || '';
      console.log(`📝 Слово ${wordId}: ответ = "${answer}"`);
      
      if (answer.trim()) {
        const isCorrect = checkTranslation(word, answer, isRevert);
        console.log(`✓ Результат проверки: ${isCorrect ? '✅ правильно' : '❌ неправильно'}`);
        
        results[wordId] = isCorrect;
        
        // Определяем is_first_attempt по той же логике, что и в Examen.jsx
        // Логика: если mode_education === 1 (режим "Учу"), то is_first_attempt = 0
        // Если mode_education === 0 (не в режиме "Учу"), то is_first_attempt = 1
        const userData = userWordsData[wordId];
        const me = isRevert ? userData?.mode_education_revert : userData?.mode_education;
        const isFirstAttempt = me ? 0 : 1;

        console.log(`🔍 Определение is_first_attempt:`, { 
          wordId, 
          isRevert, 
          mode_education: me,
          isFirstAttempt 
        });

        try {
          const pendingRequests = [
            submitWordAttempt(wordId, isRevert, isCorrect, isFirstAttempt),
          ];

          if (isCorrect && isRevert && creditDirectOnRevertCorrect && !displayStatus?.cooldownDirect) {
            const directEasy = Number(userData?.mode_education) === 1;
            const directLearned = (userData?.correct_attempts ?? 0) >= 2 && !directEasy;
            if (!directLearned) {
              const isFirstAttemptDirect = userData?.mode_education ? 0 : 1;
              console.log('📤 Параллельно засчитываем прямой перевод...', { wordId, isFirstAttemptDirect });
              pendingRequests.push(submitWordAttempt(wordId, false, true, isFirstAttemptDirect));
            }
          }

          console.log('📤 Отправка в БД...', { wordId, isCorrect, isRevert, isFirstAttempt, parallel: pendingRequests.length });
          const responses = await Promise.all(pendingRequests);
          responses.forEach((response, index) => {
            console.log(`📥 Ответ БД (${index === 0 ? 'основной' : 'прямой'}):`, response);
          });
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
   * Индекс: { [categoryId]: { [word]: wordObject } }
   * При дубликатах word.word сохраняем массив — берём слово из words (порядок категории)
   */
  const wordIndexByCategory = {};
  const translationIndexByCategory = {};

  const addWordToCategoryIndexes = (word, catId, priority = false) => {
    if (!wordIndexByCategory[catId]) wordIndexByCategory[catId] = {};
    if (!translationIndexByCategory[catId]) translationIndexByCategory[catId] = {};
    if (priority || !wordIndexByCategory[catId][word.word]) {
      wordIndexByCategory[catId][word.word] = word;
    }
    [word.translation_1, word.translation_2, word.translation_3]
      .filter((t) => t && t !== '0')
      .forEach((t) => {
        const norm = normalizeString(t);
        if (priority || !translationIndexByCategory[catId][norm]) {
          translationIndexByCategory[catId][norm] = word;
        }
      });
  };

  // Сначала заполняем из words категории (приоритет), чтобы при дубликатах брать нужное
  if (words && words.length > 0) {
    const catId = category?.id;
    if (catId != null) {
      words.forEach((word) => addWordToCategoryIndexes(word, catId, true));
    }
  }
  dictionaryWords.forEach((word) => {
    if (Array.isArray(word.category_ids)) {
      word.category_ids.forEach((catId) => addWordToCategoryIndexes(word, catId, false));
    }
  });

  /**
   * Получить слово по тексту из текущей категории (при дубликатах — приоритет у words)
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

  /** Поиск по translation_1 (standard-ключ вида "būt es pag") */
  const getWordByTranslation = (translationKey, categoryId = category.id) => {
    const key = normalizeString(translationKey);
    return translationIndexByCategory[categoryId]?.[key] || null;
  };

  const getWordIdByTranslation = (translationKey, categoryId = category.id) => {
    return getWordByTranslation(translationKey, categoryId)?.id || null;
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
    getWordByTranslation, // (standardKey, categoryId?) => word объект
    getWordIdByTranslation, // (standardKey, categoryId?) => wordId
    getWordPropsByText, // (wordText, extraProps) => props для Word
    isWordInCurrentCategory, // (wordText, categoryId?) => boolean
    wordIndexByCategory, // { [categoryId]: { [word]: wordObject } }
    translationIndexByCategory, // { [categoryId]: { [normalizedTranslation]: wordObject } }
    
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
    formatTime,
    mode,
    currentTime,
  };
  
  // ============================================================================
  // РЕНДЕР
  // ============================================================================
  
  // Определяем categoryId для управления словами
  // Приоритет: прямой проп categoryId > category.id > 0
  const categoryIdForManagement = categoryId || category?.id || (category && typeof category === 'object' && 'id' in category ? category.id : null) || 0;
  const { isAdminModeActive } = useAdminMode();
  const showDefaultViewLink =
    isAdminModeActive && hasCustomCategoryTemplate(dictionaryId, categoryIdForManagement);

  return (
    <>
      {showDefaultViewLink && <ExamenViewModeSwitch forceDefaultView={false} />}
      {children(renderProps)}
      {/* Управление словами - отображается во всех категориях (и кастомных, и обычных) */}
      <CategoryWordManagement
        dictionaryId={dictionaryId}
        categoryId={categoryIdForManagement}
        categoryWords={words}
        dictionaryWords={Array.isArray(dictionaryWords) ? dictionaryWords : []}
        categories={categoriesProp}
        onWordsChanged={onRefreshDictionaryWords}
      />
    </>
  );
};

export default CategoryLayout;

