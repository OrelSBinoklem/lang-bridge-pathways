import { useCallback } from 'react';
import axios from 'axios';

/**
 * Хелпер для создания функций проверки групп
 */
export const createGroupCheckHandlers = (groupWords, groupCheck, checkGroupWords, getWordIdByText, isRevert = false) => {
  const handleCheck = useCallback(async () => {
    // Фильтруем только валидные wordId (исключаем 0 и null)
    const wordIds = groupWords.words
      .map(word => getWordIdByText(word))
      .filter(id => id && id !== 0);
    
    if (wordIds.length === 0) {
      console.warn('⚠️ Нет валидных слов для проверки');
      return;
    }
    
    // isRevert: false = прямой перевод (lat→rus), true = обратный (rus→lat)
    // В WordInGroup используется direction='direct', поэтому по умолчанию false
    const results = await checkGroupWords(wordIds, groupCheck.answers, isRevert);
    
    // Устанавливаем результаты для каждого слова
    Object.entries(results).forEach(([wordId, isCorrect]) => {
      const id = parseInt(wordId);
      if (id && id !== 0) {
        groupCheck.setResult(id, isCorrect);
      }
    });
  }, [groupWords.words, groupCheck, checkGroupWords, getWordIdByText, isRevert]);

  const handleReset = useCallback(() => {
    const wordIds = groupWords.words.map(word => getWordIdByText(word) || 0);
    groupCheck.reset(wordIds);
  }, [groupWords.words, groupCheck, getWordIdByText]);

  return { handleCheck, handleReset };
};

/**
 * Функция для перевода группы слов в режим обучения
 * Использует существующий endpoint create_easy_mode_for_new_words
 * @param {array} wordIds - Массив ID слов
 * @param {function} onRefreshUserData - Функция обновления данных пользователя
 * @returns {Promise<boolean>}
 */
export const startLearningForGroup = async (wordIds, onRefreshUserData) => {
  if (!wordIds || wordIds.length === 0) {
    console.warn('⚠️ Нет слов для начала обучения');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("action", "create_easy_mode_for_new_words");
    formData.append("word_ids", JSON.stringify(wordIds));

    const response = await axios.post(window.myajax.url, formData);

    if (response.data.success) {
      console.log('✅ Слова переведены в режим обучения');
      
      // Обновляем данные пользователя
      if (onRefreshUserData) {
        await onRefreshUserData();
      }
      
      return true;
    } else {
      console.error('❌ Ошибка при переводе слов в режим обучения:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при переводе слов в режим обучения:', error);
    return false;
  }
};

/**
 * Хелпер для создания группы слов с автоматической регистрацией
 */
export const createWordGroup = (groupCheck, groupWords) => {
  return {
    groupCheck,
    groupWords,
    addWord: (wordText) => groupWords.addWord(wordText),
    getWords: () => groupWords.words,
    reset: () => groupWords.reset()
  };
};

export default {
  createGroupCheckHandlers,
  createWordGroup
};
