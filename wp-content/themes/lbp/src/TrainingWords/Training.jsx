import axios from "axios";
import WordEditor from "../WordEditor";

const { useEffect, useState } = wp.element;

const Training = ({ categoryId, dictionaryId, userWordsData = {}, dictionaryWords = [], onRefreshUserData }) => {
  const [editingWordId, setEditingWordId] = useState(null); // ID текущего редактируемого слова
  const [trainingMode, setTrainingMode] = useState(false); // Режим тренировки
  const [currentWord, setCurrentWord] = useState(null); // Текущее слово для тренировки
  const [userAnswer, setUserAnswer] = useState(''); // Ответ пользователя
  const [showResult, setShowResult] = useState(false); // Показать результат
  const [isCorrect, setIsCorrect] = useState(false); // Правильный ли ответ
  const [currentMode, setCurrentMode] = useState(null); // Текущий режим (прямой/обратный)
  const [attemptCount, setAttemptCount] = useState(0); // Счетчик попыток для текущего слова
  const [currentTime, setCurrentTime] = useState(Date.now()); // Для обновления таймеров

  // Обновляем текущее время каждую секунду для таймеров
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleEdit = (id) => {
    setEditingWordId((prevId) => (prevId === id ? null : id));
  };

  // Рассчитать оставшееся время отката
  const getCooldownTime = (lastShown, correctAttempts) => {
    if (!lastShown) return null;
    
    const lastShownTime = new Date(lastShown).getTime();
    const now = Date.now();
    const elapsed = now - lastShownTime;
    
    // Откат зависит от того, сколько баллов было ДО получения нового:
    // 0 баллов → 1 балл: 30 минут
    // 1 балл → 2 балла: 20 часов
    // Восстановление после ошибки: 30 минут
    let cooldownDuration;
    
    if (correctAttempts <= 1) {
      // Если сейчас 0 или 1 балл, значит откат был 30 минут (для получения 1-го балла)
      cooldownDuration = 30 * 60 * 1000; // 30 минут
    } else {
      // Если сейчас 2+ балла, значит откат был 20 часов (для получения 2-го балла)
      cooldownDuration = 20 * 60 * 60 * 1000; // 20 часов
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
        showWord: true,
        showTranslation: false,
        fullyLearned: false,
        hasAttempts: false,
        cooldownDirect: null,
        cooldownRevert: null
      };
    }
    
    // Проверяем откаты
    const cooldownDirect = getCooldownTime(userData.last_shown, userData.correct_attempts);
    const cooldownRevert = getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert);
    
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
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts);
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert);
      
      if (directAvailable && revertAvailable) {
        mode = Math.random() < 0.5;
      } else if (directAvailable) {
        mode = false; // Прямой перевод
      } else {
        mode = true; // Обратный перевод
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

  // Проверить ответ
  const checkAnswer = () => {
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

  // Следующее слово
  const nextWord = () => {
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
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts);
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert);
      
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

  // Завершить тренировку
  const finishTraining = () => {
    setTrainingMode(false);
    setCurrentWord(null);
    setUserAnswer('');
    setShowResult(false);
    setAttemptCount(0);
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

  // Компонент тренировки
  const renderTrainingInterface = () => {
    if (!currentWord) return null;
    
    const userData = userWordsData[currentWord.id];
    const inEducationMode = currentMode ? userData?.mode_education_revert : userData?.mode_education;

		return (
      <div className="training-interface">
        <h3 className="training-title">
          {currentMode ? 'Переведите на латышский:' : 'Переведите на русский:'}
        </h3>
        
        {inEducationMode && (
          <div style={{ color: '#ff9800', marginBottom: '10px', fontWeight: 'bold' }}>
            📚 Режим обучения: продолжайте пытаться!
          </div>
        )}
        
        <div className="training-word-display">
          {currentMode ? currentWord.translation_1 : currentWord.word}
        </div>

        <input
          data-training-input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !showResult && checkAnswer()}
          placeholder="Введите ваш ответ..."
          autoFocus
          className="training-input"
          disabled={showResult}
        />

        {!showResult ? (
          <button
            onClick={checkAnswer}
            disabled={!userAnswer.trim()}
            className="training-button"
          >
            Проверить
          </button>
        ) : (
			<div>
            <div className={`training-result ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✅ Правильно!' : '❌ Неправильно'}
            </div>
            
            {!isCorrect && (
              <div className="training-correct-answer">
                Правильный ответ: {currentMode ? currentWord.word : currentWord.translation_1}
              </div>
            )}

            <div className="training-controls">
              <button
                data-next-word
                onClick={nextWord}
                onKeyPress={(e) => e.key === 'Enter' && nextWord()}
                tabIndex={0}
                className="training-next-button"
              >
                Следующее слово
              </button>
              
              <button
                onClick={finishTraining}
                onKeyPress={(e) => e.key === 'Enter' && finishTraining()}
                tabIndex={1}
                className="training-finish-button"
              >
                Завершить
              </button>
            </div>
          </div>
        )}
			</div>
		);
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

      {trainingMode && renderTrainingInterface()}

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

            return categoryWords.map((word) => {
              const displayStatus = getWordDisplayStatus(word.id);
              const userData = userWordsData[word.id];
              
              return (
                <li key={word.id}>
                  {/* Слово */}
                  <span className="words-education-list__word">
                    {displayStatus.cooldownDirect ? (
                      <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                        ⏱️ {formatTime(displayStatus.cooldownDirect)}
                      </span>
                    ) : displayStatus.showWord ? (
                      word.word
                    ) : (
                      <span className="words-hidden-text">
                        {word.word.split('').map((char, index) => 
                          char === ' ' ? ' ' : '█ '
                        ).join('')}
                      </span>
                    )}
                  </span>
                  
                  {/* Перевод 1 */}
                  <span className="words-education-list__translation_1">
                    {userData && displayStatus.hasAttempts ? (
                     <span className={`words-progress-indicator ${
                        displayStatus.fullyLearned ? 'fully-learned' : 
                        (userData.correct_attempts >= 2 || userData.correct_attempts_revert >= 2) ? 'partially-learned' : 'not-learned'
                      }`}>
                        {displayStatus.fullyLearned ? <span className="checkmark-icon"></span> : 
                         (userData.correct_attempts >= 2 || userData.correct_attempts_revert >= 2) ? <span className="checkmark-icon"></span> : 
                         <span dangerouslySetInnerHTML={{__html: '&mdash;'}} />}&nbsp;&nbsp;
                      </span>
                   ) : <span>&nbsp;&nbsp;&mdash;&nbsp;&nbsp;</span>}
                    {displayStatus.cooldownRevert ? (
                      <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                        ⏱️ {formatTime(displayStatus.cooldownRevert)}
                      </span>
                    ) : displayStatus.showTranslation ? (
                      word.translation_1
                    ) : (
                      <span className="words-hidden-text">
                        {word.translation_1.split('').map((char, index) => 
                          char === ' ' ? ' ' : '█ '
                        ).join('')}
                      </span>
                    )}
                  </span>
                  
                  {/* Перевод 2 */}
                  {word.translation_2 && !displayStatus.cooldownRevert && (
                    <span className="words-education-list__translation_2">
                      , {displayStatus.showTranslation ? (
                        word.translation_2
                      ) : (
                        <span className="words-hidden-text">
                          {word.translation_2.split('').map((char, index) => 
                            char === ' ' ? ' ' : '█ '
                          ).join('')}
                        </span>
                      )}
                    </span>
                  )}
                  
                  {/* Перевод 3 */}
                  {word.translation_3 && !displayStatus.cooldownRevert && (
                    <span className="words-education-list__translation_3">
                      , {displayStatus.showTranslation ? (
                        word.translation_3
                      ) : (
                        <span className="words-hidden-text">
                          {word.translation_3.split('').map((char, index) => 
                            char === ' ' ? ' ' : '█ '
                          ).join('')}
                        </span>
                      )}
                    </span>
                  )}

                  {window.myajax && window.myajax.is_admin && (
                    <button
                      className="edit-button"
                      style={{ marginLeft: "10px" }}
                      onClick={() => toggleEdit(word.id)}
                    >
                      ✏️
                    </button>
                  )}

                  {editingWordId === word.id && (
                    <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #ccc" }}>
                      <WordEditor dictionaryId={dictionaryId} word={word} />
                    </div>
                  )}
                </li>
              );
            });
          })()}
        </ul>
      )}
		</div>
	);
};

export default Training;
