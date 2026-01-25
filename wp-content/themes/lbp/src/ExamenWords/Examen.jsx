import axios from "axios";
import TrainingInterface from "../components/TrainingInterface";
import WordRow from "../components/WordRow";
import HelpModal from "../components/HelpModal";
import CategoryWordReorder from "../components/CategoryWordReorder";
import CategoryWordManagement from "../custom/components/CategoryWordManagement";
import { getCustomCategoryComponent } from "../custom/config/customComponents";
import { normalizeString, getCooldownTime, formatTime as formatTimeHelper, getWordDisplayStatusExamen, getTrainingAnswerMode, setTrainingAnswerMode } from "../custom/utils/helpers";
import { useAdminMode } from "../custom/contexts/AdminModeContext";

// Тестовые данные для отладки (закомментируйте следующую строку в production)
import { testWords, testUserData, testDisplayStatuses, additionalTestWords } from "./testData";
const ENABLE_TEST_DATA = true; // Установите false, чтобы отключить тестовые строки

const { useEffect, useState, useMemo } = wp.element;

const Examen = ({ categoryId, dictionaryId, userWordsData = {}, dictionaryWords = [], onRefreshUserData, onRefreshDictionaryWords }) => {
  const { isAdminModeActive } = useAdminMode();
  const [editingWordId, setEditingWordId] = useState(null); // ID текущего редактируемого слова
  const [trainingMode, setTrainingMode] = useState(false); // Режим тренировки
  const [currentWord, setCurrentWord] = useState(null); // Текущее слово для тренировки
  const [userAnswer, setUserAnswer] = useState(''); // Ответ пользователя
  const [showResult, setShowResult] = useState(false); // Показать результат
  const [isCorrect, setIsCorrect] = useState(false); // Правильный ли ответ
  const [currentMode, setCurrentMode] = useState(null); // Текущий режим (прямой/обратный)
  const [attemptCount, setAttemptCount] = useState(0); // Счетчик попыток для текущего слова
  const [currentTime, setCurrentTime] = useState(Date.now()); // Для обновления таймеров
  const [showHelp, setShowHelp] = useState(false); // Показать справку
  const [showReorder, setShowReorder] = useState(false); // Показать инструмент изменения порядка
  const [selectedWordIds, setSelectedWordIds] = useState([]); // Выбранные слова для массовых операций
  const [showBulkActions, setShowBulkActions] = useState(false); // Показать режим массовых операций
  const [isUpdating, setIsUpdating] = useState(false); // Идёт обновление данных на сервере
  const [trainingQueue, setTrainingQueue] = useState([]); // Очередь пар слов для тренировки
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0); // Текущая позиция в очереди
  const [trainingPhase, setTrainingPhase] = useState('direct'); // Фаза тренировки: 'direct', 'revert', 'alternating'
  const [selectionMode, setSelectionMode] = useState(false); // Режим выбора из предложенных (иначе ввод вручную)

  // Инициализация режима ответов из куки; на мобильных (≤768) по умолчанию «выбор», если нет куки
  useEffect(() => {
    const cached = getTrainingAnswerMode();
    if (cached) {
      setSelectionMode(cached === 'select');
      return;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const defaultMode = isMobile ? 'select' : 'type';
    setTrainingAnswerMode(defaultMode);
    setSelectionMode(defaultMode === 'select');
  }, []);

  // Синхронизация с переключателем в шапке (до #default-mobile-lang-controls)
  useEffect(() => {
    const onModeChange = () => {
      const cached = getTrainingAnswerMode();
      if (cached) setSelectionMode(cached === 'select');
    };
    window.addEventListener('training-answer-mode-changed', onModeChange);
    return () => window.removeEventListener('training-answer-mode-changed', onModeChange);
  }, []);

  // Получить статус изучения для умного отображения
  const getWordDisplayStatus = (wordId) => {
    return getWordDisplayStatusExamen(userWordsData[wordId], currentTime);
  };

  // Вспомогательная функция для перемешивания массива
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /**
   * Генерирует 6 вариантов ответа для режима выбора (1 правильный + 5 неправильных)
   * 
   * Алгоритм с модификацией гласных для латышского языка:
   * 1. Собираем 3 неправильных слова: сначала из текущей категории (приоритет невыученным),
   *    если не хватает - берём из всего словаря
   * 2. Добавляем правильный ответ → получаем 4 слова (1 правильный + 3 неправильных)
   * 3. Из этих 4 слов случайно выбираем 2 для модификации (может попасть правильный)
   * 4. Модифицируем гласные в выбранных 2 словах: короткие ↔ длинные (a↔ā, e↔ē, i↔ī, u↔ū)
   *    (модифицированный правильный становится неправильным вариантом)
   * 5. Формируем список: правильный (оригинал) + неправильные (обычные + модифицированные)
   * 6. Если в сумме нет 6 слов, ищем ещё слова во всём словаре и добавляем
   * 
   * @param {Object} word - Текущее слово для тренировки
   * @param {boolean} mode - Режим: false = прямой перевод (лат→рус), true = обратный (рус→лат)
   * @returns {Array<string>} Массив из 6 вариантов ответа (перемешанных)
   */
  const getChoiceOptions = (word, mode) => {
    // Функция для получения правильного ответа в зависимости от режима
    // mode = false (прямой): показываем слово, ждём перевод → берём translation_1
    // mode = true (обратный): показываем перевод, ждём слово → берём word
    const getAnswer = (w) => (mode ? w.word : (w.translation_1 || '')).trim();
    
    // Получаем правильный ответ для текущего слова
    const correct = getAnswer(word);
    if (!correct) return [correct]; // Если нет правильного ответа, возвращаем пустой массив

    // Функция для фильтрации слов по категории
    // Поддерживает как единичный category_id, так и массив category_ids
    const catFilter = (w) => {
      if (categoryId === 0) return true; // categoryId = 0 означает "все категории"
      const cid = parseInt(categoryId);
      // Проверяем единичный category_id
      if (w.category_id !== undefined) return parseInt(w.category_id) === cid;
      // Проверяем массив category_ids (если category_id нет)
      if (Array.isArray(w.category_ids) && w.category_ids.length > 0) {
        return w.category_ids.some(id => parseInt(id) === cid);
      }
      return false;
    };
    
    // Фильтруем слова текущей категории
    const categoryWords = dictionaryWords.filter(catFilter);
    
    // Множество уже использованных ответов (чтобы избежать дубликатов)
    const used = new Set([correct]);
    
    // Массив для сбора слов по старому алгоритму (нужно минимум 4, желательно 5)
    const baseWords = [];

    /**
     * Вспомогательная функция для добавления слов из списка (для базовой выборки)
     * @param {Array} list - Список слов для выбора вариантов
     * @param {boolean} preferUnlearned - Если true, приоритет отдаётся невыученным словам
     * @param {number} maxCount - Максимальное количество слов для сбора
     */
    const addFrom = (list, preferUnlearned = false, maxCount = 5) => {
      // Преобразуем список слов в объекты с информацией: само слово, его ответ, статус изучения
      const withStatus = list
        .filter(w => w.id !== word.id) // Исключаем текущее слово
        .map(w => ({ 
          w, // Само слово
          a: getAnswer(w), // Ответ для этого слова (в зависимости от режима)
          unlearned: !getWordDisplayStatus(w.id).fullyLearned // Статус: выучено ли слово
        }))
        .filter(x => x.a && !used.has(x.a)); // Оставляем только те, у которых есть ответ и он ещё не использован
      
      // Если нужно отдавать приоритет невыученным, сортируем: сначала невыученные
      if (preferUnlearned) {
        withStatus.sort((a, b) => (a.unlearned ? 0 : 1) - (b.unlearned ? 0 : 1));
      }
      
      // Добавляем варианты в массив baseWords
      for (const { a, w } of withStatus) {
        if (baseWords.length >= maxCount) break; // Уже собрали достаточно слов, выходим
        if (!used.has(a)) { 
          used.add(a); // Помечаем как использованный
          baseWords.push({ answer: a, word: w }); // Сохраняем и ответ, и само слово
        }
      }
    };

    // ШАГ 1: Собираем 3 неправильных слова
    // 1.1: Сначала берём слова из текущей категории (приоритет невыученным)
    addFrom(categoryWords, true, 3);
    
    // 1.2: Если не хватает, берём любые слова из всего словаря (без поиска похожих)
    if (baseWords.length < 3) {
      addFrom(dictionaryWords, false, 3);
    }

    // Если не удалось собрать минимум 3 неправильных слова, возвращаем то, что есть (старый алгоритм)
    if (baseWords.length < 3) {
      const wrong = baseWords.map(item => item.answer);
      return shuffleArray([correct, ...wrong]);
    }

    /**
     * Функция для модификации гласных в слове (короткие ↔ длинные)
     * @param {string} text - Исходное слово
     * @returns {string} Слово с изменённой гласной (или исходное, если не удалось изменить)
     */
    const modifyVowel = (text) => {
      // Маппинг гласных: короткие ↔ длинные
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
      
      // Находим все позиции гласных, которые можно изменить
      const vowelPositions = [];
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (vowelMap[char]) {
          vowelPositions.push(i);
        }
      }
      
      // Если нет гласных для изменения, возвращаем исходное слово
      if (vowelPositions.length === 0) {
        return text;
      }
      
      // Случайно выбираем одну позицию для изменения
      const randomIndex = Math.floor(Math.random() * vowelPositions.length);
      const pos = vowelPositions[randomIndex];
      const char = text[pos];
      
      // Заменяем гласную на противоположную (короткая ↔ длинная)
      const modified = text.substring(0, pos) + vowelMap[char] + text.substring(pos + 1);
      return modified;
    };

    // ШАГ 2: Формируем массив из 4 слов: 1 правильный + 3 неправильных
    const allFour = [
      { answer: correct, isCorrect: true }, // Правильный ответ
      ...baseWords.map(item => ({ answer: item.answer, isCorrect: false })) // 3 неправильных
    ];

    // ШАГ 3: Из этих 4 слов случайно выбираем 2 для модификации (может попасть правильный, может нет)
    const shuffledFour = shuffleArray([...allFour]);
    const toModify = shuffledFour.slice(0, 2); // Берём первые 2 слова для модификации
    const toKeep = shuffledFour.slice(2); // Остальные 2 слова оставляем без изменений

    // ШАГ 4: Модифицируем гласные в выбранных 2 словах
    const modified = toModify.map(item => ({
      answer: modifyVowel(item.answer),
      isCorrect: false // Модифицированный вариант всегда неправильный (даже если был правильным)
    }));

    // ШАГ 5: Формируем финальный список вариантов
    // Правильный ответ всегда остаётся правильным (оригинал)
    // Все остальные варианты (обычные неправильные + модифицированные) = неправильные
    
    // Определяем, попал ли правильный ответ в модификацию
    const correctWasModified = toModify.some(item => item.isCorrect);
    
    // Формируем список неправильных вариантов
    const wrong = [];
    
    // Добавляем обычные неправильные (которые не модифицировали и не являются правильным)
    toKeep.forEach(item => {
      if (!item.isCorrect) {
        wrong.push(item.answer);
      }
    });
    
    // Добавляем модифицированные варианты (все они неправильные, даже если один был правильным)
    modified.forEach(item => {
      wrong.push(item.answer);
    });
    
    // ШАГ 6: Если в сумме нет 6 слов (1 правильный + 5 неправильных), ищем ещё во всём словаре
    if (wrong.length < 5) {
      const needed = 5 - wrong.length;
      // Ищем ещё слова во всём словаре (без приоритета похожих)
      addFrom(dictionaryWords, false, baseWords.length + needed);
      // Добавляем дополнительные слова (начиная с 4-го, так как первые 3 уже использованы)
      const additional = baseWords.slice(3, 3 + needed).map(item => item.answer);
      wrong.push(...additional);
    }

    // Возвращаем перемешанный массив: правильный ответ + 5 неправильных (итого 6 вариантов)
    return shuffleArray([correct, ...wrong.slice(0, 5)]);
  };

  // Варианты выбора — только при смене слова или режима, иначе порядок «прыгает» при каждом ререндере
  const choiceOptions = useMemo(() => {
    if (!currentWord || !selectionMode) return [];
    return getChoiceOptions(currentWord, currentMode);
  }, [currentWord?.id, currentMode, selectionMode]);

  // Логируем ID для настройки кастомных компонентов
  useEffect(() => {
    // ID для настройки кастомных компонентов
  }, [dictionaryId, categoryId]);

  // Сбрасываем выбранные слова и режим выбора при смене категории
  useEffect(() => {
    setSelectedWordIds([]);
    setShowBulkActions(false);
  }, [categoryId]);

  // Обновляем текущее время каждую секунду для таймеров
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleEdit = (id) => {
    setEditingWordId((prevId) => (prevId === id ? null : id));
  };

  // Удалить слово
  const handleDeleteWord = async (wordId) => {
    try {
      const formData = new FormData();
      formData.append('action', 'delete_word');
      formData.append('word_id', wordId);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        // Обновляем список слов
        if (onRefreshDictionaryWords) {
          onRefreshDictionaryWords();
        }
      } else {
        alert('Ошибка: ' + (response.data.message || 'Не удалось удалить слово'));
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    }
  };

  // Форматировать время (используем функцию из helpers)
  const formatTime = formatTimeHelper;

  // Проверить, изучено ли слово (correct_attempts >= 2 ИЛИ correct_attempts_revert >= 2)
  const isWordLearned = (wordId) => {
    const userData = userWordsData[wordId];
    if (!userData) return false;
    
    // Показываем слово, если правильно ответили >= 2 раз хотя бы в одном направлении
    return userData.correct_attempts >= 2 || userData.correct_attempts_revert >= 2;
  };

  // Получить слова для тренировки (те, которые еще не изучены полностью и откат закончен)
  const getTrainingWords = () => {
    const categoryWords = dictionaryWords.filter(word => {
      if (categoryId === 0) return true;
      const categoryIdNum = parseInt(categoryId);
      
      // Поддержка как массива category_ids, так и единичного category_id
      // Сначала проверяем единичный category_id
      if (word.category_id !== undefined) {
        return parseInt(word.category_id) === categoryIdNum;
      }
      // Потом проверяем массив category_ids (только если category_id нет)
      if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
        return word.category_ids.some(id => parseInt(id) === categoryIdNum);
      }
      return false;
    });

    const trainingWords = categoryWords.filter(word => {
      const displayStatus = getWordDisplayStatus(word.id);
      // Включаем в тренировку только слова без активного отката и не полностью изученные
      return !displayStatus.fullyLearned && (!displayStatus.cooldownDirect || !displayStatus.cooldownRevert);
    });

    return trainingWords;
  };

  // Формирование очереди тренировки: сначала прямые, потом обратные, потом по кругу
  const buildTrainingQueue = () => {
    const trainingWords = getTrainingWords();
    if (trainingWords.length === 0) {
      return [];
    }

    // Разделяем слова на группы: прямые и обратные переводы
    const directWords = []; // Прямые переводы (лат→рус)
    const revertWords = []; // Обратные переводы (рус→лат)

    trainingWords.forEach(word => {
      const userData = userWordsData[word.id];
      
      if (!userData) {
        // Если нет данных, добавляем в прямые
        directWords.push({ word, mode: false });
      } else {
        const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education, currentTime);
        const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert, currentTime);

        if (directAvailable) {
          directWords.push({ word, mode: false });
        }
        if (revertAvailable) {
          revertWords.push({ word, mode: true });
        }
      }
    });

    // Перемешиваем каждую группу
    const shuffle = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const shuffledDirect = shuffle(directWords);
    const shuffledRevert = shuffle(revertWords);

    // Формируем финальную очередь: сначала все прямые, потом все обратные, потом по кругу (1→2→1→2...)
    const queue = [];
    
    // Фаза 1: все прямые переводы
    shuffledDirect.forEach(item => {
      queue.push({ ...item, phase: 'direct' });
    });
    
    // Фаза 2: все обратные переводы
    shuffledRevert.forEach(item => {
      queue.push({ ...item, phase: 'revert' });
    });

    // Далее по кругу: снова прямые, потом обратные, и так далее
    // Для этого создаем цикл, который повторяет фазы 1 и 2 несколько раз
    // Но так как слова могут стать недоступными, лучше формировать очередь динамически
    // Поэтому здесь мы формируем только первые две фазы, а дальше будем пересчитывать

    return queue;
  };

  // Начать тренировку
  const startTraining = async () => {
    // Проверяем авторизацию
    if (!window.myajax || !window.myajax.is_logged_in) {
      alert('Для тренировки необходимо войти в систему');
      return;
    }
    
    // Проверяем есть ли слова в категории без записей в БД ИЛИ со сброшенными записями
    const categoryWords = dictionaryWords.filter(word => {
      if (categoryId === 0) return true;
      const categoryIdNum = parseInt(categoryId);
      // Поддержка как массива category_ids, так и единичного category_id
      // Сначала проверяем единичный category_id
      if (word.category_id !== undefined) {
        return parseInt(word.category_id) === categoryIdNum;
      }
      // Потом проверяем массив category_ids (только если category_id нет)
      if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
        return word.category_ids.some(id => parseInt(id) === categoryIdNum);
      }
      return false;
    });
    
    // Слова без записей ИЛИ со сброшенными записями
    const wordsToInitialize = categoryWords.filter(word => {
      const userData = userWordsData[word.id];
      
      if (!userData) {
        // Нет записи в БД
        return true;
      }
      
      // Проверяем, является ли запись "сброшенной":
      // attempts = 0 И attempts_revert = 0 И correct_attempts = 0 И correct_attempts_revert = 0
      // И last_shown = null/пустая строка/'0000-00-00 00:00:00' (только после полного сброса)
      const isResetState = (
        userData.mode_education === 0 &&
        userData.mode_education_revert === 0 &&
        userData.attempts === 0 && 
        userData.attempts_revert === 0 && 
        userData.correct_attempts === 0 && 
        userData.correct_attempts_revert === 0 &&
        (userData.last_shown === null || userData.last_shown === '' || userData.last_shown === '0000-00-00 00:00:00') &&
        (userData.last_shown_revert === null || userData.last_shown_revert === '' || userData.last_shown_revert === '0000-00-00 00:00:00')
      );
      
      return isResetState;
    });
    
    if (wordsToInitialize.length > 0) {
      try {
        const wordIds = wordsToInitialize.map(w => w.id);
        
        const formData = new FormData();
        formData.append('action', 'create_easy_mode_for_new_words');
        formData.append('word_ids', JSON.stringify(wordIds));
        
        const response = await axios.post(window.myajax.url, formData);
        
        if (response.data.success) {
          // Обновляем данные пользователя
          if (onRefreshUserData) {
            await onRefreshUserData();
          }
        }
      } catch (err) {
        console.error('❌ Ошибка при создании записей:', err);
        console.error('❌ Детали ошибки:', err.response?.data || err.message);
      }
    }
    
    // Формируем очередь тренировки
    const queue = buildTrainingQueue();
    
    if (queue.length === 0) {
      alert('Нет доступных слов для тренировки! Все слова либо изучены, либо на откате.');
      return;
    }
    
    setTrainingQueue(queue);
    setCurrentQueueIndex(0);
    setTrainingPhase('direct');
    setTrainingMode(true);
    
    // Устанавливаем первое слово из очереди
    const firstItem = queue[0];
    setCurrentWord(firstItem.word);
    setCurrentMode(firstItem.mode);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
  };

  // Обновить попытки слова на сервере
  const updateWordAttempts = async (wordId, isRevertMode, isCorrect) => {
    try {
      const userData = userWordsData[currentWord?.id];
      let me = isRevertMode ? userData?.mode_education_revert : userData?.mode_education;

			const formData = new FormData();
      formData.append("action", "update_word_attempts");
      formData.append("word_id", wordId);
      formData.append("is_revert", isRevertMode ? 1 : 0);
      formData.append("is_correct", isCorrect ? 1 : 0);
      formData.append("is_first_attempt", me ? 0 : 1); // Первая попытка если attemptCount = 0

			const response = await axios.post(window.myajax.url, formData);

			if (response.data.success) {
        // Обновляем локальные данные пользователя и ждём завершения
        if (onRefreshUserData) {
          await onRefreshUserData();
        }
			} else {
        console.error('Ошибка при записи попытки:', response.data.message);
			}
		} catch (err) {
      console.error('Ошибка при отправке попытки:', err.message);
    }
  };


  // Сбросить категорию из тренировки (аналог Education.jsx)
  const resetCategoryFromTraining = async () => {
    if (!confirm('Вы уверены, что хотите сбросить эту категорию из тренировки? Все слова будут отключены от тренировки.')) {
      return;
    }

    try {
      // Получаем все слова текущей категории
      const categoryWords = dictionaryWords.filter(word => {
        if (categoryId === 0) return true;
        const categoryIdNum = parseInt(categoryId);
        
        if (word.category_id !== undefined) {
          return parseInt(word.category_id) === categoryIdNum;
        }
        if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
          return word.category_ids.some(id => parseInt(id) === categoryIdNum);
        }
        return false;
      });

      const wordIds = categoryWords.map(word => word.id);
      
      if (wordIds.length === 0) {
        alert('В категории нет слов для сброса');
        return;
      }

      const formData = new FormData();
      formData.append("action", "reset_training_category");
      formData.append("word_ids", JSON.stringify(wordIds));

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        alert('Данные категории сброшены! Все тренировочные данные обнулены.');
        if (onRefreshUserData) {
          onRefreshUserData();
        }
      } else {
        throw new Error(response.data.message || "Ошибка при сбросе категории");
      }
    } catch (err) {
      console.error('Ошибка при сбросе категории:', err);
      alert('Ошибка: ' + err.message);
    }
  };

  // Функция для генерации вариантов ответа с учётом скобок
  const generateAnswerVariants = (text) => {
    if (!text) return [];
    
    const variants = [];
    
    // Вариант 1: Текст БЕЗ содержимого скобок (основной вариант)
    // Например: "ручка (дверная)" -> "ручка"
    const textWithoutParentheses = text.replace(/\([^)]*\)/g, '').trim();
    if (textWithoutParentheses) variants.push(textWithoutParentheses);
    
    // Вариант 2: Весь текст, но БЕЗ самих скобок (с содержимым)
    // Например: "ручка (дверная)" -> "ручка дверная"
    const fullTextWithoutBrackets = text.replace(/[()]/g, '').trim();
    if (fullTextWithoutBrackets && fullTextWithoutBrackets !== textWithoutParentheses) {
      variants.push(fullTextWithoutBrackets);
    }
    
    return variants;
  };

  // Обработчики для TrainingInterface. overrideAnswer — при выборе из вариантов (режим «выбор»)
  const handleCheckAnswer = async (overrideAnswer) => {
    const toCheck = (overrideAnswer != null && String(overrideAnswer).trim()) ? String(overrideAnswer).trim() : userAnswer.trim();
    if (!currentWord || !toCheck || isUpdating) return;

    let correct = false;
    let correctAnswers = [];

    if (currentMode) {
      // Обратный перевод: показываем перевод, ждем слово (правильный ответ - само слово)
      correctAnswers = [currentWord.word];
    } else {
      // Прямой перевод: показываем слово, ждем перевод (правильные ответы - переводы)
      correctAnswers = [
        currentWord.translation_1,
        currentWord.translation_2,
        currentWord.translation_3
      ].filter(t => t && t !== '0');
      
      // Добавляем дополнительные варианты из translation_input_variable
      if (currentWord.translation_input_variable && currentWord.translation_input_variable.trim()) {
        const additionalVariants = currentWord.translation_input_variable
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0);
        correctAnswers.push(...additionalVariants);
      }
    }
    
    // Генерируем все возможные варианты для каждого правильного ответа
    const allAcceptableVariants = [];
    correctAnswers.forEach(answer => {
      const variants = generateAnswerVariants(answer);
      allAcceptableVariants.push(...variants);
    });

    const normalizedUserAnswer = normalizeString(toCheck);
    
    correct = allAcceptableVariants.some(answer => {
      const normalizedAnswer = normalizeString(answer);
      return normalizedAnswer === normalizedUserAnswer;
    });

    setIsCorrect(correct);
    
    // Блокируем кнопку и показываем лоадер
    setIsUpdating(true);

    try {
      // Обновляем прогресс в базе данных и ждём завершения
      await updateWordAttempts(currentWord.id, currentMode, correct);
      
      // Увеличиваем счетчик попыток
      setAttemptCount(prev => prev + 1);
      
      // Показываем результат только после успешного обновления
      setShowResult(true);

      // Устанавливаем фокус на кнопку "Следующее слово" после показа результата
      setTimeout(() => {
        const nextButton = document.querySelector('[data-next-word]');
        if (nextButton) {
          nextButton.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Проверка доступности слова для тренировки в указанном режиме
  const isWordAvailableForMode = (word, mode) => {
    const userData = userWordsData[word.id];
    
    if (!userData) {
      // Если нет данных, доступен только прямой перевод
      return !mode;
    }
    
    if (mode) {
      // Обратный перевод
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert, currentTime);
      return revertAvailable;
    } else {
      // Прямой перевод
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education, currentTime);
      return directAvailable;
    }
  };

  const handleNextWord = () => {
    // Сбрасываем состояние обновления при переходе к следующему слову
    setIsUpdating(false);
    
    // Ищем следующее доступное слово в очереди
    let nextIndex = currentQueueIndex + 1;
    let found = false;
    let attempts = 0;
    const maxAttempts = trainingQueue.length; // Защита от бесконечного цикла
    
    while (nextIndex < trainingQueue.length && attempts < maxAttempts) {
      const nextItem = trainingQueue[nextIndex];
      
      // Проверяем, доступно ли слово для тренировки в этом режиме
      if (isWordAvailableForMode(nextItem.word, nextItem.mode)) {
        setCurrentQueueIndex(nextIndex);
        setCurrentWord(nextItem.word);
        setCurrentMode(nextItem.mode);
        setTrainingPhase(nextItem.phase || 'direct');
        setUserAnswer('');
        setShowResult(false);
        setAttemptCount(0);
        found = true;
        break;
      }
      
      nextIndex++;
      attempts++;
    }
    
    // Если не нашли доступное слово в текущей очереди, формируем новую очередь (следующий цикл)
    if (!found) {
      const remainingWords = getTrainingWords();
      if (remainingWords.length === 0) {
        setTrainingMode(false);
        setTrainingQueue([]);
        setCurrentQueueIndex(0);
        alert('Отлично! Все доступные слова тренированы!');
        return;
      } else {
        // Есть еще слова, формируем новую очередь (следующий цикл: прямые → обратные)
        // Определяем, какая была последняя фаза, чтобы начать с противоположной
        const lastPhase = trainingPhase;
        const newQueue = buildTrainingQueue();
        
        if (newQueue.length === 0) {
          setTrainingMode(false);
          setTrainingQueue([]);
          setCurrentQueueIndex(0);
          alert('Отлично! Все доступные слова тренированы!');
          return;
        }
        
        // Если последняя фаза была 'revert', начинаем новый цикл с 'direct' (и наоборот)
        // Но так как buildTrainingQueue всегда формирует сначала direct, потом revert,
        // нам нужно просто использовать новую очередь, которая уже правильно сформирована
        setTrainingQueue(newQueue);
        setCurrentQueueIndex(0);
        const firstItem = newQueue[0];
        setCurrentWord(firstItem.word);
        setCurrentMode(firstItem.mode);
        setTrainingPhase(firstItem.phase || 'direct');
        setUserAnswer('');
        setShowResult(false);
        setAttemptCount(0);
        
        // Возвращаем фокус: поле ввода или первая кнопка выбора (режим «выбор»)
        setTimeout(() => {
          const inputField = document.querySelector('[data-training-input]');
          if (inputField) inputField.focus();
          else {
            const firstChoice = document.querySelector('.training-choice-btn');
            if (firstChoice) firstChoice.focus();
          }
        }, 100);
        return;
      }
    }

    setTimeout(() => {
      const inputField = document.querySelector('[data-training-input]');
      if (inputField) inputField.focus();
      else {
        const firstChoice = document.querySelector('.training-choice-btn');
        if (firstChoice) firstChoice.focus();
      }
    }, 100);
  };

  const handleFinishTraining = () => {
    setTrainingMode(false);
    setTrainingQueue([]);
    setCurrentQueueIndex(0);
    setTrainingPhase('direct');
    setCurrentWord(null);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
  };

  // Лёгкая тренировка - установить mode_education = 1 для всех слов
  const handleEasyTraining = async () => {
    if (!categoryId || categoryId === 0) {
      alert('Выберите категорию');
      return;
    }

    if (!confirm('Перевести все слова категории в режим лёгкой тренировки? Откат будет 30 минут вместо 20 часов.')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('action', 'set_category_to_easy_mode');
      formData.append('category_id', categoryId);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        // Обновляем данные пользователя
        if (onRefreshUserData) {
          await onRefreshUserData();
        }
        alert('Все слова категории переведены в режим лёгкой тренировки!');
      } else {
        alert('Ошибка: ' + (response.data.message || 'Не удалось перевести категорию'));
      }
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Ошибка сети: ' + err.message);
    }
  };

	return (
		<div>
      {!trainingMode && (
        <div className="training-buttons-container">
          <button
            onClick={startTraining}
            className="training-start-button"
          >
            🎯 Начать тренировку
          </button>

          <button
            onClick={handleEasyTraining}
            className="training-start-button"
            style={{
              backgroundColor: '#4CAF50',
            }}
            title="Откат 30 минут вместо 20 часов для всех слов категории"
          >
            😊 Лёгкая тренировка
          </button>
          
          <div className="training-control-buttons">
            <button
              onClick={() => setShowHelp(true)}
              className="training-help-button"
              title="Показать справку"
            >
              ❓ Справка
            </button>
            
            {isAdminModeActive && (
              <button
                onClick={() => {
                  setShowReorder(true);
                }}
                className="training-reorder-button"
                title="Изменить порядок слов в категории"
              >
                🔄 Порядок слов
              </button>
            )}
            
            <button
              onClick={() => {
                resetCategoryFromTraining();
              }}
              className="training-clear-button"
            >
              🚫 Сбросить
            </button>
          </div>
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {trainingMode && (
        <TrainingInterface
          currentWord={currentWord}
          currentMode={currentMode}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          showResult={showResult}
          isCorrect={isCorrect}
          onCheckAnswer={handleCheckAnswer}
          onNextWord={handleNextWord}
          onFinishTraining={handleFinishTraining}
          isUpdating={isUpdating}
          selectionMode={selectionMode}
          choiceOptions={choiceOptions}
          inEducationMode={(() => {
            const userData = userWordsData[currentWord?.id];
            return currentMode ? userData?.mode_education_revert : userData?.mode_education;
          })()}
        />
      )}

      {!trainingMode && (() => {
        // Фильтруем слова по категории из dictionaryWords
        const categoryWords = dictionaryWords.filter(word => {
          if (categoryId === 0) return true;
          const categoryIdNum = parseInt(categoryId);
          
          // Поддержка как массива category_ids, так и единичного category_id
          // Сначала проверяем единичный category_id
          if (word.category_id !== undefined) {
            return parseInt(word.category_id) === categoryIdNum;
          }
          // Потом проверяем массив category_ids (только если category_id нет)
          if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
            return word.category_ids.some(id => parseInt(id) === categoryIdNum);
          }
          return false;
        });

        // Блок массовых операций теперь отображается через CategoryWordManagement

        // Создаём объект для быстрого доступа по ID
        const dictionaryWordsById = {};
        dictionaryWords.forEach(word => {
          dictionaryWordsById[word.id] = word;
        });

        // Проверяем, есть ли кастомный компонент для категории
        const CustomCategoryComponent = getCustomCategoryComponent(dictionaryId, categoryId);
        
        if (CustomCategoryComponent) {
          // Получаем статусы для кастомного компонента (он может использовать displayStatuses для группировки)
          const displayStatuses = {};
          categoryWords.forEach(word => {
            displayStatuses[word.id] = getWordDisplayStatus(word.id);
          });
          
          // Рендерим кастомный компонент категории
          return (
            <CustomCategoryComponent
              category={{ id: categoryId, category_name: 'Категория ' + categoryId }}
              categoryId={categoryId}
              words={categoryWords}
              dictionaryId={dictionaryId}
              dictionaryWords={dictionaryWords}
              dictionaryWordsById={dictionaryWordsById}
              userWordsData={userWordsData}
              displayStatuses={displayStatuses}
              editingWordId={editingWordId}
              onToggleEdit={toggleEdit}
              onRefreshDictionaryWords={onRefreshDictionaryWords}
              onRefreshUserData={onRefreshUserData}
              formatTime={formatTime}
              mode="examen"
              currentTime={currentTime}
            />
          );
        }

        // Стандартный список слов
        const realWords = categoryWords.map((word) => {
          const displayStatus = getWordDisplayStatus(word.id);
          const userData = userWordsData[word.id];
          const isSelected = selectedWordIds.includes(word.id);
          const showCheckbox = showBulkActions && isAdminModeActive;
          
            return (
              <WordRow
                key={word.id}
                word={word}
                userData={userData}
                displayStatus={displayStatus}
                formatTime={formatTime}
                dictionaryId={dictionaryId}
                editingWordId={editingWordId}
                onToggleEdit={toggleEdit}
                onRefreshDictionaryWords={onRefreshDictionaryWords}
                onDeleteWord={handleDeleteWord}
                mode="examen"
                showCheckbox={showCheckbox}
                isSelected={isSelected}
                onToggleSelect={() => {
                  setSelectedWordIds(prev => {
                    if (prev.includes(word.id)) {
                      return prev.filter(id => id !== word.id);
                    } else {
                      return [...prev, word.id];
                    }
                  });
                }}
              />
            );
        });

        // Блок управления словами теперь отображается через CategoryWordManagement
        // в CategoryLayout для кастомных категорий и здесь для обычных

        // Тестовые строки для отладки (можно удалить в production)
        if (ENABLE_TEST_DATA && isAdminModeActive) {
          const separator = (
            <li key="test-separator" style={{ 
              margin: '20px 0', 
              padding: '10px', 
              background: '#f0f0f0', 
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#666',
              borderTop: '2px dashed #999',
              borderBottom: '2px dashed #999'
            }}>
              ⬇️ ТЕСТОВЫЕ ДАННЫЕ ДЛЯ ОТЛАДКИ (ТОЛЬКО ДЛЯ АДМИНОВ) ⬇️
            </li>
          );
          
          const allTestWords = [...testWords, ...additionalTestWords];
          const testRows = allTestWords.map((word) => {
            const displayStatus = testDisplayStatuses[word.id];
            const userData = testUserData[word.id];
            
            return (
              <WordRow
                key={`test-${word.id}`}
                word={word}
                userData={userData}
                displayStatus={displayStatus}
                formatTime={formatTime}
                dictionaryId={dictionaryId}
                editingWordId={editingWordId}
                onToggleEdit={toggleEdit}
                onRefreshDictionaryWords={onRefreshDictionaryWords}
                mode="examen"
              />
            );
          });
          
          return (
            <>
              <ul className="words-education-list">
                {[...realWords, separator, ...testRows].filter(Boolean)}
              </ul>
              {/* Управление словами - отображается во всех категориях */}
              <CategoryWordManagement
                dictionaryId={dictionaryId}
                categoryId={categoryId}
                categoryWords={categoryWords}
                onWordsChanged={onRefreshDictionaryWords}
                externalShowBulkActions={showBulkActions}
                externalSelectedWordIds={selectedWordIds}
                onBulkActionsToggle={setShowBulkActions}
                onSelectedWordsChange={setSelectedWordIds}
              />
            </>
          );
        }

        return (
          <>
            <ul className="words-education-list">
              {realWords}
            </ul>
            {/* Управление словами - отображается во всех категориях */}
            <CategoryWordManagement
              dictionaryId={dictionaryId}
              categoryId={categoryId}
              categoryWords={categoryWords}
              onWordsChanged={onRefreshDictionaryWords}
              externalShowBulkActions={showBulkActions}
              externalSelectedWordIds={selectedWordIds}
              onBulkActionsToggle={setShowBulkActions}
              onSelectedWordsChange={setSelectedWordIds}
            />
          </>
        );
      })()}
      
      {/* Модальное окно изменения порядка слов */}
      {showReorder && (() => {
        // Получаем слова текущей категории
        const categoryWords = dictionaryWords.filter(word => {
          if (categoryId === 0) return true;
          const categoryIdNum = parseInt(categoryId);
          
          if (word.category_id !== undefined) {
            return parseInt(word.category_id) === categoryIdNum;
          }
          if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
            return word.category_ids.some(id => parseInt(id) === categoryIdNum);
          }
          return false;
        });
        
        return (
          <CategoryWordReorder
            categoryId={categoryId}
            words={categoryWords}
            onClose={() => {
              setShowReorder(false);
            }}
            onReorderComplete={() => {
              setShowReorder(false);
              if (onRefreshDictionaryWords) {
                onRefreshDictionaryWords();
              }
            }}
          />
        );
      })()}
      
      {/* Модальное окно справки */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
		</div>
	);
};

export default Examen;
