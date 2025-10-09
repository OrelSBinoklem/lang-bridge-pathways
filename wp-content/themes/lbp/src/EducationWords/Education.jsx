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

  // Проверить, изучено ли слово (easy_correct И easy_correct_revert = 1)
  const isWordLearned = (wordId) => {
    const userData = userWordsData[wordId];
    if (!userData) return false;
    
    // Если режим обучения отключен (easy_education = 0), считаем слово изученным
    if (userData.easy_education === 0) return true;
    
    // Если режим обучения включен, проверяем флаги правильных ответов
    return userData.easy_correct === 1 && userData.easy_correct_revert === 1;
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

    // TODO: Здесь будет обновление прогресса в базе данных
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

  // Компонент тренировки
  const renderTrainingInterface = () => {
    if (!currentWord) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        zIndex: 1000,
        minWidth: '400px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          {currentMode ? 'Переведите на латышский:' : 'Переведите на русский:'}
        </h3>
        
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '2px solid #dee2e6'
        }}>
          {currentMode ? currentWord.translation_1 : currentWord.word}
        </div>

        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !showResult && checkAnswer()}
          placeholder="Введите ваш ответ..."
          autoFocus
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            marginBottom: '15px'
          }}
          disabled={showResult}
        />

        {!showResult ? (
          <button
            onClick={checkAnswer}
            disabled={!userAnswer.trim()}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: userAnswer.trim() ? 'pointer' : 'not-allowed',
              opacity: userAnswer.trim() ? 1 : 0.6
            }}
          >
            Проверить
          </button>
        ) : (
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '15px',
              color: isCorrect ? '#28a745' : '#dc3545'
            }}>
              {isCorrect ? '✅ Правильно!' : '❌ Неправильно'}
            </div>
            
            {!isCorrect && (
              <div style={{ marginBottom: '15px', color: '#666' }}>
                Правильный ответ: {currentMode ? currentWord.word : currentWord.translation_1}
              </div>
            )}

            <div>
              <button
                onClick={nextWord}
                onKeyPress={(e) => e.key === 'Enter' && nextWord()}
                tabIndex={0}
                style={{
                  padding: '10px 20px',
                  marginRight: '10px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Следующее слово
              </button>
              
              <button
                onClick={finishTraining}
                onKeyPress={(e) => e.key === 'Enter' && finishTraining()}
                tabIndex={1}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
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
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={startTraining}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: 'linear-gradient(135deg, #28a745, #20c997)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
            }}
          >
            🎯 Начать тренировку
          </button>
          
          <button
            onClick={resetCategoryProgress}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: 'linear-gradient(135deg, #dc3545, #c82333)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)'
            }}
          >
            🔄 Сбросить прогресс категории
          </button>
        </div>
      )}

      {trainingMode && renderTrainingInterface()}

      {loading && <p>Загрузка слов...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      {!loading && !error && !trainingMode && (
        <ul className="words-education-list">
          {words.map((word) => {
            const learned = isWordLearned(word.id);
            return (
              <li key={word.id}>
                {learned ? (
                  <>
                    <span className="words-education-list__word">{word.word}</span>
                    <span className="words-education-list__translation_1">&nbsp;&mdash; {word.translation_1}</span>
                    {word.translation_2 && <span className="words-education-list__translation_2">, {word.translation_2}</span>}
                    {word.translation_3 && <span className="words-education-list__translation_3">, {word.translation_3}</span>}
                  </>
                ) : (
                  <>
                    <span className="words-education-list__word" style={{color: '#ccc'}}>
                      {word.word.split('').map((char, index) => 
                        char === ' ' ? ' ' : '█ '
                      ).join('')}
                    </span>
                    <span className="words-education-list__translation_1" style={{color: '#ccc'}}>&nbsp;- {word.translation_1.split('').map((char, index) => char === ' ' ? ' ' : '█ ').join('')}</span>
                    {word.translation_2 && <span className="words-education-list__translation_2" style={{color: '#ccc'}}>, {word.translation_2.split('').map((char, index) => char === ' ' ? ' ' : '█ ').join('')}</span>}
                    {word.translation_3 && <span className="words-education-list__translation_3" style={{color: '#ccc'}}>, {word.translation_3.split('').map((char, index) => char === ' ' ? ' ' : '█ ').join('')}</span>}
                  </>
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
          })}
        </ul>
      )}
    </div>
  );
};

export default Education;
