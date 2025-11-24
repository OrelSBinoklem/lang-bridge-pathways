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
 * 
 * ВАЖНО: Все фиксы и улучшения уже включены:
 * - ✅ Правильное направление проверки (isRevert = false для прямой проверки)
 * - ✅ Валидация wordId (исключение 0 и null)
 * - ✅ Поддержка wordText и wordId
 * - ✅ Автоматическое обновление данных после проверки
 * - ✅ Откат (cooldown) после правильного ответа
 * - ✅ Правильная подсветка (зелёный = правильно, красный = неправильно)
 */
const BaseTemplate = (props) => {
  // Создаем группы (можете создать несколько групп для разных упражнений)
  const groupCheck1 = useGroupCheck(); // Состояние проверки группы 1 (ответы, результаты)
  const groupWords1 = useGroupWords();  // Автоматический сбор слов из WordInGroup
  
  // Можно создать несколько групп:
  // const groupCheck2 = useGroupCheck();
  // const groupWords2 = useGroupWords();
  
  return (
    <CategoryLayout {...props}>
      {({ getWordPropsByText, stats, checkGroupWords, getWordIdByText, getWordProps, getWord }) => {
        /**
         * Обработчики для группы
         * 
         * ФИКС: isRevert = false для прямой проверки (lat→rus)
         * - false = прямой перевод (lat→rus) - пользователь вводит русский перевод
         * - true = обратный перевод (rus→lat) - пользователь вводит латышское слово
         * 
         * В WordInGroup используется direction='direct', поэтому всегда false
         */
        const group1Handlers = createGroupCheckHandlers(
          groupWords1, 
          groupCheck1, 
          checkGroupWords, 
          getWordIdByText, 
          false // isRevert: false = прямой перевод (lat→rus)
        );
        
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
                
                {/* 
                  СЛОВА ГРУППЫ - Примеры использования WordInGroup
                  
                  WordInGroup автоматически:
                  1. Регистрирует слово в группе (groupWords.addWord)
                  2. Связывает с состоянием проверки (groupCheck)
                  3. Отображает поле ввода для прямого перевода (lat→rus)
                  4. Подсвечивает результат проверки (зелёный/красный)
                  5. Показывает откат (cooldown) после правильного ответа
                */}
                <ul className="words-education-list">
                  
                  {/* 
                    ПРИМЕР 1: Использование wordText (текст слова)
                    - Простой способ: передаём текст слова
                    - WordInGroup найдёт ID автоматически
                  */}
                  <WordInGroup 
                    wordText="cipars" 
                    groupCheck={groupCheck1} 
                    groupWords={groupWords1} 
                  />
                  
                  {/* 
                    ПРИМЕР 2: Использование wordId (ID слова)
                    - Если знаете ID слова, можно передать напрямую
                    - wordId имеет приоритет над wordText
                    - Полезно, когда одно и то же слово используется в разных формах
                  */}
                  {/* <WordInGroup 
                    wordId={123} 
                    groupCheck={groupCheck1} 
                    groupWords={groupWords1} 
                  /> */}
                  
                  {/* 
                    ПРИМЕР 3: Вертикальное расположение
                    - vertical={true} - слово и перевод друг под другом
                    - По умолчанию: горизонтально (слово | перевод)
                  */}
                  <WordInGroup 
                    wordText="skaitlis" 
                    groupCheck={groupCheck1} 
                    groupWords={groupWords1}
                    vertical={true}
                  />
                  
                  {/* 
                    ПРИМЕР 4: Скрыть доступное слово
                    - hideAvailableWord={true} - скрывает латышское слово
                    - Пользователь видит только поле для ввода перевода
                    - Полезно для более сложных упражнений
                  */}
                  <WordInGroup 
                    wordText="mīnuss" 
                    groupCheck={groupCheck1} 
                    groupWords={groupWords1}
                    hideAvailableWord={true}
                  />
                  
                  {/* 
                    ПРИМЕР 5: Комбинация параметров
                    - Можно комбинировать vertical и hideAvailableWord
                  */}
                  {/* <WordInGroup 
                    wordText="pluss" 
                    groupCheck={groupCheck1} 
                    groupWords={groupWords1}
                    vertical={true}
                    hideAvailableWord={true}
                  /> */}
                  
                </ul>
                
                {/* 
                  КНОПКИ УПРАВЛЕНИЯ
                  
                  handleCheck:
                  - Проверяет все слова в группе
                  - Обновляет прогресс в БД
                  - Обновляет данные пользователя (onRefreshUserData)
                  - Устанавливает результаты для подсветки
                  - После правильного ответа запускается откат (cooldown)
                  
                  handleReset:
                  - Очищает все ответы и результаты
                  - Сбрасывает подсветку
                */}
                <div className="group-controls">
                  <button onClick={group1Handlers.handleCheck} className="btn-check-group">
                    ✓ Проверить
                  </button>
                  <button onClick={group1Handlers.handleReset} className="btn-reset-group">
                    🔄 Сбросить
                  </button>
                </div>
              </div>
              
              {/* 
                ПРИМЕР: Несколько групп
                
                Можно создать несколько независимых групп с разными словами:
                
                <div className="my-group-2">
                  <h3>Вторая группа</h3>
                  <ul>
                    <WordInGroup wordText="summa" groupCheck={groupCheck2} groupWords={groupWords2} />
                    <WordInGroup wordText="dalījums" groupCheck={groupCheck2} groupWords={groupWords2} />
                  </ul>
                  <div className="group-controls">
                    <button onClick={group2Handlers.handleCheck}>✓ Проверить</button>
                    <button onClick={group2Handlers.handleReset}>🔄 Сбросить</button>
                  </div>
                </div>
              */}
            </div>
          </WordProvider>
        );
      }}
    </CategoryLayout>
  );
};

export default BaseTemplate;

