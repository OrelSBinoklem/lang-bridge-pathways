// Тестовые данные для отладки компонента Examen

const testWords = [
  {
    id: 9999,
    word: "sveiki",
    translation_1: "привет",
    translation_2: "здравствуйте",
    translation_3: null,
    category_ids: [121]
  },
  {
    id: 9998,
    word: "paldies",
    translation_1: "спасибо",
    translation_2: "благодарю",
    translation_3: null,
    category_ids: [121]
  },
  {
    id: 9997,
    word: "lūdzu",
    translation_1: "пожалуйста",
    translation_2: null,
    translation_3: null,
    category_ids: [121]
  }
];

const testUserData = {
  // Слово без записи в БД (новое)
  9999: null,
  
  // Слово с 0 баллами, без отката
  9998: {
    id: 1,
    word_id: 9998,
    correct_attempts: 0,
    correct_attempts_revert: 0,
    attempts: 0,
    attempts_revert: 0,
    last_shown: null,
    last_shown_revert: null,
    mode_education: 0,
    mode_education_revert: 0,
    easy_education: 0,
    easy_correct: 0,
    easy_correct_revert: 0
  },
  
  // Слово с 1 баллом и откатом 20 часов (прямой перевод)
  9997: {
    id: 2,
    word_id: 9997,
    correct_attempts: 1,
    correct_attempts_revert: 0,
    attempts: 1,
    attempts_revert: 0,
    last_shown: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 часов назад
    last_shown_revert: null,
    mode_education: 0,
    mode_education_revert: 0,
    easy_education: 0,
    easy_correct: 0,
    easy_correct_revert: 0
  },
  
  // Слово в режиме обучения (mode_education = 1)
  9996: {
    id: 3,
    word_id: 9996,
    correct_attempts: 0,
    correct_attempts_revert: 0,
    attempts: 3,
    attempts_revert: 0,
    last_shown: null,
    last_shown_revert: null,
    mode_education: 1,
    mode_education_revert: 0,
    easy_education: 0,
    easy_correct: 0,
    easy_correct_revert: 0
  },
  
  // Слово с откатом 30 минут (после режима обучения)
  9995: {
    id: 4,
    word_id: 9995,
    correct_attempts: 1,
    correct_attempts_revert: 0,
    attempts: 5,
    attempts_revert: 0,
    last_shown: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 минут назад
    last_shown_revert: null,
    mode_education: 0,
    mode_education_revert: 0,
    easy_education: 0,
    easy_correct: 0,
    easy_correct_revert: 0
  },
  
  // Полностью изученное слово (2 балла в обе стороны)
  9994: {
    id: 5,
    word_id: 9994,
    correct_attempts: 2,
    correct_attempts_revert: 2,
    attempts: 2,
    attempts_revert: 2,
    last_shown: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    last_shown_revert: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    mode_education: 0,
    mode_education_revert: 0,
    easy_education: 0,
    easy_correct: 0,
    easy_correct_revert: 0
  },
  
  // Слово с 1 баллом в обратном переводе
  9993: {
    id: 6,
    word_id: 9993,
    correct_attempts: 2,
    correct_attempts_revert: 1,
    attempts: 2,
    attempts_revert: 1,
    last_shown: null,
    last_shown_revert: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 часа назад
    mode_education: 0,
    mode_education_revert: 0,
    easy_education: 0,
    easy_correct: 0,
    easy_correct_revert: 0
  }
};

const testDisplayStatuses = {
  // Новое слово: показываем слово, скрываем перевод
  9999: {
    showWord: true,
    showTranslation: false,
    fullyLearned: false,
    hasAttempts: false,
    cooldownDirect: null,
    cooldownRevert: null,
    modeEducation: 0,
    modeEducationRevert: 0
  },
  
  // 0 баллов: показываем слово, скрываем перевод
  9998: {
    showWord: true,
    showTranslation: false,
    fullyLearned: false,
    hasAttempts: false,
    cooldownDirect: null,
    cooldownRevert: null,
    modeEducation: 0,
    modeEducationRevert: 0
  },
  
  // 1 балл + откат 20 часов: показываем таймер
  9997: {
    showWord: false,
    showTranslation: false,
    fullyLearned: false,
    hasAttempts: true,
    cooldownDirect: 15 * 60 * 60 * 1000, // 15 часов осталось
    cooldownRevert: null,
    modeEducation: 0,
    modeEducationRevert: 0
  },
  
  // Режим обучения: показываем "📚 Учу"
  9996: {
    showWord: false,
    showTranslation: false,
    fullyLearned: false,
    hasAttempts: true,
    cooldownDirect: null,
    cooldownRevert: null,
    modeEducation: 1,
    modeEducationRevert: 0
  },
  
  // Откат 30 минут: показываем таймер
  9995: {
    showWord: false,
    showTranslation: false,
    fullyLearned: false,
    hasAttempts: true,
    cooldownDirect: 20 * 60 * 1000, // 20 минут осталось
    cooldownRevert: null,
    modeEducation: 0,
    modeEducationRevert: 0
  },
  
  // Полностью изучено: показываем всё
  9994: {
    showWord: true,
    showTranslation: true,
    fullyLearned: true,
    hasAttempts: true,
    cooldownDirect: null,
    cooldownRevert: null,
    modeEducation: 0,
    modeEducationRevert: 0
  },
  
  // Частично изучено: слово изучено, перевод на откате
  9993: {
    showWord: true,
    showTranslation: false,
    fullyLearned: false,
    hasAttempts: true,
    cooldownDirect: null,
    cooldownRevert: 17 * 60 * 60 * 1000, // 17 часов осталось
    modeEducation: 0,
    modeEducationRevert: 0
  }
};

// Дополнительные тестовые слова для testWords
const additionalTestWords = [
  {
    id: 9996,
    word: "labdien",
    translation_1: "добрый день",
    translation_2: null,
    translation_3: null,
    category_ids: [121]
  },
  {
    id: 9995,
    word: "ardievu",
    translation_1: "до свидания",
    translation_2: "пока",
    translation_3: null,
    category_ids: [121]
  },
  {
    id: 9994,
    word: "jā",
    translation_1: "да",
    translation_2: null,
    translation_3: null,
    category_ids: [121]
  },
  {
    id: 9993,
    word: "nē",
    translation_1: "нет",
    translation_2: null,
    translation_3: null,
    category_ids: [121]
  }
];

// Экспорт для использования в других модулях
export { testWords, testUserData, testDisplayStatuses, additionalTestWords };

