import React, { useState } from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
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

  return (
    <CategoryLayout {...props}>
      {({ 
        getWordPropsByText, 
        stats, 
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
        const tenseLabels = {
          past: 'pagadne',
          present: 'tagadne',
          future: 'nakotne',
        };
        
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
                const allWords = Object.values(verbData).filter(val => val !== verbData.name && val && val !== '-');
                
                // Если нет ни одного спряжения, не отображаем таблицу
                if (allWords.length === 0) {
                  return null;
                }
                
                return (
                  <div key={verbKey} className="verb-container">
                    <div className="verb-header">
                      <div className="verb-title">
                        <div className="verb-name">{verbData.name}</div>
                      </div>
                    </div>
                    <div className="verb-rows">
                      <div className="verb-rows__desktop">
                        {pronouns.map((pronoun, pronounIndex) => {
                          const hasConjugations = tenses.some((tense) => {
                            const key = `${pronoun.key}_${tense}`;
                            const wordText = verbData[key];
                            return wordText && wordText !== '-';
                          });
                          if (!hasConjugations) return null;

                          return (
                            <div
                              key={pronoun.key}
                              className={pronounIndex % 2 === 0 ? 'verb-row' : 'verb-row verb-row-even'}
                            >
                              <span className="verb-pronoun">{pronoun.label}</span>
                              <div className="verb-words">
                                {tenses.map((tense) => {
                                  const key = `${pronoun.key}_${tense}`;
                                  const wordText = verbData[key];
                                  if (!wordText || wordText === '-') {
                                    return <div key={key} className="word-input empty" />;
                                  }
                                  const inputProps = getWordInputProps(wordText);
                                  return (
                                    <div key={key} className="verb-word-field">
                                      {inputProps ? (
                                        <WordInput {...inputProps} />
                                      ) : (
                                        <div className="word-input empty" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="verb-rows__mobile">
                        {tenses.map((tense) => {
                          const rows = pronouns
                            .map((pronoun) => {
                              const key = `${pronoun.key}_${tense}`;
                              const wordText = verbData[key];
                              if (!wordText || wordText === '-') return null;
                              const inputProps = getWordInputProps(wordText);
                              return { pronoun, key, inputProps };
                            })
                            .filter(Boolean);

                          if (rows.length === 0) return null;

                          return (
                            <section key={tense} className="verb-tense-group">
                              <h4 className="verb-tense-group__heading">{tenseLabels[tense]}</h4>
                              {rows.map(({ pronoun, key, inputProps }) => (
                                <div key={key} className="verb-tense-block">
                                  <span className="verb-pronoun">{pronoun.label}</span>
                                  <div className="verb-tense-stack">
                                    {inputProps ? (
                                      <WordInput {...inputProps} />
                                    ) : (
                                      <div className="word-input empty" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </section>
                          );
                        })}
                      </div>
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

