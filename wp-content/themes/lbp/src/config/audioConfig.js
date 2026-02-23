// Конфигурация аудиофайлов
export const AUDIO_CONFIG = {
  // Поддерживаемые языки
  SUPPORTED_LANGUAGES: {
    LV: {
      code: "LV",
      name: "Латышский",
      folder: "lv",
      slugify: (word) => {
        return word
          .toLowerCase()
          .trim()
          .replace(/[\?!\.]+$/, "") // Убираем знаки препинания в конце
          .replace(/ā/g, "aa")
          .replace(/č/g, "ch")
          .replace(/ē/g, "ee")
          .replace(/ģ/g, "gj")
          .replace(/ī/g, "ii")
          .replace(/ķ/g, "kj")
          .replace(/ļ/g, "lj")
          .replace(/ņ/g, "nj")
          .replace(/š/g, "sh")
          .replace(/ū/g, "uu")
          .replace(/ž/g, "zh")
          .replace(/[^a-z0-9\s-]/g, "") // Убираем все символы кроме букв, цифр, пробелов и дефисов
          .replace(/\s+/g, "_") // Заменяем пробелы на подчеркивания
          .replace(/-+/g, "_"); // Заменяем дефисы на подчеркивания
      }
    },
    EN: {
      code: "EN", 
      name: "Английский",
      folder: "en",
      slugify: (word) => {
        return word
          .toLowerCase()
          .trim()
          .replace(/[\?!\.]+$/, "") // Убираем знаки препинания в конце
          .replace(/[^a-z0-9\s-]/g, "") // Убираем все символы кроме букв, цифр, пробелов и дефисов
          .replace(/\s+/g, "_") // Заменяем пробелы на подчеркивания
          .replace(/-+/g, "_"); // Заменяем дефисы на подчеркивания
      }
    }
    // Можно легко добавить новые языки:
    // DE: {
    //   code: "DE",
    //   name: "Немецкий", 
    //   folder: "de",
    //   slugify: (word) => { /* логика для немецкого */ }
    // }
  },
  
  // Базовый путь к аудиофайлам
  BASE_PATH: "/wp-content/themes/lbp/assets/audio/synthesis",
  
  // Язык по умолчанию
  DEFAULT_LANGUAGE: "LV",
  
  // Расширение аудиофайлов
  AUDIO_EXTENSION: ".mp3"
};

// Функция для получения конфигурации языка
export const getLanguageConfig = (langCode) => {
  return AUDIO_CONFIG.SUPPORTED_LANGUAGES[langCode] || AUDIO_CONFIG.SUPPORTED_LANGUAGES[AUDIO_CONFIG.DEFAULT_LANGUAGE];
};

// Функция для проверки поддержки языка
export const isLanguageSupported = (langCode) => {
  return langCode in AUDIO_CONFIG.SUPPORTED_LANGUAGES;
};

// Функция для получения списка поддерживаемых языков
export const getSupportedLanguages = () => {
  return Object.keys(AUDIO_CONFIG.SUPPORTED_LANGUAGES);
};

// Воспроизведение звука по слову (для тренировки). Вызывать из колбэка при смене слова в прямом режиме.
export const playWordAudio = (wordText, learnLang) => {
  try {
    const language = learnLang || AUDIO_CONFIG.DEFAULT_LANGUAGE;
    if (!isLanguageSupported(language)) return;
    const langConfig = getLanguageConfig(language);
    const fileName = langConfig.slugify(wordText) + AUDIO_CONFIG.AUDIO_EXTENSION;
    const audioPath = `${AUDIO_CONFIG.BASE_PATH}/${langConfig.folder}/audio/${fileName}`;
    const audio = new Audio(audioPath);
    audio.play().catch(() => {});
  } catch (e) {
    // ignore
  }
};
