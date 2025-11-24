import { useCallback } from 'react';

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
