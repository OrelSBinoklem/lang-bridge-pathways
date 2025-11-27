import React, { useState } from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider, useWordFunctions } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import { createGroupCheckHandlers, startLearningForGroup } from '../utils/groupHandlers';
import WordInGroup from '../components/WordInGroup';

/**
 * ПРИМЕР кастомной категории с красивыми группами
 */
const SimpleExampleCategory = (props) => {
  const groupCheck1 = useGroupCheck();
  const groupCheck2 = useGroupCheck();
  const groupWords1 = useGroupWords();
  const groupWords2 = useGroupWords();
  
  // Состояние для отслеживания, начато ли обучение для каждой группы
  const [learningStarted1, setLearningStarted1] = useState(false);
  const [learningStarted2, setLearningStarted2] = useState(false);
  
  return (
    <CategoryLayout {...props}>
      {({ getWordPropsByText, stats, checkGroupWords, getWordIdByText, getWordProps, getWord, onRefreshUserData, userWordsData }) => {
        // isRevert: false = прямой перевод (lat→rus), true = обратный (rus→lat)
        // В WordInGroup используется direction='direct', поэтому false
        const group1Handlers = createGroupCheckHandlers(groupWords1, groupCheck1, checkGroupWords, getWordIdByText, false);
        const group2Handlers = createGroupCheckHandlers(groupWords2, groupCheck2, checkGroupWords, getWordIdByText, false);
        
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
        
        // Проверяем, есть ли хотя бы одно слово с попытками в группе 1
        const hasWordsWithAttempts1 = () => {
          const wordIds = ['cipars', 'skaitlis', 'mīnuss']
            .map(wordText => getWordIdByText(wordText))
            .filter(id => id && id !== 0);
          return wordIds.some(wordId => !isWordInInitialState(wordId));
        };
        
        // Проверяем, есть ли хотя бы одно слово с попытками в группе 2
        const hasWordsWithAttempts2 = () => {
          const wordIds = ['cipars', 'skaitlis', 'mīnuss', 'pluss', 'summa', 'reizinājums', 'dalījums']
            .map(wordText => getWordIdByText(wordText))
            .filter(id => id && id !== 0);
          return wordIds.some(wordId => !isWordInInitialState(wordId));
        };
        
        // Определяем, показывать ли кнопку "Начать обучение" для каждой группы
        const shouldShowStartLearning1 = !learningStarted1 && !hasWordsWithAttempts1();
        const shouldShowStartLearning2 = !learningStarted2 && !hasWordsWithAttempts2();
        
        // Функции для начала обучения для каждой группы
        const handleStartLearning1 = async () => {
          const wordIds = ['cipars', 'skaitlis', 'mīnuss']
            .map(wordText => getWordIdByText(wordText))
            .filter(id => id && id !== 0);
          
          if (wordIds.length === 0) {
            console.warn('⚠️ Нет слов для начала обучения в группе 1');
            return;
          }
          
          const success = await startLearningForGroup(wordIds, onRefreshUserData);
          if (success) {
            setLearningStarted1(true);
          }
        };
        
        const handleStartLearning2 = async () => {
          const wordIds = ['cipars', 'skaitlis', 'mīnuss', 'pluss', 'summa', 'reizinājums', 'dalījums']
            .map(wordText => getWordIdByText(wordText))
            .filter(id => id && id !== 0);
          
          if (wordIds.length === 0) {
            console.warn('⚠️ Нет слов для начала обучения в группе 2');
            return;
          }
          
          const success = await startLearningForGroup(wordIds, onRefreshUserData);
          if (success) {
            setLearningStarted2(true);
          }
        };
        
        return (
          <WordProvider 
            getWordPropsByText={getWordPropsByText} 
            getWordIdByText={getWordIdByText}
            getWordProps={getWordProps}
            getWord={getWord}
          >
            <div className="simple-custom-category">
              {/* Заголовок */}
              <div className="category-header">
                <h2>🎨 {props.category.category_name}</h2>
                <div className="stats">
                  📚 Всего: <strong>{stats.total}</strong>
                  {' • '}
                  ✅ Изучено: <strong>{stats.learned}</strong>
                </div>
              </div>

              {/* Группа 1 - Радуга */}
              <div className="rainbow-group">
                <h3>🌈 Радуга</h3>
                <div className="words-container">
                  <div className="rainbow-word-card">
                    <div className="color-name">Красный</div>
                    {/* Можно передать wordText (текст слова) или wordId (ID слова) */}
                    <WordInGroup wordText="cipars" groupCheck={groupCheck1} groupWords={groupWords1} vertical={true} hideAvailableWord={true} />
                    {/* Пример с wordId: <WordInGroup wordId={123} groupCheck={groupCheck1} groupWords={groupWords1} vertical={true} /> */}
                  </div>
                  <div className="rainbow-word-card">
                    <div className="color-name">Синий</div>
                    <WordInGroup wordText="skaitlis" groupCheck={groupCheck1} groupWords={groupWords1} />
                  </div>
                  <div className="rainbow-word-card">
                    <div className="color-name">Зелёный</div>
                    <WordInGroup wordText="mīnuss" groupCheck={groupCheck1} groupWords={groupWords1} />
                  </div>
                </div>
              </div>
              <div className="group-controls">
                {shouldShowStartLearning1 ? (
                  <button onClick={handleStartLearning1} className="btn-start-learning" style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>
                    📚 Начать обучение
                  </button>
                ) : (
                  <>
                    <button onClick={group1Handlers.handleCheck} className="btn-check-group">
                      ✓ Проверить
                    </button>
                    <button onClick={() => {
                      // Очищаем ответы в groupCheck1
                      const wordIds1 = ['cipars', 'skaitlis', 'mīnuss']
                        .map(wordText => getWordIdByText(wordText))
                        .filter(id => id && id !== 0);
                      wordIds1.forEach(wordId => {
                        groupCheck1.setAnswer(wordId, '');
                        groupCheck1.setResult(wordId, null);
                      });
                    }} className="btn-reset-group">
                      🔄 Очистить поля
                    </button>
                  </>
                )}
              </div>

              {/* Группа 2 - Круг цветов */}
              <div className="color-mixing-group">
                <div className="shimmer-effect"></div>
                <h3>🎨 Круг цветов</h3>
                <div className="words-grid">
                  {/* Основные цвета */}
                  <div className="mixing-word-card color-red">
                    <div className="color-name">
                      <WordInGroup wordText="cipars" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                  <div className="mixing-word-card color-green">
                    <div className="color-name">
                      <WordInGroup wordText="skaitlis" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                  <div className="mixing-word-card color-blue">
                    <div className="color-name">
                      <WordInGroup wordText="mīnuss" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                  
                  {/* Смешанные цвета */}
                  <div className="mixing-word-card color-lime">
                    <div className="color-name">
                      <WordInGroup wordText="pluss" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                  <div className="mixing-word-card color-purple">
                    <div className="color-name">
                      <WordInGroup wordText="summa" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                  <div className="mixing-word-card color-yellow">
                    <div className="color-name">
                      <WordInGroup wordText="reizinājums" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                  
                  {/* Белый в центре */}
                  <div className="mixing-word-card color-white">
                    <div className="color-name">
                      <WordInGroup wordText="dalījums" groupCheck={groupCheck2} groupWords={groupWords2} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="group-controls">
                {shouldShowStartLearning2 ? (
                  <button onClick={handleStartLearning2} className="btn-start-learning" style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>
                    📚 Начать обучение
                  </button>
                ) : (
                  <>
                    <button onClick={group2Handlers.handleCheck} className="btn-check-group">
                      ✓ Проверить
                    </button>
                    <button onClick={() => {
                      // Очищаем ответы в groupCheck2
                      const wordIds2 = ['cipars', 'skaitlis', 'mīnuss', 'pluss', 'summa', 'reizinājums', 'dalījums']
                        .map(wordText => getWordIdByText(wordText))
                        .filter(id => id && id !== 0);
                      wordIds2.forEach(wordId => {
                        groupCheck2.setAnswer(wordId, '');
                        groupCheck2.setResult(wordId, null);
                      });
                    }} className="btn-reset-group">
                      🔄 Очистить поля
                    </button>
                  </>
                )}
              </div>
            </div>
          </WordProvider>
        );
      }}
    </CategoryLayout>
  );
};

export default SimpleExampleCategory;
