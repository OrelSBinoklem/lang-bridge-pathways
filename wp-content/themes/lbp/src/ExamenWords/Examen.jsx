import axios from "axios";
import TrainingInterface from "../components/TrainingInterface";
import WordRow from "../components/WordRow";
import HelpModal from "../components/HelpModal";

// Тестовые данные для отладки (закомментируйте следующую строку в production)
import { testWords, testUserData, testDisplayStatuses, additionalTestWords } from "./testData";
const ENABLE_TEST_DATA = true; // Установите false, чтобы отключить тестовые строки

const { useEffect, useState } = wp.element;

const Examen = ({ categoryId, dictionaryId, userWordsData = {}, dictionaryWords = [], onRefreshUserData, onRefreshDictionaryWords }) => {
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

  // Рассчитать оставшееся время отката
  const getCooldownTime = (lastShown, correctAttempts, modeEducation = 0) => {
    if (!lastShown) return null;
    
    const lastShownTime = new Date(lastShown).getTime();
    const now = Date.now();
    const elapsed = now - lastShownTime;
    
    // Откат зависит от того, сколько баллов было ДО получения нового:
    // 0 баллов → 1 балл: 30 минут
    // 1 балл → 2 балла: 20 часов
    // Восстановление после ошибки: 30 минут
    let cooldownDuration;
    
    if (correctAttempts === 0) {
      // Если 0 баллов, отката нет
      return null;
    } else if (correctAttempts === 1) {
      // Если сейчас 1 балл
      if (modeEducation === 0) {
        // Ответили правильно с первого раза → откат 20 часов
        cooldownDuration = 20 * 60 * 60 * 1000; // 20 часов
      } else {
        // В режиме обучения ответили правильно → откат 30 минут
        cooldownDuration = 30 * 60 * 1000; // 30 минут
      }
    } else if (correctAttempts >= 2) {
      // Если сейчас 2+ балла, слово выучено, отката нет
      return null;
    }
    
    const remaining = cooldownDuration - elapsed;
    
    if (remaining <= 0) return null;
    
    return remaining;
  };

  // Форматировать время в часы:минуты
  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  // Проверить, изучено ли слово (correct_attempts >= 2 ИЛИ correct_attempts_revert >= 2)
  const isWordLearned = (wordId) => {
    const userData = userWordsData[wordId];
    if (!userData) return false;
    
    // Показываем слово, если правильно ответили >= 2 раз хотя бы в одном направлении
    return userData.correct_attempts >= 2 || userData.correct_attempts_revert >= 2;
  };

  // Получить статус изучения для умного отображения
  const getWordDisplayStatus = (wordId) => {
    const userData = userWordsData[wordId];
    
    // Если нет записи в БД, показываем слово, скрываем перевод
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
    
    // Проверяем откаты
    const cooldownDirect = getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education);
    const cooldownRevert = getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert);
    
    // Проверяем количество правильных ответов
    const directLearned = userData.correct_attempts >= 2;
    const revertLearned = userData.correct_attempts_revert >= 2;
    const hasAnyAttempts = userData.attempts > 0 || userData.attempts_revert > 0;
    
    return {
      showWord: directLearned, // Показываем слово ТОЛЬКО если >= 2 балла
      showTranslation: revertLearned, // Показываем перевод ТОЛЬКО если >= 2 балла
      fullyLearned: directLearned && revertLearned, // Полностью изучено только если оба >= 2
      hasAttempts: hasAnyAttempts,
      cooldownDirect: cooldownDirect,
      cooldownRevert: cooldownRevert,
      modeEducation: userData.mode_education,
      modeEducationRevert: userData.mode_education_revert
    };
  };

  // Получить слова для тренировки (те, которые еще не изучены полностью и откат закончен)
  const getTrainingWords = () => {
    const categoryWords = dictionaryWords.filter(word => {
      if (categoryId === 0) return true;
      const categoryIdNum = parseInt(categoryId);
      
      if (Array.isArray(word.category_ids)) {
        return word.category_ids.some(id => parseInt(id) === categoryIdNum);
      }
      return false;
    });

    const trainingWords = categoryWords.filter(word => {
      const displayStatus = getWordDisplayStatus(word.id);
      // Включаем в тренировку только слова без активного отката и не полностью изученные
      return !displayStatus.fullyLearned && !displayStatus.cooldownDirect && !displayStatus.cooldownRevert;
    });

    return trainingWords;
  };

  // Начать тренировку
  const startTraining = () => {
    // Проверяем авторизацию
    if (!window.myajax || !window.myajax.is_logged_in) {
      alert('Для тренировки необходимо войти в систему');
      return;
    }
    
    const trainingWords = getTrainingWords();
    if (trainingWords.length === 0) {
      alert('Нет доступных слов для тренировки! Все слова либо изучены, либо на откате.');
      return;
    }
    
    setTrainingMode(true);
    const randomWord = trainingWords[Math.floor(Math.random() * trainingWords.length)];
    setCurrentWord(randomWord);
    
    // Определяем режим тренировки (прямой или обратный) на основе статуса слова
    const userData = userWordsData[randomWord.id];
    let mode;
    
    if (!userData) {
      // Если нет данных, начинаем с прямого перевода (показываем слово)
      mode = false;
    } else {
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education);
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert);
      
      if (directAvailable && revertAvailable) {
        mode = Math.random() < 0.5;
      } else if (directAvailable) {
        mode = false; // Прямой перевод
      } else if (revertAvailable) {
        mode = true; // Обратный перевод
      } else {
        // Если оба недоступны, выбираем случайно
        mode = Math.random() < 0.5;
      }
    }
    
    setCurrentMode(mode);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
  };

  // Нормализация строки для сравнения (убирает диакритические знаки)
  const normalizeString = (str) => {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD') // Разделяет символы и диакритические знаки
      .replace(/[\u0300-\u036f]/g, '') // Удаляет диакритические знаки
      .replace(/\s+/g, ' '); // Нормализует пробелы
  };


  // Обновить попытки слова на сервере
  const updateWordAttempts = async (wordId, isRevertMode, isCorrect) => {
    try {
			const formData = new FormData();
      formData.append("action", "update_word_attempts");
      formData.append("word_id", wordId);
      formData.append("is_revert", isRevertMode ? 1 : 0);
      formData.append("is_correct", isCorrect ? 1 : 0);

			const response = await axios.post(window.myajax.url, formData);

			if (response.data.success) {
        console.log('Попытка записана успешно');
        // Обновляем локальные данные пользователя
        if (onRefreshUserData) {
          onRefreshUserData();
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
    console.log('resetCategoryFromTraining вызвана, categoryId:', categoryId);
    
    if (!confirm('Вы уверены, что хотите сбросить эту категорию из тренировки? Все слова будут отключены от тренировки.')) {
      console.log('Пользователь отменил операцию');
      return;
    }

    console.log('Отправляем AJAX запрос...');
    try {
      const formData = new FormData();
      formData.append("action", "reset_training_category");
      formData.append("category_id", categoryId);

      console.log('Данные для отправки:', {
        action: "reset_training_category",
        category_id: categoryId,
        url: window.myajax?.url
      });

      const response = await axios.post(window.myajax.url, formData);

      console.log('Ответ сервера:', response.data);

      if (response.data.success) {
        alert('Данные категории сброшены! Все тренировочные данные обнулены.');
        // Обновляем данные пользователя
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

  // Обработчики для TrainingInterface
  const handleCheckAnswer = () => {
    if (!currentWord || !userAnswer.trim()) return;

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
    }

    const normalizedUserAnswer = normalizeString(userAnswer);
    
    correct = correctAnswers.some(answer => {
      const normalizedAnswer = normalizeString(answer);
      return normalizedAnswer === normalizedUserAnswer;
    });

    setIsCorrect(correct);
    setShowResult(true);

    // Обновляем прогресс в базе данных
    updateWordAttempts(currentWord.id, currentMode, correct);
    
    // Увеличиваем счетчик попыток
    setAttemptCount(prev => prev + 1);

    // Устанавливаем фокус на кнопку "Следующее слово" после показа результата
    setTimeout(() => {
      const nextButton = document.querySelector('[data-next-word]');
      if (nextButton) {
        nextButton.focus();
      }
    }, 100);
  };

  const handleNextWord = () => {
    const trainingWords = getTrainingWords();
    if (trainingWords.length === 0) {
      setTrainingMode(false);
      alert('Отлично! Все доступные слова тренированы!');
      return;
    }
    
    const randomWord = trainingWords[Math.floor(Math.random() * trainingWords.length)];
    setCurrentWord(randomWord);
    
    // Определяем режим тренировки
    const userData = userWordsData[randomWord.id];
    let mode;
    
    if (!userData) {
      mode = false;
    } else {
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education);
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert);
      
      if (directAvailable && revertAvailable) {
        mode = Math.random() < 0.5;
      } else if (directAvailable) {
        mode = false;
      } else {
        mode = true;
      }
    }
    
    setCurrentMode(mode);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);

    // Возвращаем фокус на поле ввода после рендера
    setTimeout(() => {
      const inputField = document.querySelector('[data-training-input]');
      if (inputField) {
        inputField.focus();
      }
    }, 100);
  };

  const handleFinishTraining = () => {
    setTrainingMode(false);
    setCurrentWord(null);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
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
          
          <div className="training-control-buttons">
            <button
              onClick={() => setShowHelp(true)}
              className="training-help-button"
              title="Показать справку"
            >
              ❓ Справка
            </button>
            
            <button
              onClick={() => {
                console.log('Кнопка сброса нажата!');
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
          inEducationMode={(() => {
            const userData = userWordsData[currentWord?.id];
            return currentMode ? userData?.mode_education_revert : userData?.mode_education;
          })()}
        />
      )}

      {!trainingMode && (
        <ul className="words-education-list">
          {(() => {
            // Фильтруем слова по категории из dictionaryWords
            const categoryWords = dictionaryWords.filter(word => {
              if (categoryId === 0) return true;
              const categoryIdNum = parseInt(categoryId);
              if (Array.isArray(word.category_ids)) {
                return word.category_ids.some(id => parseInt(id) === categoryIdNum);
              }
              return false;
            });

            const realWords = categoryWords.map((word) => {
              const displayStatus = getWordDisplayStatus(word.id);
              const userData = userWordsData[word.id];
              
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
                  mode="examen"
                />
              );
            });

            // Тестовые строки для отладки (можно удалить в production)
            console.log('window.myajax', window.myajax);
            if (ENABLE_TEST_DATA && window.myajax && window.myajax.is_admin) {
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
              
              return [...realWords, separator, ...testRows];
            }

            return realWords;
          })()}
        </ul>
      )}
		</div>
	);
};

export default Examen;
