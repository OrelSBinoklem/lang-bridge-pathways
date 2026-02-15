import axios from "axios";
import TrainingInterface from "../components/TrainingInterface";
import WordRow from "../components/WordRow";
import ExamenErrorBoundary from "../components/ExamenErrorBoundary";
import HelpModal from "../components/HelpModal";
import CategoryWordReorder from "../components/CategoryWordReorder";
import CategoryWordManagement from "../custom/components/CategoryWordManagement";
import { getCustomCategoryComponent } from "../custom/config/customComponents";
import { normalizeString, stripParenthesesAndPunctuation, getCooldownTime, formatTime as formatTimeHelper, getWordDisplayStatusExamen, getTrainingAnswerMode, setTrainingAnswerMode } from "../custom/utils/helpers";
import { generateChoiceOptions } from "../custom/utils/choiceOptionsGenerator";
import { useAdminMode } from "../custom/contexts/AdminModeContext";

const { useEffect, useState, useMemo, useRef } = wp.element;

// Найти прямых потомков категории (3-й уровень) в дереве категорий
const getDirectChildCategories = (tree, parentId) => {
  if (!tree || !Array.isArray(tree)) return [];
  const pid = parseInt(parentId, 10);
  for (const node of tree) {
    if (parseInt(node.id, 10) === pid) return Array.isArray(node.children) ? node.children : [];
    if (Array.isArray(node.children) && node.children.length > 0) {
      const sub = getDirectChildCategories(node.children, parentId);
      if (sub.length > 0) return sub;
    }
  }
  return [];
};

// Принадлежность слова категории. Бэкенд отдаёт category_ids (массив); category_id может быть не задан.
const wordBelongsToCategoryId = (word, catIdNum) => {
  const cid = parseInt(catIdNum, 10);
  if (Number.isNaN(cid)) return false;
  if (word.category_id != null && word.category_id !== '') {
    if (parseInt(word.category_id, 10) === cid) return true;
  }
  if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
    return word.category_ids.some(id => parseInt(id, 10) === cid);
  }
  return false;
};

// Слово входит хотя бы в одну из категорий (для категории 2 уровня + все подкатегории 3 уровня)
const wordBelongsToAnyOfCategories = (word, categoryIds) => {
  return categoryIds.some(id => wordBelongsToCategoryId(word, parseInt(id, 10)));
};

const Examen = ({ categoryId, dictionaryId, dictionary = null, categories = [], userWordsData = {}, dictionaryWords = [], onRefreshUserData, onRefreshDictionaryWords }) => {
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
  const [trainingScopeIds, setTrainingScopeIds] = useState(null); // Область тренировки: null = вся категория, иначе [id подкатегории]
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

  // Генерация вариантов ответов вынесена в отдельный модуль
  const getChoiceOptions = (word, mode) => {
    return generateChoiceOptions({
      word,
      mode,
      categoryId,
      dictionaryWords,
      getWordDisplayStatus,
      shuffleArray,
      learnLang: dictionary?.learn_lang ?? word?.learn_lang
    });
  };

  // Варианты выбора — только при смене слова, режима или языка словаря
  const choiceOptions = useMemo(() => {
    if (!currentWord || !selectionMode) return [];
    return getChoiceOptions(currentWord, currentMode);
  }, [currentWord?.id, currentMode, selectionMode, dictionary?.learn_lang]);

  // Подкатегории 3 уровня для текущей категории 2 уровня; ID категорий для «вся категория» (2 + все 3)
  const subcategories = useMemo(() => getDirectChildCategories(categories, categoryId), [categories, categoryId]);
  const allCategoryIds = useMemo(() => {
    const id = parseInt(categoryId, 10);
    if (!categoryId || categoryId === 0) return [];
    return [id, ...subcategories.map(c => parseInt(c.id, 10))];
  }, [categoryId, subcategories]);

  // Логируем ID для настройки кастомных компонентов
  useEffect(() => {
    // ID для настройки кастомных компонентов
  }, [dictionaryId, categoryId]);

  // Сбрасываем выбранные слова и режим выбора при смене категории
  useEffect(() => {
    setSelectedWordIds([]);
    setShowBulkActions(false);
  }, [categoryId]);

  // Обновляем currentTime: интервал для таймера + при возврате на вкладку
  const refreshCurrentTime = () => setCurrentTime(Date.now());
  useEffect(() => {
    const onVisible = () => refreshCurrentTime();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeout(refreshCurrentTime, 0);
    }, 10000); // раз в 10 сек (фиксы в WordRow должны предотвратить removeChild)
    return () => clearInterval(interval);
  }, []);

  const toggleEdit = (id) => {
    setEditingWordId((prevId) => (prevId === id ? null : id));
  };

  // Удалить слово (из категории или полностью, если categoryId передан — только из категории)
  const handleDeleteWord = async (wordId, categoryIdForDelete = null) => {
    try {
      const formData = new FormData();
      formData.append('action', 'delete_word');
      formData.append('word_id', wordId);
      if (categoryIdForDelete != null) {
        formData.append('category_id', categoryIdForDelete);
      }

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
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

  // Получить слова для тренировки. scopeCategoryIds = [categoryId, ...subs] или [subId].
  // Для главной кнопки: сначала слова из корня категории 2 уровня, затем из подкатегорий. Для подкатегории — только её слова.
  const getTrainingWords = (scopeCategoryIds = null) => {
    const ids = scopeCategoryIds != null ? scopeCategoryIds : allCategoryIds;
    const seen = new Set();
    const list = [];
    const catIdNum = parseInt(categoryId, 10);
    const isSubcategoryOnly = ids.length === 1 && parseInt(ids[0], 10) !== catIdNum;

    if (ids.length === 0) {
      if (categoryId === 0) list.push(...dictionaryWords);
    } else if (isSubcategoryOnly) {
      const subNum = parseInt(ids[0], 10);
      dictionaryWords.forEach(w => {
        if (wordBelongsToCategoryId(w, subNum)) list.push(w);
      });
    } else {
      // Главная кнопка: 1) слова из корня категории 2 уровня, 2) слова из подкатегорий
      if (!Number.isNaN(catIdNum) && categoryId !== 0) {
        dictionaryWords.forEach(w => {
          if (wordBelongsToCategoryId(w, catIdNum) && !seen.has(w.id)) {
            seen.add(w.id);
            list.push(w);
          }
        });
      }
      ids.forEach(catId => {
        const num = parseInt(catId, 10);
        if (Number.isNaN(num) || num === catIdNum) return;
        dictionaryWords.forEach(w => {
          if (wordBelongsToCategoryId(w, num) && !seen.has(w.id)) {
            seen.add(w.id);
            list.push(w);
          }
        });
      });
    }

    const categoryWords = list;
    const trainingWords = categoryWords.filter(word => {
      const displayStatus = getWordDisplayStatus(word.id);
      return !displayStatus.fullyLearned && (!displayStatus.cooldownDirect || !displayStatus.cooldownRevert);
    });
    return trainingWords;
  };

  // Формирование очереди тренировки. scopeCategoryIds — вся категория (allCategoryIds) или одна подкатегория
  const buildTrainingQueue = (scopeCategoryIds = null) => {
    const trainingWords = getTrainingWords(scopeCategoryIds);
    if (trainingWords.length === 0) {
      return [];
    }

    // Разделяем слова на группы: прямые и обратные переводы
    const directWords = []; // Прямые переводы (лат→рус)
    const revertWords = []; // Обратные переводы (рус→лат)

    trainingWords.forEach(word => {
      const userData = userWordsData[word.id];
      const easyDirect = Number(userData?.mode_education) === 1;
      const easyRevert = Number(userData?.mode_education_revert) === 1;

      if (!userData) {
        directWords.push({ word, mode: false });
      } else {
        const directAvailable = (userData.correct_attempts < 2 || easyDirect) && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education, currentTime);
        const revertAvailable = (userData.correct_attempts_revert < 2 || easyRevert) && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert, currentTime);

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

  // Начать тренировку. subcategoryId = null — вся категория (2 уровень + все подкатегории 3); иначе только эта подкатегория
  const startTraining = async (subcategoryId = null) => {
    // Проверяем авторизацию
    if (!window.myajax || !window.myajax.is_logged_in) {
      alert('Для тренировки необходимо войти в систему');
      return;
    }

    // Главная кнопка: используем allCategoryIds (корень + подкатегории)
    const scopeIds = subcategoryId != null
      ? [parseInt(subcategoryId, 10)]
      : allCategoryIds;
    // Слова для тренировки. Для главной кнопки — тот же расчёт, что и rootWords в дебаге: сначала корень, потом подкатегории.
    let categoryWords;
    if (subcategoryId != null) {
      const subIdNum = parseInt(subcategoryId, 10);
      categoryWords = dictionaryWords.filter(w => wordBelongsToCategoryId(w, subIdNum));
    } else {
      const catIdNum = parseInt(categoryId, 10);
      if (categoryId === 0) {
        categoryWords = dictionaryWords;
      } else if (Number.isNaN(catIdNum)) {
        categoryWords = [];
      } else {
        // Точно так же, как в блоке дебага: корень по wordBelongsToCategoryId(w, catIdNum)
        const rootWordsForScope = dictionaryWords.filter(w => wordBelongsToCategoryId(w, catIdNum));
        const seenIds = new Set();
        categoryWords = [];
        rootWordsForScope.forEach(w => {
          if (w && !seenIds.has(w.id)) {
            seenIds.add(w.id);
            categoryWords.push(w);
          }
        });
        (subcategories || []).forEach(sub => {
          const subIdNum = parseInt(sub.id, 10);
          dictionaryWords.forEach(w => {
            if (wordBelongsToCategoryId(w, subIdNum) && !seenIds.has(w.id)) {
              seenIds.add(w.id);
              categoryWords.push(w);
            }
          });
        });
      }
    }

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
    
    // Формируем очередь тренировки (в той же области: вся категория или подкатегория)
    const queue = buildTrainingQueue(scopeIds);

    if (queue.length === 0) {
      alert('Нет доступных слов для тренировки! Все слова либо изучены, либо на откате.');
      return;
    }
    
    setTrainingQueue(queue);
    setCurrentQueueIndex(0);
    setTrainingPhase('direct');
    setTrainingScopeIds(scopeIds); // запоминаем область: только подкатегория или вся категория
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


  // Сбросить категорию из тренировки (вся категория 2 + все подкатегории 3)
  const resetCategoryFromTraining = async () => {
    if (!confirm('Вы уверены, что хотите сбросить эту категорию из тренировки? Все слова будут отключены от тренировки.')) {
      return;
    }

    try {
      const categoryWords = allCategoryIds.length === 0 && categoryId !== 0
        ? []
        : allCategoryIds.length === 0
          ? dictionaryWords
          : dictionaryWords.filter(word => wordBelongsToAnyOfCategories(word, allCategoryIds));

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

    const normalizedUserAnswer = normalizeString(stripParenthesesAndPunctuation(toCheck));
    
    correct = allAcceptableVariants.some(answer => {
      const normalizedAnswer = normalizeString(stripParenthesesAndPunctuation(answer));
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

  // Проверка доступности слова для тренировки в указанном режиме (учёт лёгкого режима)
  const isWordAvailableForMode = (word, mode) => {
    const userData = userWordsData[word.id];
    if (!userData) return !mode;

    const easyDirect = Number(userData.mode_education) === 1;
    const easyRevert = Number(userData.mode_education_revert) === 1;

    if (mode) {
      const revertAvailable = (userData.correct_attempts_revert < 2 || easyRevert) && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert, currentTime);
      return revertAvailable;
    }
    const directAvailable = (userData.correct_attempts < 2 || easyDirect) && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education, currentTime);
    return directAvailable;
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
    
    // Если не нашли доступное слово в текущей очереди, формируем новую очередь в той же области (подкатегория или вся категория)
    if (!found) {
      const scopeIds = trainingScopeIds != null ? trainingScopeIds : allCategoryIds;
      const remainingWords = getTrainingWords(scopeIds);
      if (remainingWords.length === 0) {
        setTrainingMode(false);
        setTrainingQueue([]);
        setCurrentQueueIndex(0);
        setTrainingScopeIds(null);
        alert('Отлично! Все доступные слова тренированы!');
        return;
      } else {
        const newQueue = buildTrainingQueue(scopeIds);
        
        if (newQueue.length === 0) {
          setTrainingMode(false);
          setTrainingQueue([]);
          setCurrentQueueIndex(0);
          setTrainingScopeIds(null);
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
          if (selectionMode) {
            // В режиме выбора фокусируемся на первой кнопке, а не на поле ввода
            const firstChoice = document.querySelector('.training-choice-btn');
            if (firstChoice) firstChoice.focus();
          } else {
            const inputField = document.querySelector('[data-training-input]');
            if (inputField) inputField.focus();
            else {
              const firstChoice = document.querySelector('.training-choice-btn');
              if (firstChoice) firstChoice.focus();
            }
          }
        }, 100);
        return;
      }
    }

    setTimeout(() => {
      if (selectionMode) {
        // В режиме выбора фокусируемся на первой кнопке, а не на поле ввода
        const firstChoice = document.querySelector('.training-choice-btn');
        if (firstChoice) firstChoice.focus();
      } else {
        const inputField = document.querySelector('[data-training-input]');
        if (inputField) inputField.focus();
        else {
          const firstChoice = document.querySelector('.training-choice-btn');
          if (firstChoice) firstChoice.focus();
        }
      }
    }, 100);
  };

  const handleFinishTraining = () => {
    setTrainingMode(false);
    setTrainingQueue([]);
    setCurrentQueueIndex(0);
    setTrainingPhase('direct');
    setTrainingScopeIds(null);
    setCurrentWord(null);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
  };

  // Лёгкая тренировка — mode_education = 1 для всех слов категории и подкатегорий
  const handleEasyTraining = async () => {
    if (!categoryId || categoryId === 0) {
      alert('Выберите категорию');
      return;
    }
    const idsToUpdate = allCategoryIds.length > 0 ? allCategoryIds : [categoryId];

    if (!confirm('Перевести все слова категории в режим лёгкой тренировки? Откат будет 30 минут вместо 20 часов.')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('action', 'set_category_to_easy_mode');
      formData.append('category_ids', JSON.stringify(idsToUpdate));

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
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
            onClick={() => startTraining()}
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

      {!trainingMode && (
        <ExamenErrorBoundary>
      {(() => {
        // Слова страницы: вся категория 2 уровня + все подкатегории 3 уровня
        const categoryWords = (categoryId === 0 || allCategoryIds.length === 0)
          ? (categoryId === 0 ? dictionaryWords : dictionaryWords.filter(w => wordBelongsToCategoryId(w, parseInt(categoryId, 10))))
          : dictionaryWords.filter(w => wordBelongsToAnyOfCategories(w, allCategoryIds));

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

        // Рендер одной строки слова. categoryIdForDelete — из какой категории удалять (null = полное удаление).
        const renderWordRow = (word, categoryIdForDelete = null) => {
          const catId = categoryIdForDelete ?? parseInt(categoryId, 10);
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
              categoryIdForDelete={catId}
              mode="examen"
              showCheckbox={showCheckbox}
              isSelected={isSelected}
              onToggleSelect={() => {
                setSelectedWordIds(prev => {
                  if (prev.includes(word.id)) return prev.filter(id => id !== word.id);
                  return [...prev, word.id];
                });
              }}
            />
          );
        };

        // Слова напрямую в категории 2 уровня; по подкатегориям 3 уровня — группы с заголовком и кнопкой тренировки
        const directWords = categoryWords.filter(w => wordBelongsToCategoryId(w, parseInt(categoryId, 10)));
        const hasSubs = subcategories.length > 0;

        const realWords = hasSubs
          ? null
          : categoryWords.map(w => renderWordRow(w, parseInt(categoryId, 10)));

        // Блок управления словами теперь отображается через CategoryWordManagement
        // в CategoryLayout для кастомных категорий и здесь для обычных

        // При наличии подкатегорий 3 уровня — группировка с кнопками тренировки по подкатегориям
        if (hasSubs) {
          return (
            <>
              {subcategories.map((sub) => {
                const subWords = categoryWords.filter(w => wordBelongsToCategoryId(w, parseInt(sub.id, 10)));
                if (subWords.length === 0) return null;
                return (
                  <section key={sub.id} className="examen-category-block examen-category-sub">
                    <h4 className="examen-category-block-title">
                      <span>{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => startTraining(sub.id)}
                        className="training-start-button"
                      >
                        🎯 Начать тренировку
                      </button>
                    </h4>
                    <ul className="words-education-list">{subWords.map(w => renderWordRow(w, parseInt(sub.id, 10)))}</ul>
                  </section>
                );
              })}
              {directWords.length > 0 && (
                <section className="examen-category-block examen-category-direct">
                  <h4 className="examen-category-block-title">
                    <span>Оставшиеся слова</span>
                  </h4>
                  <ul className="words-education-list">{directWords.map(w => renderWordRow(w, parseInt(categoryId, 10)))}</ul>
                </section>
              )}
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
        </ExamenErrorBoundary>
      )}
      
      {/* Модальное окно изменения порядка слов */}
      {showReorder && (() => {
        const reorderWords = allCategoryIds.length === 0 && categoryId !== 0
          ? []
          : allCategoryIds.length === 0
            ? dictionaryWords
            : dictionaryWords.filter(w => wordBelongsToAnyOfCategories(w, allCategoryIds));
        return (
          <CategoryWordReorder
            categoryId={categoryId}
            subcategories={subcategories}
            words={reorderWords}
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
