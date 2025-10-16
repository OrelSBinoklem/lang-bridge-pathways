/**
 * Хелпер для работы с группами слов в кастомных категориях
 */

/**
 * Создать группу слов для проверки
 * @param {string} name - Название группы
 * @param {array} words - Массив слов на латышском
 * @param {object} wordIndexByCategory - Индекс { [categoryId]: { [word]: wordObject } }
 * @param {number} categoryId - ID текущей категории
 * @returns {object} - Объект группы
 */
export const createGroup = (name, words, wordIndexByCategory, categoryId) => {
  const wordIds = [];
  const validWords = [];
  
  words.forEach(wordText => {
    const word = wordIndexByCategory[categoryId]?.[wordText];
    if (word) {
      wordIds.push(word.id);
      validWords.push(wordText);
    } else {
      console.warn(`Слово "${wordText}" не найдено в категории ${categoryId}`);
    }
  });
  
  return {
    name,
    words: validWords, // Только валидные слова
    wordIds,
    getWordId: (wordText) => wordIndexByCategory[categoryId]?.[wordText]?.id || null,
    isValidWord: (wordText) => wordIndexByCategory[categoryId]?.hasOwnProperty(wordText) || false
  };
};

/**
 * Создать несколько групп
 * @param {object} groupsConfig - Конфиг групп { [name]: [words] }
 * @param {object} wordIndexByCategory - Индекс { [categoryId]: { [word]: wordObject } }
 * @param {number} categoryId - ID текущей категории
 * @returns {array} - Массив групп
 */
export const createGroups = (groupsConfig, wordIndexByCategory, categoryId) => {
  return Object.entries(groupsConfig).map(([name, words]) => 
    createGroup(name, words, wordIndexByCategory, categoryId)
  );
};

/**
 * Хелпер для создания пропсов Word с группой
 * @param {object} group - Объект группы
 * @param {string} wordText - Слово на латышском
 * @param {object} groupCheck - Объект useGroupCheck
 * @param {object} extraProps - Дополнительные пропсы
 * @returns {object} - Пропсы для Word компонента
 */
export const getWordPropsWithGroup = (group, wordText, groupCheck, extraProps = {}) => {
  const wordId = group.getWordId(wordText);
  if (!wordId) {
    console.warn(`Слово "${wordText}" не найдено в группе "${group.name}"`);
    return null;
  }
  
  return {
    wordId,
    directValue: groupCheck.answers[wordId] || '',
    onDirectChange: groupCheck.setAnswer,
    highlightDirectCorrect: groupCheck.results[wordId] === true,
    highlightDirectIncorrect: groupCheck.results[wordId] === false,
    ...extraProps
  };
};

/**
 * Хелпер для быстрого рендера Word с полем ввода
 * @param {function} getWordPropsByText - Функция из CategoryLayout
 * @param {object} group - Объект группы
 * @param {string} wordText - Слово на латышском
 * @param {object} groupCheck - Объект useGroupCheck
 * @param {object} extraProps - Дополнительные пропсы
 * @returns {object|null} - Пропсы для Word компонента или null
 */
export const wordField = (getWordPropsByText, group, wordText, groupCheck, extraProps = {}) => {
  const wordId = group.getWordId(wordText);
  if (!wordId) {
    console.warn(`wordField: слово "${wordText}" не найдено в группе "${group.name}"`);
    return null;
  }
  
  const props = getWordPropsByText(wordText, {
    type: 'field',
    directValue: groupCheck.answers[wordId] || '',
    onDirectChange: groupCheck.setAnswer,
    highlightDirectCorrect: groupCheck.results[wordId] === true,
    highlightDirectIncorrect: groupCheck.results[wordId] === false,
    ...extraProps
  });
  
  if (!props) {
    console.warn(`wordField: не удалось получить пропсы для слова "${wordText}"`);
    return null;
  }
  
  return props;
};

export default {
  createGroup,
  createGroups,
  getWordPropsWithGroup,
  wordField
};
