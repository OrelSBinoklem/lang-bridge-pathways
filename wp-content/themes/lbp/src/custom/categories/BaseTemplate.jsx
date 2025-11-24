import React from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider, useWordFunctions } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import { createGroupCheckHandlers } from '../utils/groupHandlers';
import WordInGroup from '../components/WordInGroup';

/**
 * БАЗОВЫЙ ШАБЛОН кастомной категории
 * 
 * Скопируйте этот файл и переименуйте для создания своей категории
 */
const BaseTemplate = (props) => {
  // Создаем группы (можете создать несколько)
  const groupCheck1 = useGroupCheck();
  const groupWords1 = useGroupWords();
  
  return (
    <CategoryLayout {...props}>
      {({ getWordPropsByText, stats, checkGroupWords, getWordIdByText, getWordProps, getWord }) => {
        // Обработчики для группы
        // isRevert: false = прямой перевод (lat→rus), true = обратный (rus→lat)
        // В WordInGroup используется direction='direct', поэтому false
        const group1Handlers = createGroupCheckHandlers(groupWords1, groupCheck1, checkGroupWords, getWordIdByText, false);
        
        return (
          <WordProvider 
            getWordPropsByText={getWordPropsByText} 
            getWordIdByText={getWordIdByText}
            getWordProps={getWordProps}
            getWord={getWord}
          >
            <div className="custom-category">
              {/* Заголовок */}
              <h2>{props.category.category_name}</h2>
              <p>📚 Всего: {stats.total} | ✅ Изучено: {stats.learned}</p>
              
              {/* Ваш контент здесь */}
              <div className="my-group">
                <h3>Моя группа слов</h3>
                
                {/* Слова группы - замените на свои */}
                <ul className="words-education-list">
                  <WordInGroup wordText="cipars" groupCheck={groupCheck1} groupWords={groupWords1} />
                  <WordInGroup wordText="skaitlis" groupCheck={groupCheck1} groupWords={groupWords1} />
                  <WordInGroup wordText="mīnuss" groupCheck={groupCheck1} groupWords={groupWords1} />
                </ul>
                
                {/* Кнопки управления */}
                <div className="group-controls">
                  <button onClick={group1Handlers.handleCheck} className="btn-check-group">
                    ✓ Проверить
                  </button>
                  <button onClick={group1Handlers.handleReset} className="btn-reset-group">
                    🔄 Сбросить
                  </button>
                </div>
              </div>
            </div>
          </WordProvider>
        );
      }}
    </CategoryLayout>
  );
};

export default BaseTemplate;

