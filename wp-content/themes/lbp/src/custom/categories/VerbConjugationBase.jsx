import React, { useState } from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import { createGroupCheckHandlers, startLearningForGroup } from '../utils/groupHandlers';
import WordInput from '../components/WordInput';

/**
 * БАЗОВЫЙ КОМПОНЕНТ: Таблица спряжений глаголов
 * 
 * Принимает объект verbs с данными глаголов через пропсы
 */
const VerbConjugationBase = ({ verbs, ...props }) => {
  // Одна группа для всей таблицы
  const groupCheck = useGroupCheck();
  const groupWords = useGroupWords();
  
  // Состояние для значений полей ввода
  const [inputValues, setInputValues] = useState({});
  // Состояние для отслеживания, начато ли обучение для каждого глагола
  const [learningStarted, setLearningStarted] = useState({});
  
  return (
    <CategoryLayout {...props}>
      {({ 
        getWordPropsByText, 
        stats, 
        checkGroupWords, 
        getWordIdByText, 
        getWordProps, 
        getWord,
        words,
        dictionaryWordsById,
        userWordsData,
        displayStatuses,
        dictionaryId,
        editingWordId,
        onToggleEdit,
        onRefreshDictionaryWords,
        onRefreshUserData,
        formatTime,
        currentTime
      }) => {
        // isRevert: false = прямой перевод (lat→rus), true = обратный (rus→lat)
        // Для WordInput пользователь вводит латышское слово, поэтому нужно проверять само слово (isRevert: true)
        const handlers = createGroupCheckHandlers(groupWords, groupCheck, checkGroupWords, getWordIdByText, true);
        
        // Проверяем, находится ли слово в начальном состоянии (без попыток)
        const isWordInInitialState = (wordId) => {
          const userData = userWordsData[wordId];
          if (!userData) return true; // Если нет данных - считается начальным состоянием
          
          return (
            userData.mode_education === 0 &&
            userData.mode_education_revert === 0 &&
            userData.attempts === 0 &&
            userData.attempts_revert === 0 &&
            userData.correct_attempts === 0 &&
            userData.correct_attempts_revert === 0 &&
            (!userData.last_shown || userData.last_shown === '' || userData.last_shown === '0000-00-00 00:00:00') &&
            (!userData.last_shown_revert || userData.last_shown_revert === '' || userData.last_shown_revert === '0000-00-00 00:00:00')
          );
        };
        
        // Получаем все ID слов из массива слов
        const getWordIdsFromWords = (words) => {
          const wordIds = [];
          words.forEach(wordText => {
            const wordId = getWordIdByText(wordText);
            if (wordId) wordIds.push(wordId);
          });
          return wordIds;
        };
        
        // Проверяем, есть ли хотя бы одно слово с попытками
        const hasWordsWithAttempts = (words) => {
          const wordIds = getWordIdsFromWords(words);
          return wordIds.some(wordId => !isWordInInitialState(wordId));
        };
        
        // Функция для начала обучения
        const handleStartLearning = async (words, verbKey) => {
          const wordIds = getWordIdsFromWords(words);
          
          if (wordIds.length === 0) {
            console.warn('⚠️ Нет слов для начала обучения');
            return;
          }
          
          const success = await startLearningForGroup(wordIds, onRefreshUserData);
          if (success) {
            setLearningStarted(prev => ({ ...prev, [verbKey]: true }));
          }
        };
        
        // Получаем статистику для группы слов
        const getVerbStats = (words) => {
          const wordIds = getWordIdsFromWords(words);
          const total = wordIds.length;
          const learned = wordIds.filter(wordId => {
            const displayStatus = displayStatuses[wordId];
            return displayStatus && displayStatus.fullyLearned;
          }).length;
          return { total, learned };
        };
        
        
        // Обработчик изменения значения поля ввода
        const handleInputChange = (wordId, value) => {
          setInputValues(prev => ({ ...prev, [wordId]: value }));
          // Регистрируем слово в группе (groupWords.addWord принимает wordText)
          const word = dictionaryWordsById[wordId];
          if (word && word.word && !groupWords.words.includes(word.word)) {
            groupWords.addWord(word.word);
          }
          // Сохраняем ответ (используем wordId для groupCheck)
          groupCheck.setAnswer(wordId, value);
        };
        
        // Функция для получения пропсов слова для WordInput
        const getWordInputProps = (wordText) => {
          const wordId = getWordIdByText(wordText);
          if (!wordId) return null;
          
          const word = dictionaryWordsById[wordId];
          const userData = userWordsData[wordId];
          const displayStatus = displayStatuses[wordId];
          
          if (!word) return null;
          
          return {
            word,
            userData,
            displayStatus,
            formatTime,
            dictionaryId,
            editingWordId,
            onToggleEdit,
            onRefreshDictionaryWords,
            value: inputValues[wordId] || '',
            onChange: handleInputChange,
            highlightCorrect: groupCheck.results[wordId] === true,
            highlightIncorrect: groupCheck.results[wordId] === false,
          };
        };
        
        // Шаблон строк таблицы
        const pronouns = [
          { key: 'es', label: 'Es' },
          { key: 'tu', label: 'Tu' },
          { key: '3pers', label: '3 pers.' },
          { key: 'we', label: 'Mēs' },
          { key: 'you_pl', label: 'Jūs' },
        ];
        const tenses = ['past', 'present', 'future'];
        
        return (
          <WordProvider 
            getWordPropsByText={getWordPropsByText} 
            getWordIdByText={getWordIdByText}
            getWordProps={getWordProps}
            getWord={getWord}
          >
            <div className="verb-conjugation-category">
              {/* Заголовок */}
              <div className="category-header" style={{ marginBottom: '20px' }}>
                <h2>📚 {props.category.category_name}</h2>
                <div className="stats">
                  📚 Всего: <strong>{stats.total}</strong>
                  {' • '}
                  ✅ Изучено: <strong>{stats.learned}</strong>
                </div>
              </div>

              {/* Глаголы - удаляйте ненужные ключи из объекта verbs, ячейки останутся пустыми */}
              {Object.entries(verbs).map(([verbKey, verbData]) => {
                // Собираем все слова из объекта для статистики и кнопок
                const allWords = Object.values(verbData).filter(val => val !== verbData.name && val && val !== '-');
                
                // Если нет ни одного спряжения, не отображаем таблицу
                if (allWords.length === 0) {
                  return null;
                }
                
                const shouldShowStartLearning = !learningStarted[verbKey] && !hasWordsWithAttempts(allWords);
                
                return (
                  <div key={verbKey} className="verb-container">
                    <div className="verb-header">
                      <div className="verb-title">
                        <div className="verb-name">{verbData.name}</div>
                      </div>
                      <div className="verb-controls">
                        {shouldShowStartLearning ? (
                          <button onClick={() => handleStartLearning(allWords, verbKey)} className="btn-start-learning">📚 Начать обучение</button>
                        ) : (
                          <>
                            <button onClick={handlers.handleCheck} className="btn-check-group">✓ Проверить</button>
                            <button onClick={() => setInputValues({})} className="btn-reset-group">🔄 Очистить поля</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="verb-rows">
                      {pronouns.map((pronoun, pronounIndex) => {
                        // Проверяем, есть ли хотя бы одно спряжение для этого лица
                        const hasConjugations = tenses.some(tense => {
                          const key = `${pronoun.key}_${tense}`;
                          const wordText = verbData[key];
                          return wordText && wordText !== '-';
                        });

                        // Если нет ни одного спряжения для этого лица, не отображаем строку
                        if (!hasConjugations) {
                          return null;
                        }

                        return (
                          <div key={pronoun.key} className={pronounIndex % 2 === 0 ? 'verb-row' : 'verb-row verb-row-even'}>
                            <span className="verb-pronoun">{pronoun.label}</span>
                            <div className="verb-words">
                              {tenses.map(tense => {
                                const key = `${pronoun.key}_${tense}`;
                                const wordText = verbData[key];
                                if (!wordText || wordText === '-') {
                                  return <div key={key} className="word-input empty"></div>;
                                }
                                const inputProps = getWordInputProps(wordText);
                                return inputProps ? <WordInput key={key} {...inputProps} /> : <div key={key} className="word-input empty"></div>;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </WordProvider>
        );
      }}
    </CategoryLayout>
  );
};

export default VerbConjugationBase;

