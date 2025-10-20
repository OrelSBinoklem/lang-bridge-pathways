/**
 * Полезные утилиты для кастомных категорий
 */

/**
 * Нормализация строки для сравнения
 * @param {string} str - Строка для нормализации
 * @returns {string} - Нормализованная строка
 */
export const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD') // Разделяет символы и диакритические знаки
    .replace(/[\u0300-\u036f]/g, '') // Удаляет диакритические знаки
    .replace(/[.,!?;:]/g, '') // Удаляет пунктуацию
    .replace(/\s+/g, ' '); // Нормализует пробелы
};

/**
 * Проверка правильности перевода
 * @param {object} word - Объект слова
 * @param {string} userAnswer - Ответ пользователя
 * @param {boolean} isReverse - Обратный перевод (rus→lat)
 * @returns {boolean} - Правильно ли
 */
export const checkTranslation = (word, userAnswer, isReverse = false) => {
  const normalized = normalizeString(userAnswer);
  
  if (isReverse) {
    // Обратный перевод: проверяем слово
    return normalizeString(word.word) === normalized;
  } else {
    // Прямой перевод: проверяем все варианты перевода
    const correctAnswers = [
      word.translation_1,
      word.translation_2,
      word.translation_3,
    ].filter(t => t && t !== '0');
    
    return correctAnswers.some(answer => 
      normalizeString(answer) === normalized
    );
  }
};

/**
 * Группировка слов по статусу изучения
 * @param {array} words - Массив слов
 * @param {object} displayStatuses - Статусы отображения {[wordId]: {fullyLearned, ...}}
 * @returns {object} - {learned: [], learning: [], notStarted: []}
 */
export const groupWordsByStatus = (words, displayStatuses) => {
  const learned = [];
  const learning = [];
  const notStarted = [];
  
  words.forEach(word => {
    const status = displayStatuses[word.id];
    if (!status) {
      notStarted.push(word);
    } else if (status.fullyLearned) {
      learned.push(word);
    } else {
      learning.push(word);
    }
  });
  
  return { learned, learning, notStarted };
};

/**
 * Разбить слова на группы
 * @param {array} words - Массив слов
 * @param {number} groupSize - Размер группы
 * @returns {array} - Массив групп [{id, words}, ...]
 */
export const splitIntoGroups = (words, groupSize = 5) => {
  const groups = [];
  for (let i = 0; i < words.length; i += groupSize) {
    groups.push({
      id: Math.floor(i / groupSize),
      words: words.slice(i, i + groupSize),
    });
  }
  return groups;
};

/**
 * Получить статистику слов
 * @param {array} words - Массив слов
 * @param {object} displayStatuses - Статусы отображения
 * @param {object} userWordsData - Данные пользователя
 * @returns {object} - Статистика
 */
export const getWordsStats = (words, displayStatuses, userWordsData) => {
  const total = words.length;
  const learned = words.filter(w => displayStatuses[w.id]?.fullyLearned).length;
  const learning = total - learned;
  
  let totalAttempts = 0;
  let totalCorrect = 0;
  
  words.forEach(w => {
    const userData = userWordsData[w.id];
    if (userData) {
      totalAttempts += (userData.attempts || 0) + (userData.attempts_revert || 0);
      totalCorrect += (userData.correct_attempts || 0) + (userData.correct_attempts_revert || 0);
    }
  });
  
  return {
    total,
    learned,
    learning,
    progress: total > 0 ? Math.round((learned / total) * 100) : 0,
    totalAttempts,
    totalCorrect,
  };
};

/**
 * Форматирование времени (для откатов)
 * @param {number} milliseconds - Миллисекунды
 * @returns {string} - Форматированное время "ч:мм"
 */
export const formatTime = (milliseconds) => {
  const hours = Math.floor(milliseconds / (60 * 60 * 1000));
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Рассчитать оставшееся время отката
 * @param {string} lastShown - Время последнего показа
 * @param {number} correctAttempts - Количество правильных попыток
 * @param {number} modeEducation - Режим обучения (0 или 1)
 * @param {number} currentTime - Текущее время (по умолчанию Date.now())
 * @returns {number|null} - Оставшееся время в миллисекундах или null
 */
export const getCooldownTime = (lastShown, correctAttempts, modeEducation = 0, currentTime = Date.now()) => {
  if (!lastShown) return null;
  
  const lastShownTime = new Date(lastShown).getTime();
  const elapsed = currentTime - lastShownTime;
  
  let cooldownDuration;
  
  if (correctAttempts === 0) {
    if (modeEducation === 0) {
      cooldownDuration = 30 * 60 * 1000; // 30 минут
    }
  } else if (correctAttempts === 1) {
    if (modeEducation === 0) {
      cooldownDuration = 20 * 60 * 60 * 1000; // 20 часов
    }
  } else if (correctAttempts >= 2) {
    return null;
  }
  
  const remaining = cooldownDuration - elapsed;
  if (remaining <= 0) return null;
  
  return remaining;
};

/**
 * Получить статус отображения слова для режима Education
 * @param {object} userData - Данные пользователя по слову
 * @returns {object} - {showWord, showTranslation, fullyLearned}
 */
export const getWordDisplayStatusEducation = (userData) => {
  if (!userData) {
    return {
      showWord: true,
      showTranslation: true,
      fullyLearned: false
    };
  }
  
  if (userData.easy_education === 0) {
    return {
      showWord: true,
      showTranslation: true,
      fullyLearned: false
    };
  }
  
  const directLearned = userData.easy_correct === 1;
  const revertLearned = userData.easy_correct_revert === 1;
  
  return {
    showWord: directLearned,
    showTranslation: revertLearned,
    fullyLearned: directLearned && revertLearned
  };
};

/**
 * Получить статус отображения слова для режима Examen
 * @param {object} userData - Данные пользователя по слову
 * @param {number} currentTime - Текущее время для вычисления откатов
 * @returns {object} - {showWord, showTranslation, fullyLearned, hasAttempts, cooldownDirect, cooldownRevert}
 */
export const getWordDisplayStatusExamen = (userData, currentTime = Date.now()) => {
  if (!userData) {
    return {
      showWord: false,
      showTranslation: false,
      fullyLearned: false,
      hasAttempts: false,
      cooldownDirect: null,
      cooldownRevert: null
    };
  }
  
  const cooldownDirect = getCooldownTime(
    userData.last_shown, 
    userData.correct_attempts, 
    userData.mode_education,
    currentTime
  );
  const cooldownRevert = getCooldownTime(
    userData.last_shown_revert, 
    userData.correct_attempts_revert, 
    userData.mode_education_revert,
    currentTime
  );
  
  const directLearned = userData.correct_attempts >= 2;
  const revertLearned = userData.correct_attempts_revert >= 2;
  const hasAnyAttempts = userData.attempts > 0 || userData.attempts_revert > 0;
  
  return {
    showWord: directLearned,
    showTranslation: revertLearned,
    fullyLearned: directLearned && revertLearned,
    hasAttempts: hasAnyAttempts,
    cooldownDirect: cooldownDirect,
    cooldownRevert: cooldownRevert,
    modeEducation: userData.mode_education,
    modeEducationRevert: userData.mode_education_revert
  };
};

