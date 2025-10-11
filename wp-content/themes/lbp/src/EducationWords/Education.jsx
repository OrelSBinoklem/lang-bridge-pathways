import axios from "axios";
import WordEditor from "../WordEditor";

const { useEffect, useState } = wp.element;

const Education = ({ categoryId, dictionaryId, userWordsData = {}, dictionaryWords = [], onRefreshUserData }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingWordId, setEditingWordId] = useState(null); // ID текущего редактируемого слова
  const [trainingMode, setTrainingMode] = useState(false); // Режим тренировки
  const [currentWord, setCurrentWord] = useState(null); // Текущее слово для тренировки
  const [userAnswer, setUserAnswer] = useState(''); // Ответ пользователя
  const [showResult, setShowResult] = useState(false); // Показать результат
  const [isCorrect, setIsCorrect] = useState(false); // Правильный ли ответ
  const [currentMode, setCurrentMode] = useState(null); // Текущий режим (прямой/обратный)

  const fetchWords = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("action", "get_words_by_category");
      formData.append("category_id", categoryId);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        setError(null);
        setWords(response.data.data);
      } else {
        throw new Error(response.data.message || "Ошибка получения слов");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем категории при монтировании компонента
  useEffect(() => {
    fetchWords();
  }, [categoryId]);

  const toggleEdit = (id) => {
    setEditingWordId((prevId) => (prevId === id ? null : id));
  };

  // Проверить, изучено ли слово (easy_correct ИЛИ easy_correct_revert = 1)
  const isWordLearned = (wordId) => {
    const userData = userWordsData[wordId];
    if (!userData) return false;
    
    // Если режим обучения отключен (easy_education = 0), считаем слово изученным
    if (userData.easy_education === 0) return true;
    
    // Если режим обучения включен, проверяем флаги правильных ответов
    // Показываем слово, если правильно ответили хотя бы в одном направлении
    return userData.easy_correct === 1 || userData.easy_correct_revert === 1;
  };

  // Получить статус изучения для умного отображения
  const getWordDisplayStatus = (wordId) => {
    const userData = userWordsData[wordId];
    
    // Если нет записи в БД, показываем все (слово не в тренировке)
    if (!userData) {
      return {
        showWord: true,
        showTranslation: true,
        fullyLearned: false
      };
    }
    
    // Если режим обучения отключен, показываем все
    if (userData.easy_education === 0) {
      return {
        showWord: true,
        showTranslation: true,
        fullyLearned: false // Не показываем индикатор "изучено" когда режим отключен
      };
    }
    
    // Если режим обучения включен, проверяем флаги
    const directLearned = userData.easy_correct === 1;
    const revertLearned = userData.easy_correct_revert === 1;
    
    return {
      showWord: directLearned, // Показываем слово только если изучен прямой перевод
      showTranslation: revertLearned, // Показываем перевод только если изучен обратный перевод
      fullyLearned: directLearned && revertLearned // Полностью изучено только если оба перевода
    };
  };

  // Получить слова для тренировки (easy_education = 1)
  const getTrainingWords = () => {
    console.log('getTrainingWords: categoryId =', categoryId);
    console.log('getTrainingWords: dictionaryWords.length =', dictionaryWords.length);
    console.log('getTrainingWords: userWordsData =', userWordsData);
    
    // Проверим структуру первого слова
    if (dictionaryWords.length > 0) {
      console.log('First word structure:', dictionaryWords[0]);
    }
    
    const categoryWords = dictionaryWords.filter(word => {
      if (categoryId === 0) return true;
      const categoryIdNum = parseInt(categoryId);
      console.log(`Checking word ${word.id}: category_ids =`, word.category_ids, 'type:', typeof word.category_ids);
      
      if (Array.isArray(word.category_ids)) {
        const hasCategory = word.category_ids.some(id => parseInt(id) === categoryIdNum);
        console.log(`Word ${word.id} has category ${categoryIdNum}:`, hasCategory);
        return hasCategory;
      }
      return false;
    });

    console.log('getTrainingWords: categoryWords.length =', categoryWords.length);

    const trainingWords = categoryWords.filter(word => {
      const userData = userWordsData[word.id];
      console.log(`Word ${word.id} (${word.word}): userData =`, userData);
      return userData && userData.easy_education === 1;
    });

    console.log('getTrainingWords: trainingWords.length =', trainingWords.length);
    return trainingWords;
  };

  // Начать тренировку
  const startTraining = () => {
    const trainingWords = getTrainingWords();
    if (trainingWords.length === 0) {
      alert('Нет слов для тренировки! Добавьте слова в легкое изучение.');
      return;
    }
    
    setTrainingMode(true);
    const randomWord = trainingWords[Math.floor(Math.random() * trainingWords.length)];
    setCurrentWord(randomWord);
    setCurrentMode(Math.random() < 0.5); // Фиксируем режим для этого слова
    setUserAnswer('');
    setShowResult(false);
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
      console.log('Comparing:', normalizedUserAnswer, 'vs', normalizedAnswer);
      return normalizedAnswer === normalizedUserAnswer;
    });

    console.log('User answer:', userAnswer);
    console.log('Correct answers:', correctAnswers);
    console.log('Result:', correct);

    setIsCorrect(correct);
    setShowResult(true);

    // Обновляем прогресс в базе данных при правильном ответе
    if (correct) {
      updateWordProgress(currentWord.id, currentMode);
    }

    // Устанавливаем фокус на кнопку "Следующее слово" после показа результата
    setTimeout(() => {
      const nextButton = document.querySelector('[data-next-word]');
      if (nextButton) {
        nextButton.focus();
      }
    }, 100);
  };

  // Обновить прогресс слова на сервере
  const updateWordProgress = async (wordId, isRevertMode) => {
    try {
      const formData = new FormData();
      formData.append("action", "update_word_progress");
      formData.append("word_id", wordId);
      formData.append("is_revert", isRevertMode ? 1 : 0);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        console.log('Прогресс обновлен успешно');
        // Обновляем локальные данные пользователя
        if (onRefreshUserData) {
          onRefreshUserData();
        }
      } else {
        console.error('Ошибка при обновлении прогресса:', response.data.message);
      }
    } catch (err) {
      console.error('Ошибка при отправке прогресса:', err.message);
    }
  };

  // Следующее слово
  const nextWord = () => {
    const trainingWords = getTrainingWords();
    if (trainingWords.length === 0) {
      setTrainingMode(false);
      return;
    }
    
    const randomWord = trainingWords[Math.floor(Math.random() * trainingWords.length)];
    setCurrentWord(randomWord);
    setCurrentMode(Math.random() < 0.5); // Новый режим для нового слова
    setUserAnswer('');
    setShowResult(false);

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
  };

  // Сбросить прогресс категории
  const resetCategoryProgress = async () => {
    if (!confirm('Вы уверены, что хотите сбросить прогресс этой категории? Все слова будут добавлены в легкое изучение.')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("action", "reset_category_progress");
      formData.append("category_id", categoryId);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        alert('Прогресс категории сброшен! Теперь можно начать тренировку.');
        // Обновляем данные пользователя
        if (onRefreshUserData) {
          onRefreshUserData();
        }
      } else {
        throw new Error(response.data.message || "Ошибка при сбросе прогресса");
      }
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  // Сбросить категорию из режима обучения
  const resetCategoryFromTraining = async () => {
    if (!confirm('Вы уверены, что хотите сбросить эту категорию из режима обучения? Все слова будут отключены от тренировки.')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("action", "reset_category_from_training");
      formData.append("category_id", categoryId);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        alert('Категория сброшена из режима обучения! Слова больше не участвуют в тренировке.');
        // Обновляем данные пользователя
        if (onRefreshUserData) {
          onRefreshUserData();
        }
      } else {
        throw new Error(response.data.message || "Ошибка при сбросе категории");
      }
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  // Компонент тренировки
  const renderTrainingInterface = () => {
    if (!currentWord) return null;

    return (
      <div className="training-interface">
        <h3 className="training-title">
          {currentMode ? 'Переведите на латышский:' : 'Переведите на русский:'}
        </h3>
        
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
              onClick={resetCategoryProgress}
              className="training-reset-button"
            >
              📚 Режим обучения
            </button>
            
            <button
              onClick={resetCategoryFromTraining}
              className="training-clear-button"
            >
              🚫 Сбросить
            </button>
          </div>
        </div>
      )}

      {trainingMode && renderTrainingInterface()}

      {loading && <p>Загрузка слов...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      {!loading && !error && !trainingMode && (
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
                    {displayStatus.showWord ? (
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
                    {userData && userData.easy_education === 1 && (
                     <span className={`words-progress-indicator ${
                        displayStatus.fullyLearned ? 'fully-learned' : 
                        displayStatus.showWord || displayStatus.showTranslation ? 'partially-learned' : 'not-learned'
                      }`}>
                        {displayStatus.fullyLearned ? "✅" : 
                         displayStatus.showWord || displayStatus.showTranslation ? '✅' : 
                         <span dangerouslySetInnerHTML={{__html: '&mdash;'}} />}&nbsp;&nbsp;
                      </span>
                   ) || <span>&nbsp;&nbsp;&mdash;&nbsp;&nbsp;</span>}
                    {displayStatus.showTranslation ? (
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
                  {word.translation_2 && (
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
                  {word.translation_3 && (
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

export default Education;
