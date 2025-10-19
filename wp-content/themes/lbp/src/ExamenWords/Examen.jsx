import axios from "axios";
import TrainingInterface from "../components/TrainingInterface";
import WordRow from "../components/WordRow";
import WordManagement from "../components/WordManagement";
import HelpModal from "../components/HelpModal";
import { getCustomCategoryComponent } from "../custom/config/customComponents";
import { normalizeString, getCooldownTime, formatTime as formatTimeHelper, getWordDisplayStatusExamen } from "../custom/utils/helpers";

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

  // Логируем ID для настройки кастомных компонентов
  useEffect(() => {
    console.log('📊 Examen - dictionaryId:', dictionaryId, 'categoryId:', categoryId);
  }, [dictionaryId, categoryId]);

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

  // Получить статус изучения для умного отображения
  const getWordDisplayStatus = (wordId) => {
    return getWordDisplayStatusExamen(userWordsData[wordId], currentTime);
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
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education, currentTime);
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert, currentTime);
      
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
      const directAvailable = userData.correct_attempts < 2 && !getCooldownTime(userData.last_shown, userData.correct_attempts, userData.mode_education, currentTime);
      const revertAvailable = userData.correct_attempts_revert < 2 && !getCooldownTime(userData.last_shown_revert, userData.correct_attempts_revert, userData.mode_education_revert, currentTime);
      
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

      {!trainingMode && (() => {
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
              />
            );
        });

        // Блок управления словами (только для админов)
        const wordManagementBlock = window.myajax && window.myajax.is_admin && categoryId !== 0 ? (
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
        ) : null;

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
          
          return (
            <ul className="words-education-list">
              {[...realWords, wordManagementBlock, separator, ...testRows].filter(Boolean)}
            </ul>
          );
        }

        return (
          <ul className="words-education-list">
            {realWords}
          </ul>
        );
      })()}
		</div>
	);
};

export default Examen;
