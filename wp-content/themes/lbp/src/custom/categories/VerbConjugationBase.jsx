import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import WordInput from '../components/WordInput';
import { getEligibleRevertTrainingWordIds, getVisibleWordsFromVerbTable } from '../utils/helpers';

const pickRandom = (ids) => {
  if (!ids.length) return null;
  return ids[Math.floor(Math.random() * ids.length)];
};

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

const VerbConjugationContent = ({
  verbs,
  categoryProps,
  inlineTrainingActive,
  onInlineTrainingComplete,
  getWordPropsByText,
  stats,
  getWordIdByText,
  getWordProps,
  getWord,
  dictionaryWordsById,
  userWordsData,
  displayStatuses,
  dictionaryId,
  editingWordId,
  onToggleEdit,
  onRefreshDictionaryWords,
  formatTime,
  currentTime,
  checkGroupWords,
}) => {
  const groupCheck = useGroupCheck();
  const groupWords = useGroupWords();
  const [inputValues, setInputValues] = useState({});
  const [activeWordId, setActiveWordId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [advanceToken, setAdvanceToken] = useState(0);
  const lastSubmitRef = useRef({ wordId: null, isCorrect: null });
  const userWordsDataRef = useRef(userWordsData);
  const currentTimeRef = useRef(currentTime);
  const visibleWordsRef = useRef([]);
  const visibleWordIdsRef = useRef(new Set());
  const onCompleteRef = useRef(onInlineTrainingComplete);

  // Только слова из непустых ячеек таблицы (необычные формы), не вся категория
  const visibleWords = useMemo(
    () => getVisibleWordsFromVerbTable(verbs, getWordIdByText, dictionaryWordsById),
    [verbs, getWordIdByText, dictionaryWordsById]
  );

  const visibleWordIds = useMemo(
    () => new Set(visibleWords.map((w) => w.id)),
    [visibleWords]
  );

  userWordsDataRef.current = userWordsData;
  currentTimeRef.current = currentTime;
  visibleWordsRef.current = visibleWords;
  visibleWordIdsRef.current = visibleWordIds;
  onCompleteRef.current = onInlineTrainingComplete;

  const pickNextActiveWordId = useCallback(() => {
    const eligible = getEligibleRevertTrainingWordIds(
      visibleWordsRef.current,
      userWordsDataRef.current,
      currentTimeRef.current
    ).filter((id) => visibleWordIdsRef.current.has(id));
    return pickRandom(eligible);
  }, []);

  const pickNextRef = useRef(pickNextActiveWordId);
  pickNextRef.current = pickNextActiveWordId;

  useEffect(() => {
    if (!inlineTrainingActive) {
      setActiveWordId(null);
      setAdvanceToken(0);
      return;
    }
    groupCheck.reset();
    const nextId = pickNextRef.current();
    if (!nextId) {
      onInlineTrainingComplete?.();
      alert('Нет доступных слов для тренировки! Все формы в таблице либо изучены, либо на откате.');
      return;
    }
    setActiveWordId(nextId);
    setInputValues((prev) => ({ ...prev, [nextId]: '' }));
  }, [inlineTrainingActive]);

  useEffect(() => {
    if (!inlineTrainingActive || !activeWordId) return;
    requestAnimationFrame(() => {
      const el = document.querySelector('.verb-conjugation-category--training .word-input--field-active');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [activeWordId, inlineTrainingActive]);

  // Переключение только после ответа (advanceToken), не при тике таймеров
  useEffect(() => {
    if (!inlineTrainingActive || advanceToken === 0) return undefined;
    const { wordId, isCorrect } = lastSubmitRef.current;
    if (!wordId) return undefined;

    const delay = isCorrect ? 500 : 2500;
    const timer = setTimeout(() => {
      groupCheck.reset([wordId]);
      const nextId = pickNextRef.current();
      if (!nextId) {
        setActiveWordId(null);
        onCompleteRef.current?.();
        alert('Отлично! Все формы в таблице тренированы!');
        return;
      }
      setActiveWordId(nextId);
      setInputValues((prev) => ({ ...prev, [nextId]: '' }));
    }, delay);

    return () => clearTimeout(timer);
  }, [advanceToken, inlineTrainingActive]);

  // Только если activeWordId вдруг не из таблицы
  useEffect(() => {
    if (!inlineTrainingActive || !activeWordId) return;
    if (visibleWordIds.has(activeWordId)) return;
    const nextId = pickNextRef.current();
    if (nextId) setActiveWordId(nextId);
  }, [activeWordId, inlineTrainingActive, visibleWordIds]);

  const handleInputChange = (wordId, value) => {
    setInputValues((prev) => ({ ...prev, [wordId]: value }));
    const word = dictionaryWordsById[wordId];
    if (word?.word && !groupWords.words.includes(word.word)) {
      groupWords.addWord(word.word);
    }
    groupCheck.setAnswer(wordId, value);
  };

  const handleSubmitActiveWord = async () => {
    if (!inlineTrainingActive || !activeWordId || submitting) return;
    const answer = (inputValues[activeWordId] || '').trim();
    if (!answer) return;

    setSubmitting(true);
    const wordId = activeWordId;
    try {
      const results = await checkGroupWords([wordId], { [wordId]: answer }, true);
      const isCorrect = results[wordId] === true;
      groupCheck.setResult(wordId, isCorrect);
      lastSubmitRef.current = { wordId, isCorrect };
      setAdvanceToken((t) => t + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const getWordInputProps = (wordText) => {
    const wordId = getWordIdByText(wordText);
    if (!wordId) return null;

    const word = dictionaryWordsById[wordId];
    const userData = userWordsData[wordId];
    const displayStatus = displayStatuses[wordId];
    if (!word) return null;

    const isActive = inlineTrainingActive && activeWordId === wordId;
    const isInTable = wordId && visibleWordIds.has(wordId);
    const onCooldown = Boolean(displayStatus?.cooldownRevert);
    // Ввод только в активном поле; на откате — таймер, не маска █
    const allowInput = inlineTrainingActive && isActive && isInTable && !onCooldown;
    const forceHidden = inlineTrainingActive && isInTable && !isActive && !onCooldown;

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
      onChange: allowInput ? handleInputChange : null,
      onSubmit: isActive ? handleSubmitActiveWord : null,
      autoFocus: isActive,
      inputDisabled: inlineTrainingActive && isActive && submitting,
      highlightCorrect: groupCheck.results[wordId] === true,
      highlightIncorrect: groupCheck.results[wordId] === false,
      fieldActive: isActive && isInTable,
      forceHidden,
      placeholder: 'Введите слово',
    };
  };

  const renderWordField = (key, wordText, wordId) => {
    const inputProps = getWordInputProps(wordText);
    return (
      <div
        key={key}
        className="verb-word-field"
        data-verb-word-id={wordId || undefined}
      >
        {inputProps ? (
          <WordInput {...inputProps} />
        ) : (
          <div className="word-input empty" />
        )}
      </div>
    );
  };

  return (
    <WordProvider
      getWordPropsByText={getWordPropsByText}
      getWordIdByText={getWordIdByText}
      getWordProps={getWordProps}
      getWord={getWord}
    >
      <div className={`verb-conjugation-category${inlineTrainingActive ? ' verb-conjugation-category--training' : ''}`}>
        <div className="category-header" style={{ marginBottom: '20px' }}>
          <h2>📚 {categoryProps.category.category_name}</h2>
          <div className="stats">
            📚 Всего: <strong>{stats.total}</strong>
            {' • '}
            ✅ Изучено: <strong>{stats.learned}</strong>
            {inlineTrainingActive && (
              <>
                {' • '}
                <span className="verb-inline-training-hint">Введите слово в подсвеченное поле и нажмите Enter</span>
              </>
            )}
          </div>
        </div>

        {Object.entries(verbs).map(([verbKey, verbData]) => {
          const allWords = Object.values(verbData).filter(
            (val) => val !== verbData.name && val && val !== '-'
          );
          if (allWords.length === 0) return null;

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
                            const wordId = getWordIdByText(wordText);
                            return renderWordField(key, wordText, wordId);
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
                        const wordId = getWordIdByText(wordText);
                        return { pronoun, key, wordText, wordId };
                      })
                      .filter(Boolean);

                    if (rows.length === 0) return null;

                    return (
                      <section key={tense} className="verb-tense-group">
                        <h4 className="verb-tense-group__heading">{tenseLabels[tense]}</h4>
                        {rows.map(({ pronoun, key, wordText, wordId }) => {
                          const inputProps = getWordInputProps(wordText);
                          return (
                            <div key={key} className="verb-tense-block">
                              <span className="verb-pronoun">{pronoun.label}</span>
                              <div className="verb-tense-stack">
                                <div
                                  className="verb-word-field"
                                  data-verb-word-id={wordId || undefined}
                                >
                                  {inputProps ? (
                                    <WordInput {...inputProps} />
                                  ) : (
                                    <div className="word-input empty" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
};

/**
 * БАЗОВЫЙ КОМПОНЕНТ: Таблица спряжений глаголов
 */
const VerbConjugationBase = ({ verbs, inlineTrainingActive = false, onInlineTrainingComplete, ...props }) => {
  return (
    <CategoryLayout {...props}>
      {(renderProps) => (
        <VerbConjugationContent
          verbs={verbs}
          categoryProps={props}
          inlineTrainingActive={inlineTrainingActive}
          onInlineTrainingComplete={onInlineTrainingComplete}
          {...renderProps}
        />
      )}
    </CategoryLayout>
  );
};

export default VerbConjugationBase;
