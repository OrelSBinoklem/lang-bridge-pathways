import axios from "axios";
import TrainingInterface from "../components/TrainingInterface";
import WordRow from "../components/WordRow";
import ExamenErrorBoundary from "../components/ExamenErrorBoundary";
import HelpModal from "../components/HelpModal";
import MatchGameModal from "../components/MatchGameModal";
import CategoryWordReorder from "../components/CategoryWordReorder";
import CategoryWordManagement from "../custom/components/CategoryWordManagement";
import { getCustomCategoryComponent } from "../custom/config/customComponents";
import { normalizeString, stripParenthesesAndPunctuation, getCooldownTime, formatTime as formatTimeHelper, getWordDisplayStatusExamen, getTrainingAnswerMode, setTrainingAnswerMode } from "../custom/utils/helpers";
import { generateChoiceOptions } from "../custom/utils/choiceOptionsGenerator";
import { useAdminMode } from "../custom/contexts/AdminModeContext";
import { TRAINING_CONFIG } from "../config/trainingConfig";
import { playWordAudio } from "../config/audioConfig";

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
  const [currentMode, setCurrentMode] = useState(false); // Текущий режим: false = прямой (лат→рус), true = обратный (рус→лат). Всегда boolean.
  const [attemptCount, setAttemptCount] = useState(0); // Счетчик попыток для текущего слова
  const [currentTime, setCurrentTime] = useState(Date.now()); // Для обновления таймеров
  const [showHelp, setShowHelp] = useState(false); // Показать справку
  const [showReorder, setShowReorder] = useState(false); // Показать инструмент изменения порядка
  const [selectedWordIds, setSelectedWordIds] = useState([]); // Выбранные слова для массовых операций (админ)
  const [showBulkActions, setShowBulkActions] = useState(false); // Режим массовых операций (админ: чекбоксы)
  const [denseAddMode, setDenseAddMode] = useState(false); // Режим «клик по слову = добавить/убрать из плотного»
  const [isUpdating, setIsUpdating] = useState(false); // Идёт обновление данных на сервере
  const checkAnswerSubmittingRef = useRef(false); // Защита от двойной отправки при проверке ответа
  const burgerWrapRef = useRef(null); // контейнер бургер-меню для клика снаружи
  const [trainingQueue, setTrainingQueue] = useState([]); // Очередь пар слов для тренировки
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0); // Текущая позиция в очереди
  const [trainingPhase, setTrainingPhase] = useState('direct'); // Фаза тренировки: 'direct', 'revert', 'alternating'
  const [trainingScopeIds, setTrainingScopeIds] = useState(null); // Область тренировки: null = вся категория, иначе [id подкатегории]
  const [selectionMode, setSelectionMode] = useState(false); // Режим выбора из предложенных (иначе ввод вручную)
  const [manualRetryUsed, setManualRetryUsed] = useState(false); // Уже использована доп. попытка ручного ввода для текущего слова
  const [manualInputError, setManualInputError] = useState(false); // Подсветка поля ввода при ошибке перед доп. попыткой
  const [showRetrainingNotice, setShowRetrainingNotice] = useState(false); // Показать сообщение о режиме дообучения
  const [showMatchGame, setShowMatchGame] = useState(false); // Мини-игра: сопоставь переводы
  const [pendingRetrainingState, setPendingRetrainingState] = useState(null); // { queue, firstItem } — новая очередь после стека direct+revert
  const [stackHasNonRetrainingWord, setStackHasNonRetrainingWord] = useState(false); // Флаг: в текущем стеке есть хотя бы одно слово НЕ в режиме дообучения (выставляется при создании стека)
  const [denseSessionState, setDenseSessionState] = useState(null); // Новая сессия плотного дообучения (4 стека)
  const [denseTrainingMode, setDenseTrainingMode] = useState(false); // Окно проверки работает только по dense-стекам
  const [liveDenseRemainingSec, setLiveDenseRemainingSec] = useState(null); // Локальный обратный отсчёт для отображения в лайве (обновление раз в секунду)
  const [denseMessagePopup, setDenseMessagePopup] = useState(null); // { title, message } — попап как в окне результата (подождать / слова пройдены)
  const [showActionsMenu, setShowActionsMenu] = useState(false); // бургер-меню: Лёгкая, Мини-игра, В плотное, Сбросить и др.
  const [showGameDisabledPopover, setShowGameDisabledPopover] = useState(false); // поповер «почему заблокирована мини-игра»
  const lastDenseAddTimeRef = useRef(null); // для логирования обновлённого состояния слов после добавления в плотное

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

  // При смене слова/направления сбрасываем доп. попытку и подсветку поля.
  useEffect(() => {
    setManualRetryUsed(false);
    setManualInputError(false);
  }, [currentWord?.id, currentMode]);

  // Фокус на кнопку «Продолжить отвечать» при открытии окна режима дообучения (чтобы Enter срабатывал)
  useEffect(() => {
    if (showRetrainingNotice) {
      const timer = setTimeout(() => {
        const btn = document.querySelector('.training-retraining-notice .training-retraining-continue-btn');
        if (btn) btn.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showRetrainingNotice]);

  // Получить статус изучения для умного отображения
  const getWordDisplayStatus = (wordId) => {
    return getWordDisplayStatusExamen(userWordsData[wordId], currentTime);
  };

  const currentDenseCategoryId = useMemo(() => {
    const cid = parseInt(categoryId, 10);
    return Number.isNaN(cid) ? 0 : cid;
  }, [categoryId]);

  const dictionaryWordsById = useMemo(() => {
    const map = {};
    dictionaryWords.forEach(w => { map[w.id] = w; });
    return map;
  }, [dictionaryWords]);

  const fetchDenseState = async (action = 'dense_training_tick') => {
    if (!window.myajax || !window.myajax.is_logged_in || !currentDenseCategoryId) {
      setDenseSessionState(null);
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('action', action);
      formData.append('category_id', currentDenseCategoryId);
      const response = await axios.post(window.myajax.url, formData);
      if (response.data?.success) {
        setDenseSessionState(response.data.data || null);
        return response.data.data || null;
      }
    } catch (err) {
      console.error('Ошибка получения dense-состояния:', err?.message || err);
    }
    return null;
  };

  /** Получить состояние dense без ротации/очистки — для открытия окна тренировки без сброса сессии */
  const fetchDenseStateForStart = async () => {
    if (!window.myajax || !window.myajax.is_logged_in || !currentDenseCategoryId) {
      setDenseSessionState(null);
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('action', 'get_dense_training_state');
      formData.append('category_id', currentDenseCategoryId);
      formData.append('no_rotate', '1');
      const response = await axios.post(window.myajax.url, formData);
      if (response.data?.success) {
        setDenseSessionState(response.data.data || null);
        return response.data.data || null;
      }
    } catch (err) {
      console.error('Ошибка получения dense-состояния:', err?.message || err);
    }
    return null;
  };

  const shuffleDense = (array) => shuffleArray(array);

  const buildDenseQueueFromState = (state) => {
    if (!state) return [];
    const directIds = Array.isArray(state.dense_word_ids_direct) ? state.dense_word_ids_direct : [];
    const revertIds = Array.isArray(state.dense_word_ids_revert) ? state.dense_word_ids_revert : [];
    const direct = shuffleDense(directIds)
      .map(id => dictionaryWordsById[id])
      .filter(Boolean)
      .map(word => ({ word, mode: false, phase: 'direct' }));
    const revert = shuffleDense(revertIds)
      .map(id => dictionaryWordsById[id])
      .filter(Boolean)
      .map(word => ({ word, mode: true, phase: 'revert' }));
    return [...direct, ...revert];
  };

  /** Проверка вхождения ID в массив (бэкенд может вернуть числа или строки) */
  const denseIdIn = (arr, id) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const num = Number(id);
    if (Number.isNaN(num)) return false;
    return arr.some((x) => Number(x) === num);
  };

  const getDenseWordMeta = (wordId) => {
    const st = denseSessionState;
    if (!st || !st.exists) return null;
    const inStartDirect = denseIdIn(st.dense_word_ids_direct, wordId);
    const inReviewDirect = denseIdIn(st.dense_review_word_ids_direct, wordId);
    const inStartRevert = denseIdIn(st.dense_word_ids_revert, wordId);
    const inReviewRevert = denseIdIn(st.dense_review_word_ids_revert, wordId);
    const isDenseWord = inStartDirect || inReviewDirect || inStartRevert || inReviewRevert;
    if (!isDenseWord) return null;
    const displayRemaining = (liveDenseRemainingSec != null ? liveDenseRemainingSec : (st.waiting_remaining_sec ?? 0));
    return {
      attemptsLeft: st.attempts_left || 0,
      waitingRemainingSec: Math.max(0, displayRemaining),
      inStartDirect,
      inReviewDirect,
      inStartRevert,
      inReviewRevert,
    };
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

  // Плотное дообучение активно: есть ожидание или есть слова в очереди — обычную тренировку в категории блокируем
  const isDenseActive = useMemo(() => {
    const st = denseSessionState;
    if (!st?.exists) return false;
    const waiting = (liveDenseRemainingSec != null ? liveDenseRemainingSec : (st.waiting_remaining_sec ?? 0)) > 0;
    const hasQueue = buildDenseQueueFromState(st).length > 0;
    return waiting || hasQueue;
  }, [denseSessionState, liveDenseRemainingSec]);

  // В режиме плотного дообучения нет слов в пуле — кнопку мини-игры блокируем (чтобы не «палились» слова на атаке)
  const denseMatchGameDisabled = useMemo(() => {
    if (!currentDenseCategoryId) return false;
    const n = denseSessionState?.active_word_ids?.length ?? 0;
    return n === 0;
  }, [currentDenseCategoryId, denseSessionState?.active_word_ids]);

  // Логируем ID для настройки кастомных компонентов
  useEffect(() => {
    // ID для настройки кастомных компонентов
  }, [dictionaryId, categoryId]);

  // Сбрасываем выбранные слова и режимы при смене категории
  useEffect(() => {
    setSelectedWordIds([]);
    setShowBulkActions(false);
    setDenseAddMode(false);
  }, [categoryId]);

  useEffect(() => {
    fetchDenseState('get_dense_training_state');
  }, [currentDenseCategoryId, dictionaryWords.length]);

  // После добавления слова в плотное: при обновлении userWordsData вывести в консоль обновлённое состояние слов категории
  useEffect(() => {
    const t = lastDenseAddTimeRef.current;
    if (t == null || Date.now() - t > 5000) return;
    const categoryWords = (categoryId === 0 || allCategoryIds.length === 0)
      ? (categoryId === 0 ? dictionaryWords : dictionaryWords.filter(w => wordBelongsToCategoryId(w, parseInt(categoryId, 10))))
      : dictionaryWords.filter(w => wordBelongsToAnyOfCategories(w, allCategoryIds));
    const wordsState = {};
    categoryWords.forEach(w => {
      wordsState[w.id] = userWordsData[w.id] != null ? { ...userWordsData[w.id], word: w.word } : null;
    });
    console.log('[Плотное] Слова категории после обновления с сервера (userWordsData):', wordsState);
    lastDenseAddTimeRef.current = null;
  }, [userWordsData, categoryId, allCategoryIds, dictionaryWords]);

  // Синхронизация локального счётчика с серверным waiting_remaining_sec
  useEffect(() => {
    const sec = denseSessionState?.waiting_remaining_sec;
    if (sec != null && sec > 0) setLiveDenseRemainingSec(sec);
    else if (sec === 0 || !denseSessionState?.exists) setLiveDenseRemainingSec(null);
  }, [denseSessionState?.waiting_remaining_sec, denseSessionState?.exists]);

  // Обновление счётчика плотного дообучения раз в секунду
  useEffect(() => {
    const id = setInterval(() => {
      setLiveDenseRemainingSec((prev) => {
        if (prev == null || prev <= 0) return null;
        if (prev === 1) {
          fetchDenseState('get_dense_training_state');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Закрытие бургер-меню по клику снаружи
  useEffect(() => {
    if (!showActionsMenu) return;
    const handleClick = (e) => {
      if (burgerWrapRef.current && !burgerWrapRef.current.contains(e.target)) setShowActionsMenu(false);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [showActionsMenu]);

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

  // Слово считается выученным только когда оба направления: по 2+ правильных в прямом и в обратном
  const isWordLearned = (wordId) => {
    const userData = userWordsData[wordId];
    if (!userData) return false;
    return userData.correct_attempts >= 2 && userData.correct_attempts_revert >= 2;
  };

  // Список слов категории (без фильтра по готовности к тренировке). scopeCategoryIds = allCategoryIds или [subId].
  const getCategoryWordsList = (scopeCategoryIds = null) => {
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
    return list;
  };

  // Получить слова для тренировки (категория + фильтр по готовности).
  const getTrainingWords = (scopeCategoryIds = null) => {
    const categoryWords = getCategoryWordsList(scopeCategoryIds);
    return categoryWords.filter(word => {
      const displayStatus = getWordDisplayStatus(word.id);
      return !displayStatus.fullyLearned && (!displayStatus.cooldownDirect || !displayStatus.cooldownRevert);
    });
  };

  // Слова для мини-игры: только те, что в режиме дообучения, лёгкой тренировки или с хотя бы одним невыученным направлением.
  const retrainingWordsForGame = useMemo(() => {
    const list = getCategoryWordsList(allCategoryIds);
    const forGame = list.filter(w => {
      const ud = userWordsData[w.id];
      if (!ud) return true; // нет записи — показываем (ещё не тренировали)
      const inDense = (ud.dense_remaining_direct || 0) > 0 || (ud.dense_remaining_revert || 0) > 0;
      const inEasy = Number(ud.mode_education) === 1 || Number(ud.mode_education_revert) === 1;
      const oneDirectionNotLearned = (ud.correct_attempts || 0) < 2 || (ud.correct_attempts_revert || 0) < 2;
      return inDense || inEasy || oneDirectionNotLearned;
    });
    return forGame.length > 0 ? forGame : list;
  }, [dictionaryWords, allCategoryIds, categoryId, userWordsData]);

  // В мини-игре при активном плотном дообучении показываем только слова из плотного пула (active_word_ids).
  const matchGameWords = useMemo(() => {
    const denseIds = denseSessionState?.active_word_ids;
    if (currentDenseCategoryId && Array.isArray(denseIds) && denseIds.length > 0) {
      const idSet = new Set(denseIds.map(id => parseInt(id, 10)));
      return retrainingWordsForGame.filter(w => idSet.has(parseInt(w.id, 10)));
    }
    return retrainingWordsForGame;
  }, [currentDenseCategoryId, denseSessionState?.active_word_ids, retrainingWordsForGame]);

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
        revertWords.push({ word, mode: true });
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

    // Если есть активная dense-сессия для текущей категории — запускаем окно проверки строго в dense-режиме.
    // Запрашиваем состояние без ротации (no_rotate), чтобы при открытии не сбрасывать сессию по 15 мин.
    if (currentDenseCategoryId) {
      const denseState = await fetchDenseStateForStart();
      if (denseState?.exists) {
        const denseQueue = buildDenseQueueFromState(denseState);
        if (denseQueue.length > 0) {
          setDenseTrainingMode(true);
          setTrainingQueue(denseQueue);
          setCurrentQueueIndex(0);
          setTrainingPhase(denseQueue[0].phase || 'direct');
          setTrainingScopeIds([currentDenseCategoryId]);
          setTrainingMode(true);
          setCurrentWord(denseQueue[0].word);
          setCurrentMode(Boolean(denseQueue[0].mode));
          setUserAnswer('');
          setShowResult(false);
          setAttemptCount(0);
          if (!denseQueue[0].mode && denseQueue[0].word) playWordAudio(denseQueue[0].word.word, denseQueue[0].word.learn_lang);
          return;
        }
        if ((denseState.waiting_remaining_sec || 0) > 0) {
          const mm = Math.floor((denseState.waiting_remaining_sec || 0) / 60);
          const ss = (denseState.waiting_remaining_sec || 0) % 60;
          setDenseMessagePopup({
            title: 'Плотное дообучение',
            message: `После правильного ответа нужно подождать ${mm}:${String(ss).padStart(2, '0')} до следующего раунда.`,
          });
          return;
        }
      }
    }
    setDenseTrainingMode(false);

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

    const hasNonRetraining = queue.some(item => {
      const ud = userWordsData[item.word?.id];
      if (!ud) return true;
      const flag = item.mode ? Number(ud.mode_education_revert) : Number(ud.mode_education);
      return flag === 0;
    });
    
    setTrainingQueue(queue);
    setStackHasNonRetrainingWord(hasNonRetraining);
    setCurrentQueueIndex(0);
    setTrainingPhase('direct');
    setTrainingScopeIds(scopeIds); // запоминаем область: только подкатегория или вся категория
    setTrainingMode(true);
    
    // Устанавливаем первое слово из очереди
    const firstItem = queue[0];
    setCurrentWord(firstItem.word);
    setCurrentMode(Boolean(firstItem.mode));
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
    if (!firstItem.mode && firstItem.word) playWordAudio(firstItem.word.word, firstItem.word.learn_lang);
  };

  // Обновить попытки слова на сервере (обычный режим или плотный — не трогаем логику обычного обучения)
  const updateWordAttempts = async (wordId, isRevertMode, isCorrect, forceNonFirstAttempt = false) => {
    try {
      if (denseTrainingMode) {
        const formData = new FormData();
        formData.append('action', 'dense_training_submit_answer');
        formData.append('category_id', currentDenseCategoryId);
        formData.append('word_id', wordId);
        formData.append('is_revert', isRevertMode ? 1 : 0);
        formData.append('is_correct', isCorrect ? 1 : 0);
        const res = await axios.post(window.myajax.url, formData);
        if (res.data?.success) {
          setDenseSessionState(res.data.data || null);
          if (onRefreshUserData) await onRefreshUserData();
        } else {
          console.error('Ошибка dense_training_submit_answer:', res.data?.message);
        }
        return;
      }

      const userData = userWordsData[currentWord?.id];
      let me = isRevertMode ? userData?.mode_education_revert : userData?.mode_education;

      const formData = new FormData();
      formData.append("action", "update_word_attempts");
      formData.append("word_id", wordId);
      formData.append("is_revert", isRevertMode ? 1 : 0);
      formData.append("is_correct", isCorrect ? 1 : 0);
      const isFirstAttempt = forceNonFirstAttempt ? 0 : (me ? 0 : 1);
      formData.append("is_first_attempt", isFirstAttempt);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        if (onRefreshUserData) await onRefreshUserData();
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
        await clearDenseSessionForCategory(currentDenseCategoryId);
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

  /** Клик по слову в режиме «В плотное»: добавить в плотное или убрать. */
  const handleDenseToggleWord = async (wordId) => {
    if (!currentDenseCategoryId) return;
    const inDense = getDenseWordMeta(wordId);
    try {
      if (inDense) {
        const formData = new FormData();
        formData.append('action', 'remove_dense_training_word');
        formData.append('category_id', currentDenseCategoryId);
        formData.append('word_id', wordId);
        const response = await axios.post(window.myajax.url, formData);
        if (response.data?.success) setDenseSessionState(response.data.data || null);
      } else {
        const formData = new FormData();
        formData.append('action', 'add_dense_training_words');
        formData.append('category_id', currentDenseCategoryId);
        formData.append('dictionary_id', dictionaryId);
        formData.append('word_ids', JSON.stringify([wordId]));
        formData.append('use_random', 1);
        const response = await axios.post(window.myajax.url, formData);
        if (response.data?.success) {
          const newState = response.data.data || null;
          setDenseSessionState(newState);
          // Логирование: состояние плотного от сервера и текущие данные слов категории
          console.log('[Плотное] Обновлённое состояние плотного (ответ сервера):', newState);
          const categoryWords = (categoryId === 0 || allCategoryIds.length === 0)
            ? (categoryId === 0 ? dictionaryWords : dictionaryWords.filter(w => wordBelongsToCategoryId(w, parseInt(categoryId, 10))))
            : dictionaryWords.filter(w => wordBelongsToAnyOfCategories(w, allCategoryIds));
          const wordsState = {};
          categoryWords.forEach(w => {
            wordsState[w.id] = userWordsData[w.id] != null ? { ...userWordsData[w.id], word: w.word } : null;
          });
          console.log('[Плотное] Слова категории (userWordsData до обновления с сервера):', wordsState);
          lastDenseAddTimeRef.current = Date.now();
          if (onRefreshUserData) onRefreshUserData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  /** Сбросить плотную сессию для категории (без подтверждения). Вызывается в конце дообучения и при «Сбросить». */
  const clearDenseSessionForCategory = async (categoryIdToClear) => {
    if (!categoryIdToClear) return;
    try {
      const formData = new FormData();
      formData.append('action', 'clear_dense_training');
      formData.append('category_id', categoryIdToClear);
      const response = await axios.post(window.myajax.url, formData);
      if (response.data?.success) {
        setDenseSessionState(response.data.data || null);
      }
    } catch (err) {
      console.error(err);
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

  const removeGarumMarks = (text) => {
    return normalizeString(text).replace(/[āēīūō]/g, (char) => {
      const map = { ā: 'a', ē: 'e', ī: 'i', ū: 'u', ō: 'o' };
      return map[char] || char;
    });
  };

  // "Только гарумзиме": если без долгих гласных ответ совпадает с правильным вариантом.
  const isGarumOnlyMismatch = (typedAnswer, acceptableAnswers) => {
    const normalizedTypedWithoutGarum = removeGarumMarks(stripParenthesesAndPunctuation(typedAnswer || ''));
    return acceptableAnswers.some(answer => {
      const normalizedAnswerWithoutGarum = removeGarumMarks(stripParenthesesAndPunctuation(answer || ''));
      return normalizedTypedWithoutGarum === normalizedAnswerWithoutGarum;
    });
  };

  // Обработчики для TrainingInterface. overrideAnswer — при выборе из вариантов (режим «выбор»)
  const handleCheckAnswer = async (overrideAnswer) => {
    const toCheck = (overrideAnswer != null && String(overrideAnswer).trim()) ? String(overrideAnswer).trim() : userAnswer.trim();
    if (!currentWord || isUpdating) return;
    if (checkAnswerSubmittingRef.current) return;
    checkAnswerSubmittingRef.current = true;

    let correct = false;
    let allAcceptableVariants = [];

    // Если пользователь нажал «Посмотреть правильный ответ» (пустой ввод) — считаем неправильным, записываем попытку
    if (toCheck) {
      let correctAnswers = [];

      if (currentMode) {
        correctAnswers = [currentWord.word];
      } else {
        correctAnswers = [
          currentWord.translation_1,
          currentWord.translation_2,
          currentWord.translation_3
        ].filter(t => t && t !== '0');
        
        if (currentWord.translation_input_variable && currentWord.translation_input_variable.trim()) {
          const additionalVariants = currentWord.translation_input_variable
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0);
          correctAnswers.push(...additionalVariants);
        }
      }
      
      allAcceptableVariants = [];
      correctAnswers.forEach(answer => {
        const variants = generateAnswerVariants(answer);
        allAcceptableVariants.push(...variants);
      });

      const normalizedUserAnswer = normalizeString(stripParenthesesAndPunctuation(toCheck));
      
      correct = allAcceptableVariants.some(answer => {
        const normalizedAnswer = normalizeString(stripParenthesesAndPunctuation(answer));
        return normalizedAnswer === normalizedUserAnswer;
      });
    }

    const isManualTypedAttempt = !selectionMode && overrideAnswer == null;
    const canOfferSecondManualAttempt = (
      TRAINING_CONFIG.ALLOW_SECOND_MANUAL_ATTEMPT_NON_GARUM &&
      isManualTypedAttempt &&
      toCheck &&
      !correct &&
      !manualRetryUsed &&
      allAcceptableVariants.length > 0
    );

    if (canOfferSecondManualAttempt && !isGarumOnlyMismatch(toCheck, allAcceptableVariants)) {
      setManualRetryUsed(true);
      setManualInputError(true);
      checkAnswerSubmittingRef.current = false;
      return;
    }

    setIsCorrect(correct);
    setManualInputError(false);
    
    // Блокируем кнопку и показываем лоадер
    setIsUpdating(true);

    try {
      // Обновляем прогресс в базе данных и ждём завершения
      await updateWordAttempts(currentWord.id, currentMode, correct, manualRetryUsed);
      
      // Увеличиваем счетчик попыток
      setAttemptCount(prev => prev + 1);
      
      // Показываем результат только после успешного обновления
      setShowResult(true);
      if (correct) setDenseAddMode(false); // выключить режим выбора слов для плотного после первого правильного ответа
      // Звук после ответа только в обратном режиме (рус→лат): разгадывали латышское слово — даём услышать произношение
      if (currentMode) playWordAudio(currentWord.word, currentWord.learn_lang);

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
      checkAnswerSubmittingRef.current = false;
    }
  };

  const handleManualAnswerChange = (value) => {
    setUserAnswer(value);
    if (manualInputError) setManualInputError(false);
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

  const handleNextWord = async () => {
    // Сбрасываем состояние обновления при переходе к следующему слову
    setIsUpdating(false);

    if (denseTrainingMode) {
      const denseState = await fetchDenseState('dense_training_tick');
      const denseQueue = buildDenseQueueFromState(denseState);
      if (denseQueue.length === 0) {
        if ((denseState?.waiting_remaining_sec || 0) > 0) {
          const mm = Math.floor((denseState.waiting_remaining_sec || 0) / 60);
          const ss = (denseState.waiting_remaining_sec || 0) % 60;
          setDenseMessagePopup({
            title: 'Плотное дообучение',
            message: `После правильного ответа нужно подождать ${mm}:${String(ss).padStart(2, '0')} до следующего раунда.`,
          });
        } else {
          await clearDenseSessionForCategory(currentDenseCategoryId);
          setDenseMessagePopup({
            title: 'Плотное дообучение',
            message: 'Слова пройдены для плотного дообучения.',
          });
        }
        handleFinishTraining();
        return;
      }

      setTrainingQueue(denseQueue);
      setCurrentQueueIndex(0);
      setCurrentWord(denseQueue[0].word);
      setCurrentMode(Boolean(denseQueue[0].mode));
      setTrainingPhase(denseQueue[0].phase || 'direct');
      setUserAnswer('');
      setShowResult(false);
      setAttemptCount(0);
      if (!denseQueue[0].mode && denseQueue[0].word) playWordAudio(denseQueue[0].word.word, denseQueue[0].word.learn_lang);
      return;
    }
    
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
        setCurrentMode(Boolean(nextItem.mode));
        setTrainingPhase(nextItem.phase || 'direct');
        setUserAnswer('');
        setShowResult(false);
        setAttemptCount(0);
        if (!nextItem.mode && nextItem.word) playWordAudio(nextItem.word.word, nextItem.word.learn_lang);
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
        
        // Показываем сообщение о режиме дообучения по настройке TRAINING_CONFIG.RETRAINING_NOTICE_MODE
        const firstItem = newQueue[0];
        const hasNonRetrainingForNew = newQueue.some(item => {
          const ud = userWordsData[item.word?.id];
          if (!ud) return true;
          const flag = item.mode ? Number(ud.mode_education_revert) : Number(ud.mode_education);
          return flag === 0;
        });
        const showNotice = TRAINING_CONFIG.RETRAINING_NOTICE_MODE === 'always' || stackHasNonRetrainingWord;
        if (showNotice) {
          setPendingRetrainingState({ queue: newQueue, firstItem });
          setShowRetrainingNotice(true);
        } else {
          setTrainingQueue(newQueue);
          setStackHasNonRetrainingWord(hasNonRetrainingForNew);
          setCurrentQueueIndex(0);
          setCurrentWord(firstItem.word);
          setCurrentMode(Boolean(firstItem.mode));
          setTrainingPhase(firstItem.phase || 'direct');
          setUserAnswer('');
          setShowResult(false);
          setAttemptCount(0);
          if (!firstItem.mode && firstItem.word) playWordAudio(firstItem.word.word, firstItem.word.learn_lang);
          setTimeout(() => {
            if (selectionMode) {
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
        }
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
    setDenseTrainingMode(false);
    setTrainingMode(false);
    setTrainingQueue([]);
    setCurrentQueueIndex(0);
    setTrainingPhase('direct');
    setTrainingScopeIds(null);
    setCurrentWord(null);
    setCurrentMode(false);
    setUserAnswer('');
    setManualRetryUsed(false);
    setManualInputError(false);
    setShowResult(false);
    setAttemptCount(0);
    setShowRetrainingNotice(false);
    setPendingRetrainingState(null);
    setStackHasNonRetrainingWord(false);
  };

  const handleContinueRetraining = () => {
    if (!pendingRetrainingState) return;
    const { queue, firstItem } = pendingRetrainingState;
    const hasNonRetrainingForNew = queue.some(item => {
      const ud = userWordsData[item.word?.id];
      if (!ud) return true;
      const flag = item.mode ? Number(ud.mode_education_revert) : Number(ud.mode_education);
      return flag === 0;
    });
    setTrainingQueue(queue);
    setStackHasNonRetrainingWord(hasNonRetrainingForNew);
    setCurrentQueueIndex(0);
    setCurrentWord(firstItem.word);
    setCurrentMode(Boolean(firstItem.mode));
    setTrainingPhase(firstItem.phase || 'direct');
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
    setShowRetrainingNotice(false);
    setPendingRetrainingState(null);
    if (!firstItem.mode && firstItem.word) playWordAudio(firstItem.word.word, firstItem.word.learn_lang);
    setTimeout(() => {
      if (selectionMode) {
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
		<div className="examen-root">
      {!trainingMode && (
        <div className="training-buttons-container">
          <button
            onClick={() => startTraining()}
            className="training-start-button training-start-button--fit-content"
            title={isDenseActive ? 'При активном плотном дообучении откроется плотная тренировка' : ''}
          >
            🎯 Начать тренировку
          </button>

          <span className="training-buttons-spacer" aria-hidden="true" />
          <button
            onClick={() => setShowHelp(true)}
            className="training-help-button training-help-button--right training-help-button--standalone"
            title="Показать справку"
          >
            ❓ Справка
          </button>

          <div className="training-actions-burger-wrap" ref={burgerWrapRef}>
            <button
              type="button"
              className={`training-burger-btn ${showActionsMenu ? 'training-burger-btn--open' : ''}`}
              onClick={() => setShowActionsMenu(prev => !prev)}
              title={showActionsMenu ? 'Закрыть меню' : 'Ещё действия'}
              aria-expanded={showActionsMenu}
            >
              <span className="training-burger-line" />
              <span className="training-burger-line" />
              <span className="training-burger-line" />
            </button>

            <div
              className={`training-actions-menu ${showActionsMenu ? 'training-actions-menu--open' : ''}`}
              aria-hidden={!showActionsMenu}
            >
              <button
                type="button"
                className="training-actions-menu-item training-actions-menu-item--easy"
                onClick={() => { handleEasyTraining(); setShowActionsMenu(false); }}
                title="Откат 30 минут вместо 20 часов для всех слов категории"
              >
                😊 Лёгкая тренировка
              </button>
              <div
                className="training-actions-menu-item-wrap training-actions-menu-item-wrap--game"
                onMouseEnter={() => denseMatchGameDisabled && setShowGameDisabledPopover(true)}
                onMouseLeave={() => setShowGameDisabledPopover(false)}
              >
                {denseMatchGameDisabled && showGameDisabledPopover && (
                  <div className="training-actions-game-disabled-popover" role="tooltip">
                    Вы не пометили труднозапоминаемые слова. Добавьте слова через «В плотное».
                  </div>
                )}
                <button
                  type="button"
                  className={`training-actions-menu-item training-actions-menu-item--game ${denseMatchGameDisabled ? 'training-actions-menu-item--disabled' : ''}`}
                  disabled={denseMatchGameDisabled}
                  onClick={() => { if (!denseMatchGameDisabled) { setShowMatchGame(true); setShowActionsMenu(false); } }}
                  title={denseMatchGameDisabled ? '' : 'Мини-игра: сопоставь слова и переводы'}
                >
                  🎮 Труднозапоминаемые-игра
                </button>
              </div>
              <button
                type="button"
                className={`training-actions-menu-item training-actions-menu-item--dense ${denseAddMode ? 'training-actions-menu-item--dense-active' : ''}`}
                onClick={() => { setDenseAddMode(prev => !prev); setShowActionsMenu(false); }}
                title={denseAddMode ? 'Клик по слову — добавить/убрать из плотного' : 'Включить режим выбора слов для плотного дообучения'}
              >
                {denseAddMode ? '🔓 Выберите слова' : `🔒 Труднозапоминаемые слова (${Array.isArray(denseSessionState?.active_word_ids) ? denseSessionState.active_word_ids.length : 0})`}
              </button>
              {isAdminModeActive && (
                <button
                  type="button"
                  className="training-actions-menu-item training-actions-menu-item--reorder"
                  onClick={() => { setShowReorder(true); setShowActionsMenu(false); }}
                  title="Изменить порядок слов в категории"
                >
                  🔄 Порядок слов
                </button>
              )}
              <button
                type="button"
                className="training-actions-menu-item training-actions-menu-item--help training-actions-menu-item--help-mobile"
                onClick={() => { setShowHelp(true); setShowActionsMenu(false); }}
                title="Показать справку"
              >
                ❓ Справка
              </button>
              <button
                type="button"
                className="training-actions-menu-item training-actions-menu-item--clear"
                onClick={() => { resetCategoryFromTraining(); setShowActionsMenu(false); }}
                title="Сбросить тренировочные данные категории"
              >
                🚫 Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      {denseMessagePopup && (
        <div
          className="dense-message-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
          onClick={() => setDenseMessagePopup(null)}
          role="dialog"
          aria-labelledby="dense-message-title"
        >
          <div
            className="training-interface training-retraining-notice dense-message-popup"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', margin: '1rem' }}
          >
            <div className="training-retraining-notice-text">
              <h3 id="dense-message-title" className="dense-message-popup-title">{denseMessagePopup.title}</h3>
              <p className="dense-message-popup-message" style={{ whiteSpace: 'pre-wrap' }}>{denseMessagePopup.message}</p>
            </div>
            <div className="training-retraining-notice-buttons">
              <button
                type="button"
                className="training-button training-retraining-continue-btn"
                onClick={() => setDenseMessagePopup(null)}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
      <MatchGameModal
        isOpen={showMatchGame}
        onClose={() => setShowMatchGame(false)}
        words={matchGameWords}
        denseWaitingRemainingSec={liveDenseRemainingSec != null ? liveDenseRemainingSec : (denseSessionState?.waiting_remaining_sec ?? 0)}
        onFullSuccess={async () => {
          if (!currentDenseCategoryId) return;
          try {
            const formData = new FormData();
            formData.append('action', 'dense_match_game_success');
            formData.append('category_id', currentDenseCategoryId);
            const res = await axios.post(window.myajax.url, formData);
            if (res.data?.success && res.data.data) {
              const state = res.data.data;
              setDenseSessionState(state);
              setDenseAddMode(false); // выключить режим выбора слов после правильного ответа в мини-игре
              if (onRefreshUserData) onRefreshUserData();
              // Последняя попытка: бэкенд очистил сессию (exists: false) — сразу окно об окончании, закрыть мини-игру, счётчик пропадёт
              if (!state?.exists) {
                setShowMatchGame(false);
                setDenseMessagePopup({
                  title: 'Плотное дообучение',
                  message: 'Слова пройдены для плотного дообучения.',
                });
                return;
              }
              // Иначе попап: подождать после правильного ответа
              const sec = state?.waiting_remaining_sec ?? 0;
              if (sec > 0) {
                const mm = Math.floor(sec / 60);
                const ss = sec % 60;
                setDenseMessagePopup({
                  title: 'Плотное дообучение',
                  message: `После правильного ответа нужно подождать ${mm}:${String(ss).padStart(2, '0')} до следующего раунда.`,
                });
              }
            }
          } catch (e) {
            console.error('dense_match_game_success:', e);
          }
        }}
      />

      {trainingMode && showRetrainingNotice && (
        <div
          className="training-interface training-retraining-notice"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleContinueRetraining();
            }
          }}
        >
          <button
            onClick={handleFinishTraining}
            className="training-close-button"
            title="Выйти из тренировки"
            type="button"
          >
            ×
          </button>
          <div className="training-retraining-notice-text">
            <p>Слова, на которые вы ответили неправильно, перешли в режим дообучения. Вы можете просмотреть и запомнить их — уделите этому хотя бы пару минут. Затем продолжайте отвечать.</p>
          </div>
          <div className="training-retraining-notice-buttons">
            <button
              type="button"
              className="training-button training-retraining-continue-btn"
              onClick={handleContinueRetraining}
            >
              Продолжить отвечать
            </button>
            <button
              type="button"
              className="training-retraining-btn"
              onClick={handleFinishTraining}
            >
              Закрыть и повторить слова
            </button>
          </div>
        </div>
      )}

      {trainingMode && !showRetrainingNotice && (
        <TrainingInterface
          currentWord={currentWord}
          currentMode={currentMode}
          userAnswer={userAnswer}
          setUserAnswer={handleManualAnswerChange}
          showResult={showResult}
          isCorrect={isCorrect}
          onCheckAnswer={handleCheckAnswer}
          onNextWord={handleNextWord}
          onFinishTraining={handleFinishTraining}
          isUpdating={isUpdating}
          manualInputError={manualInputError}
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
          const showCheckbox = isAdminModeActive && showBulkActions;
          const denseMeta = getDenseWordMeta(word.id);
          return (
            <WordRow
              key={word.id}
              word={word}
              userData={userData}
              displayStatus={displayStatus}
              denseMeta={denseMeta}
              formatTime={formatTime}
              dictionaryId={dictionaryId}
              editingWordId={editingWordId}
              onToggleEdit={toggleEdit}
              onRefreshDictionaryWords={onRefreshDictionaryWords}
              onRefreshUserData={onRefreshUserData}
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
              denseAddMode={denseAddMode}
              onDenseToggle={handleDenseToggleWord}
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
              {denseAddMode && (
                <div className="dense-add-mode-hint" role="status">
                  <span className="dense-add-mode-hint__text">Клик по слову — добавить или убрать. Тяжело запоминаемое слово…</span>
                  <button
                    type="button"
                    className="dense-add-mode-hint__close"
                    onClick={() => setDenseAddMode(false)}
                    title="Выйти из режима выбора слов"
                    aria-label="Выйти из режима выбора слов"
                  >
                    ×
                  </button>
                </div>
              )}
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
                        title={isDenseActive ? 'При активном плотном дообучении откроется плотная тренировка' : ''}
                      >
                        🎯 Начать тренировку
                      </button>
                    </h4>
                    <ul className={`words-education-list ${denseAddMode ? 'words-education-list--dense-add-mode' : ''}`}>{subWords.map(w => renderWordRow(w, parseInt(sub.id, 10)))}</ul>
                  </section>
                );
              })}
              {directWords.length > 0 && (
                <section className="examen-category-block examen-category-direct">
                  <h4 className="examen-category-block-title">
                    <span>Оставшиеся слова</span>
                  </h4>
                  <ul className={`words-education-list ${denseAddMode ? 'words-education-list--dense-add-mode' : ''}`}>{directWords.map(w => renderWordRow(w, parseInt(categoryId, 10)))}</ul>
                </section>
              )}
              <CategoryWordManagement
                dictionaryId={dictionaryId}
                categoryId={categoryId}
                sourceCategoryIds={[parseInt(categoryId, 10), ...subcategories.map(s => parseInt(s.id, 10)).filter(Boolean)]}
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
            {denseAddMode && (
              <div className="dense-add-mode-hint" role="status">
                <span className="dense-add-mode-hint__text">Клик по слову — добавить или убрать. Тяжело запоминаемое слово…</span>
                <button
                  type="button"
                  className="dense-add-mode-hint__close"
                  onClick={() => setDenseAddMode(false)}
                  title="Выйти из режима выбора слов"
                  aria-label="Выйти из режима выбора слов"
                >
                  ×
                </button>
              </div>
            )}
            <ul className={`words-education-list ${denseAddMode ? 'words-education-list--dense-add-mode' : ''}`}>
              {realWords}
            </ul>
            <CategoryWordManagement
              dictionaryId={dictionaryId}
              categoryId={categoryId}
              sourceCategoryIds={[parseInt(categoryId, 10)].filter(Boolean)}
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
