import { useCallback } from 'react';

/**
 * Хелпер для создания функций проверки групп
 */
export const createGroupCheckHandlers = (groupWords, groupCheck, checkGroupWords, getWordIdByText) => {
  const handleCheck = useCallback(async () => {
    const wordIds = groupWords.words.map(word => getWordIdByText(word) || 0);
    const results = await checkGroupWords(wordIds, groupCheck.answers, true);
    Object.entries(results).forEach(([wordId, isCorrect]) => {
      groupCheck.setResult(parseInt(wordId), isCorrect);
    });
  }, [groupWords.words, groupCheck, checkGroupWords, getWordIdByText]);

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
