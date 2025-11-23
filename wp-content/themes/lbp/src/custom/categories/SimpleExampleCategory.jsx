import React from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider, useWordFunctions } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import { createGroupCheckHandlers } from '../utils/groupHandlers';
import WordInGroup from '../components/WordInGroup';

/**
 * ПРИМЕР кастомной категории с красивыми группами
 */
const SimpleExampleCategory = (props) => {
  const groupCheck1 = useGroupCheck();
  const groupCheck2 = useGroupCheck();
  const groupWords1 = useGroupWords();
  const groupWords2 = useGroupWords();
  
  return (
    <CategoryLayout {...props}>
      {({ getWordPropsByText, stats, checkGroupWords, getWordIdByText }) => {
        const group1Handlers = createGroupCheckHandlers(groupWords1, groupCheck1, checkGroupWords, getWordIdByText);
        const group2Handlers = createGroupCheckHandlers(groupWords2, groupCheck2, checkGroupWords, getWordIdByText);
        
        return (
          <WordProvider getWordPropsByText={getWordPropsByText} getWordIdByText={getWordIdByText}>
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
                    <WordInGroup wordText="cipars" groupCheck={groupCheck1} groupWords={groupWords1} vertical={true} />
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
                <button onClick={group1Handlers.handleCheck} className="btn-check-group">
                  ✓ Проверить
                </button>
                <button onClick={group1Handlers.handleReset} className="btn-reset-group">
                  🔄 Сбросить
                </button>
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
                <button onClick={group2Handlers.handleCheck} className="btn-check-group">
                  ✓ Проверить
                </button>
                <button onClick={group2Handlers.handleReset} className="btn-reset-group">
                  🔄 Сбросить
                </button>
              </div>
            </div>
          </WordProvider>
        );
      }}
    </CategoryLayout>
  );
};

export default SimpleExampleCategory;
