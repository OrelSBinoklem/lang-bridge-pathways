import axios from "axios";
import TrainingInterface from "../components/TrainingInterface";
import WordRow from "../components/WordRow";
import WordManagement from "../components/WordManagement";
import { getCustomCategoryComponent } from "../custom/config/customComponents";
import { normalizeString, getWordDisplayStatusEducation } from "../custom/utils/helpers";

const { useEffect, useState } = wp.element;

const Education = ({ categoryId, dictionaryId, userWordsData = {}, dictionaryWords = [], onRefreshUserData, onRefreshDictionaryWords }) => {
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
      
      // Логируем ID для настройки кастомных компонентов
      console.log('📊 Education - dictionaryId:', dictionaryId, 'categoryId:', categoryId);
      
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
    return getWordDisplayStatusEducation(userWordsData[wordId]);
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
    // Проверяем авторизацию
    if (!window.myajax || !window.myajax.is_logged_in) {
      alert('Для тренировки необходимо войти в систему');
      return;
    }
    
    const trainingWords = getTrainingWords();
    if (trainingWords.length === 0) {
      alert('Переведите слова в "Режим обучения", сейчас они отображаются по умолчанию чтобы вы могли просто на них посмотреть, в этом вообще главный смысл раздела "Изучение".');
      return;
    }
    
    setTrainingMode(true);
    const randomWord = trainingWords[Math.floor(Math.random() * trainingWords.length)];
    setCurrentWord(randomWord);
    setCurrentMode(Math.random() < 0.5); // Фиксируем режим для этого слова
    setUserAnswer('');
    setShowResult(false);
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
      
      // Добавляем дополнительные варианты из translation_input_variable
      if (currentWord.translation_input_variable && currentWord.translation_input_variable.trim()) {
        const additionalVariants = currentWord.translation_input_variable
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0);
        console.log('🔍 translation_input_variable:', currentWord.translation_input_variable);
        console.log('🔍 Additional variants:', additionalVariants);
        correctAnswers.push(...additionalVariants);
      }
    }

    console.log('📝 Current word object:', currentWord);
    console.log('✅ All correct answers:', correctAnswers);
    console.log('👤 User answer (raw):', userAnswer);

    const normalizedUserAnswer = normalizeString(userAnswer);
    console.log('👤 User answer (normalized):', normalizedUserAnswer);
    
    correct = correctAnswers.some(answer => {
      const normalizedAnswer = normalizeString(answer);
      console.log('🔄 Comparing:', `"${normalizedUserAnswer}"`, 'vs', `"${normalizedAnswer}"`);
      return normalizedAnswer === normalizedUserAnswer;
    });

    console.log('🎯 Result:', correct);

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

  const handleNextWord = () => {
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

  const handleFinishTraining = () => {
    setTrainingMode(false);
    setCurrentWord(null);
    setUserAnswer('');
    setShowResult(false);
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
        />
      )}

      {loading && <p>Загрузка слов...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      {!loading && !error && !trainingMode && (() => {
        // Фильтруем слова по категории из dictionaryWords
        const categoryWords = dictionaryWords.filter(word => {
          if (categoryId === 0) return true;
          const categoryIdNum = parseInt(categoryId);
          if (Array.isArray(word.category_ids)) {
            return word.category_ids.some(id => parseInt(id) === categoryIdNum);
          }
          return false;
        });

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
              mode="education"
            />
          );
        }

        // Стандартный список слов
        return (
          <ul className="words-education-list">
            {categoryWords.map((word) => {
              const displayStatus = getWordDisplayStatus(word.id);
              const userData = userWordsData[word.id];
              
              return (
                <WordRow
                  key={word.id}
                  word={word}
                  userData={userData}
                  displayStatus={displayStatus}
                  dictionaryId={dictionaryId}
                  editingWordId={editingWordId}
                  onToggleEdit={toggleEdit}
                  onRefreshDictionaryWords={onRefreshDictionaryWords}
                  onDeleteWord={handleDeleteWord}
                  mode="education"
                />
              );
            })}
            
            {/* Блок управления словами (только для админов) */}
            {window.myajax && window.myajax.is_admin && categoryId !== 0 && (
              <li key="word-management" style={{ 
                margin: '20px 0', 
                padding: '15px', 
                backgroundColor: '#e8f5e9', 
                border: '2px solid #4CAF50', 
                borderRadius: '5px',
                listStyle: 'none'
              }}>
                <WordManagement 
                  dictionaryId={dictionaryId}
                  categoryId={categoryId}
                  onWordsChanged={onRefreshDictionaryWords}
                />
              </li>
            )}
          </ul>
        );
      })()}
    </div>
  );
};

export default Education;
