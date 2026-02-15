/**
 * Полезные утилиты для кастомных категорий
 */

const TRAINING_ANSWER_MODE_KEY = 'lbp_training_answer_mode';
const TRAINING_ANSWER_MODE_MAX_AGE_DAYS = 7;

/**
 * Режим ввода ответа: 'select' — выбор из предложенных, 'type' — ввод вручную.
 * @returns {'select'|'type'|null} null если нет в куках
 */
export const getTrainingAnswerMode = () => {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^|;)\\s*' + TRAINING_ANSWER_MODE_KEY + '=([^;]+)'));
  const v = m ? m[2].trim().toLowerCase() : null;
  return (v === 'select' || v === 'type') ? v : null;
};

/**
 * Сохранить режим в куки на 1 неделю.
 * @param {'select'|'type'} mode
 */
export const setTrainingAnswerMode = (mode) => {
  if (typeof document === 'undefined') return;
  const maxAge = TRAINING_ANSWER_MODE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${TRAINING_ANSWER_MODE_KEY}=${mode}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

/**
/**
 * Удаляет скобки с содержимым и знаки препинания (. , ; : ? !) — для подстановки в поле и сравнения ответов
 */
export const stripParenthesesAndPunctuation = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[.,;:?!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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
// ТЕСТОВЫЙ РЕЖИМ ОТКАТОВ: true = 1 мин и 2 мин, false = 30 мин и 20 часов
const TEST_COOLDOWN_MODE = false;
const TEST_COOLDOWN_FIRST = 1 * 60 * 1000;   // 1 минута
const TEST_COOLDOWN_SECOND = 2 * 60 * 1000;  // 2 минуты
const NORMAL_COOLDOWN_FIRST = 30 * 60 * 1000;   // 30 минут
const NORMAL_COOLDOWN_SECOND = 20 * 60 * 60 * 1000;  // 20 часов

export const getCooldownTime = (lastShown, correctAttempts, modeEducation = 0, currentTime = Date.now()) => {
  // Проверяем на пустое значение или MySQL нулевую дату
  if (!lastShown || lastShown === '' || lastShown === '0000-00-00 00:00:00') {
    return null;
  }
  
  // Парсим дату как UTC: MySQL "2025-10-28 23:30:46" -> ISO "2025-10-28T23:30:46Z"
  // Добавляем 'Z' в конец, чтобы JavaScript парсил как UTC
  const lastShownISO = lastShown.replace(' ', 'T') + 'Z';
  const lastShownDate = new Date(lastShownISO);
  
  if (isNaN(lastShownDate.getTime())) {
    console.error('❌ Invalid lastShown date:', lastShown);
    return null;
  }
  
  const lastShownTime = lastShownDate.getTime();
  const elapsed = currentTime - lastShownTime;
  
  let cooldownDuration;
  const cooldownFirst = TEST_COOLDOWN_MODE ? TEST_COOLDOWN_FIRST : NORMAL_COOLDOWN_FIRST;
  const cooldownSecond = TEST_COOLDOWN_MODE ? TEST_COOLDOWN_SECOND : NORMAL_COOLDOWN_SECOND;

  if (correctAttempts === 0) {
    if (modeEducation === 0) {
      cooldownDuration = cooldownFirst;
    }
  } else if (correctAttempts === 1) {
    if (modeEducation === 0) {
      cooldownDuration = cooldownSecond;
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
  // Если нет записи вообще - показываем слово и перевод открыто (как в удалённом режиме обучения)
  if (!userData) {
    return {
      showWord: true,            // Показываем слово
      showTranslation: true,     // Показываем перевод
      fullyLearned: false,
      hasAttempts: false,
      cooldownDirect: null,
      cooldownRevert: null,
      modeEducation: 0,
      modeEducationRevert: 0
    };
  }
  
  // Проверяем, является ли запись "сброшенной" (после кнопки сброса)
  // Сброшенная запись имеет все счётчики = 0 И last_shown = NULL/пустое/"0000-00-00 00:00:00"
  const isResetState = (
    userData.mode_education === 0 &&
    userData.mode_education_revert === 0 &&
    userData.attempts === 0 &&
    userData.attempts_revert === 0 && 
    userData.correct_attempts === 0 && 
    userData.correct_attempts_revert === 0 &&
    (!userData.last_shown || userData.last_shown === '' || userData.last_shown === '0000-00-00 00:00:00') &&
    (!userData.last_shown_revert || userData.last_shown_revert === '' || userData.last_shown_revert === '0000-00-00 00:00:00')
  );
  
  // Если запись сброшенная - показываем слово и перевод открыто (как в удалённом режиме обучения)
  if (isResetState) {
    return {
      showWord: true,            // Показываем слово
      showTranslation: true,     // Показываем перевод
      fullyLearned: false,
      hasAttempts: false,
      cooldownDirect: null,
      cooldownRevert: null,
      modeEducation: userData.mode_education || 0,
      modeEducationRevert: userData.mode_education_revert || 0
    };
  }
  
  // Обычная запись с реальными попытками
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
  // В лёгком режиме (mode_education/mode_education_revert == 1) не считаем слово выученным
  const inEasyMode = Number(userData.mode_education) === 1 || Number(userData.mode_education_revert) === 1;
  const fullyLearned = (directLearned && revertLearned) && !inEasyMode;

  return {
    showWord: revertLearned,
    showTranslation: directLearned,
    fullyLearned,
    hasAttempts: hasAnyAttempts,
    cooldownDirect: cooldownDirect,
    cooldownRevert: cooldownRevert,
    modeEducation: userData.mode_education,
    modeEducationRevert: userData.mode_education_revert
  };
};

