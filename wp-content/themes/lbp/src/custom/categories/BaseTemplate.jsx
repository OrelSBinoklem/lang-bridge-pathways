import React from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import Word from '../components/Word';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider, useWordFunctions } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import { createGroupCheckHandlers } from '../utils/groupHandlers';

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
      {({ getWordPropsByText, stats, checkGroupWords, getWordIdByText }) => {
        // Обработчики для группы
        const group1Handlers = createGroupCheckHandlers(groupWords1, groupCheck1, checkGroupWords, getWordIdByText);
        
        return (
          <WordProvider getWordPropsByText={getWordPropsByText} getWordIdByText={getWordIdByText}>
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

/**
 * Компонент для отображения одного слова в группе
 */
const WordInGroup = ({ wordText, groupCheck, groupWords, hideAvailableWord = false, vertical = false }) => {
  const { getWordPropsByText, getWordIdByText } = useWordFunctions();
  
  // Автоматическая регистрация слова в группе
  React.useEffect(() => {
    if (groupWords) {
      groupWords.addWord(wordText);
    }
  }, [wordText, groupWords]);
  
  const wordId = getWordIdByText(wordText) || 0;
  const props = getWordPropsByText(wordText, {
    type: 'field',              // 'field' для полей ввода, 'row' для обычного отображения
    direction: 'direct',        // 'direct' (lat→rus), 'reverse' (rus→lat), 'both'
    hideAvailableWord: hideAvailableWord,   // true - скрыть слово, которое не надо отгадывать
    vertical: vertical,         // true - вертикальное расположение
    directValue: groupCheck.answers[wordId] || '',
    onDirectChange: groupCheck.setAnswer,
    highlightDirectCorrect: groupCheck.results[wordId] === true,
    highlightDirectIncorrect: groupCheck.results[wordId] === false,
  });
  
  return props ? <Word {...props} /> : <div>Слово "{wordText}" не найдено</div>;
};

export default BaseTemplate;

