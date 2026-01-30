/**
 * Генератор вариантов ответов для режима выбора с модификацией гласных
 */

/**
 * Модифицирует гласные в слове (короткие ↔ длинные)
 */
const modifyVowel = (text) => {
  const vowelMap = {
    'a': 'ā', 'ā': 'a',
    'e': 'ē', 'ē': 'e',
    'i': 'ī', 'ī': 'i',
    'u': 'ū', 'ū': 'u',
    'A': 'Ā', 'Ā': 'A',
    'E': 'Ē', 'Ē': 'E',
    'I': 'Ī', 'Ī': 'I',
    'U': 'Ū', 'Ū': 'U',
  };
  
  const vowelPositions = [];
  for (let i = 0; i < text.length; i++) {
    if (vowelMap[text[i]]) {
      vowelPositions.push(i);
    }
  }
  
  if (vowelPositions.length === 0) return text;
  
  const randomIndex = Math.floor(Math.random() * vowelPositions.length);
  const pos = vowelPositions[randomIndex];
  const char = text[pos];
  
  return text.substring(0, pos) + vowelMap[char] + text.substring(pos + 1);
};

/**
 * Ищет похожие слова по первой букве с случайной стартовой позицией
 */
const findSimilarWordsWithRandomStart = (wordList, getAnswer, firstChar, maxCount, usedSet, targetArray = null) => {
  const similar = wordList.filter(w => {
    const a = getAnswer(w);
    return a && !usedSet.has(a) && a.charAt(0).toLowerCase() === firstChar;
  });
  
  if (similar.length === 0) return [];
  
  const startIndex = Math.floor(Math.random() * similar.length);
  const isNearEnd = startIndex > similar.length * 0.8;
  const result = targetArray || [];
  const resultSet = new Set();
  
  const tryAdd = (w) => {
    if (result.length >= maxCount) return false;
    const a = getAnswer(w);
    if (a && !usedSet.has(a) && !resultSet.has(a)) {
      if (targetArray) {
        // Если targetArray - это массив объектов {answer, word}
        result.push({ answer: a, word: w });
      } else {
        // Если это просто массив ответов
        result.push(a);
      }
      resultSet.add(a);
      usedSet.add(a);
      return true;
    }
    return false;
  };
  
  if (isNearEnd) {
    for (let i = startIndex; i >= 0 && result.length < maxCount; i--) tryAdd(similar[i]);
    if (result.length < maxCount) {
      for (let i = similar.length - 1; i > startIndex && result.length < maxCount; i--) tryAdd(similar[i]);
    }
  } else {
    for (let i = startIndex; i < similar.length && result.length < maxCount; i++) tryAdd(similar[i]);
    if (result.length < maxCount) {
      for (let i = 0; i < startIndex && result.length < maxCount; i++) tryAdd(similar[i]);
    }
  }
  
  return result;
};

/**
 * Добавляет слова из списка в целевой массив с проверками
 */
const addWordsToList = (wordList, getAnswer, targetList, targetSet, usedSet, maxCount, excludeWordId = null) => {
  for (const w of wordList) {
    if (targetList.length >= maxCount) break;
    if (excludeWordId && w.id === excludeWordId) continue;
    const a = getAnswer(w);
    if (a && !usedSet.has(a) && !targetSet.has(a)) {
      targetList.push(a);
      targetSet.add(a);
      usedSet.add(a);
    }
  }
};

/**
 * Генерирует 6 вариантов ответа для режима выбора (1 правильный + 5 неправильных)
 * 
 * @param {Object} params - Параметры генерации
 * @param {Object} params.word - Текущее слово для тренировки
 * @param {boolean} params.mode - Режим: false = прямой перевод (лат→рус), true = обратный (рус→лат)
 * @param {number} params.categoryId - ID категории
 * @param {Array} params.dictionaryWords - Все слова словаря
 * @param {Function} params.getWordDisplayStatus - Функция для получения статуса слова
 * @param {Function} params.shuffleArray - Функция для перемешивания массива
 * @param {string} [params.learnLang='LV'] - Язык изучения (LV/EN). Для EN не создаём варианты с гарумзимэ (ā, ē, ī, ū).
 * @returns {Array<string>} Массив из 6 вариантов ответа (перемешанных)
 */
export const generateChoiceOptions = ({
  word,
  mode,
  categoryId,
  dictionaryWords,
  getWordDisplayStatus,
  shuffleArray,
  learnLang = 'LV'
}) => {
  const getAnswer = (w) => (mode ? w.word : (w.translation_1 || '')).trim();
  const correct = getAnswer(word);
  if (!correct) return [correct];

  // Фильтрация по категории
  const catFilter = (w) => {
    if (categoryId === 0) return true;
    const cid = parseInt(categoryId);
    if (w.category_id !== undefined) return parseInt(w.category_id) === cid;
    if (Array.isArray(w.category_ids) && w.category_ids.length > 0) {
      return w.category_ids.some(id => parseInt(id) === cid);
    }
    return false;
  };
  
  const categoryWords = dictionaryWords.filter(catFilter);
  const restWords = dictionaryWords.filter(w => !catFilter(w));
  const firstChar = correct.charAt(0).toLowerCase();
  const used = new Set([correct]);
  const baseWords = [];

  // Добавляет слова из списка в baseWords
  const addFrom = (list, preferUnlearned = false, maxCount = 5) => {
    const withStatus = list
      .filter(w => w.id !== word.id)
      .map(w => ({ 
        w,
        a: getAnswer(w),
        unlearned: !getWordDisplayStatus(w.id).fullyLearned
      }))
      .filter(x => x.a && !used.has(x.a));
    
    if (preferUnlearned) {
      withStatus.sort((a, b) => (a.unlearned ? 0 : 1) - (b.unlearned ? 0 : 1));
    }
    
    for (const { a, w } of withStatus) {
      if (baseWords.length >= maxCount) break;
      if (!used.has(a)) {
        used.add(a);
        baseWords.push({ answer: a, word: w });
      }
    }
  };

  // ШАГ 1: Собираем 3 неправильных слова
  addFrom(categoryWords, true, 3);
  
  // 1.2: Похожие по первой букве из остального словаря
  if (baseWords.length < 3) {
    findSimilarWordsWithRandomStart(restWords, getAnswer, firstChar, 3 - baseWords.length, used, baseWords);
  }
  
  // 1.3: Любые из остального словаря
  if (baseWords.length < 3) {
    addFrom(restWords, false, 3);
  }

  if (baseWords.length < 3) {
    return shuffleArray([correct, ...baseWords.map(item => item.answer)]);
  }

  const wrong = [];
  const usedAnswers = new Set([correct]);
  const addToWrong = (answer) => {
    if (answer && answer !== correct && !usedAnswers.has(answer)) {
      wrong.push(answer);
      usedAnswers.add(answer);
    }
  };

  // Для английского (и не латышского) не делаем варианты с гарумзимэ (ā, ē, ī, ū)
  const useLatvianLongVowels = (learnLang || 'LV').toUpperCase() === 'LV';

  if (useLatvianLongVowels) {
    // ШАГ 2-4: Формируем 4 слова, выбираем 2 для модификации гласных, модифицируем
    const allFour = [
      { answer: correct, isCorrect: true },
      ...baseWords.map(item => ({ answer: item.answer, isCorrect: false }))
    ];
    const shuffledFour = shuffleArray([...allFour]);
    const toModify = shuffledFour.slice(0, 2);
    const toKeep = shuffledFour.slice(2);
    const modified = toModify.map(item => ({
      original: item.answer,
      answer: modifyVowel(item.answer),
      isCorrect: false
    }));
    modified.forEach((item, index) => {
      const original = toModify[index].answer;
      if (item.answer !== original) addToWrong(item.answer);
    });
    toModify.forEach(item => {
      if (!item.isCorrect) addToWrong(item.answer);
    });
    toKeep.forEach(item => {
      if (!item.isCorrect) addToWrong(item.answer);
    });
  } else {
    // Без модификации гласных: просто 3 неправильных из baseWords
    baseWords.forEach(item => addToWrong(item.answer));
  }

  // ШАГ 5.9: Недостающие слова из текущей категории
  if (wrong.length < 5) {
    const needed = 5 - wrong.length;
    const tempUsed = new Set([...used, ...baseWords.map(item => item.answer)]);
    const categoryAdditional = [];
    const categorySet = new Set();
    addWordsToList(categoryWords, getAnswer, categoryAdditional, categorySet, tempUsed, needed, word.id);
    wrong.push(...categoryAdditional);
    categoryAdditional.forEach(a => usedAnswers.add(a));
  }
  
  // ШАГ 6: Поиск во всём словаре
  if (wrong.length < 5) {
    const needed = 5 - wrong.length;
    const tempUsed = new Set([...used, ...baseWords.map(item => item.answer)]);
    const additionalWords = [];
    const additionalSet = new Set();
    
    // 6.1: Похожие по первой букве
    const similarAnswers = findSimilarWordsWithRandomStart(restWords, getAnswer, firstChar, needed, tempUsed);
    similarAnswers.forEach(a => {
      if (!usedAnswers.has(a) && !additionalSet.has(a)) {
        additionalWords.push(a);
        additionalSet.add(a);
        usedAnswers.add(a);
      }
    });
    
    // 6.2: Любые из остального словаря
    if (additionalWords.length < needed) {
      addWordsToList(restWords, getAnswer, additionalWords, additionalSet, tempUsed, needed, word.id);
    }
    
    // 6.3: Любые из всего словаря
    if (additionalWords.length < needed) {
      addWordsToList(dictionaryWords, getAnswer, additionalWords, additionalSet, tempUsed, needed, word.id);
    }
    
    additionalWords.forEach(a => {
      wrong.push(a);
      usedAnswers.add(a);
    });
  }

  return shuffleArray([correct, ...wrong.slice(0, 5)]);
};
