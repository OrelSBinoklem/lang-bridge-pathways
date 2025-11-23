import React from 'react';
import Word from './Word';
import { useWordFunctions } from '../contexts/WordContext';

/**
 * WordInGroup - ОБЁРТКА для групповой проверки слов
 * 
 * ОТЛИЧИЯ от Word:
 * 1. Принимает wordText (текст) вместо wordId - находит слово по тексту
 * 2. Автоматически регистрирует слово в группе (groupWords.addWord)
 * 3. Всегда использует type='field' (поле ввода) и direction='direct'
 * 4. Привязан к групповой проверке через groupCheck (answers, results, setAnswer)
 * 5. Использует Word внутри себя - это обёртка над Word
 * 
 * ИСПОЛЬЗОВАНИЕ: В кастомных категориях для групповой проверки нескольких слов
 * 
 * @param {string} wordText - Текст слова для поиска (например "summa")
 * @param {object} groupCheck - Объект с состоянием проверки группы (answers, results, setAnswer)
 * @param {object} groupWords - Объект для регистрации слов в группе
 * @param {boolean} hideAvailableWord - Скрывать слово, которое не надо отгадывать
 * @param {boolean} vertical - Вертикальное расположение
 */
const WordInGroup = ({ wordText, groupCheck, groupWords, hideAvailableWord = false, vertical = false }) => {
  const { getWordPropsByText, getWordIdByText } = useWordFunctions();
  
  // Автоматическая регистрация слова в группе (это делает WordInGroup уникальным!)
  React.useEffect(() => {
    if (groupWords) {
      groupWords.addWord(wordText);
    }
  }, [wordText, groupWords]);
  
  // Находим ID слова по тексту
  const wordId = getWordIdByText(wordText) || 0;
  
  // Получаем пропсы для Word через контекст
  const props = getWordPropsByText(wordText, {
    type: 'field',              // ВСЕГДА поле ввода (не может быть 'row')
    direction: 'direct',        // ВСЕГДА прямой перевод (lat→rus)
    hideAvailableWord: hideAvailableWord,
    vertical: vertical,
    // Привязка к групповой проверке:
    directValue: groupCheck.answers[wordId] || '',           // Текущий ответ пользователя
    onDirectChange: groupCheck.setAnswer,                    // Обработчик изменения
    highlightDirectCorrect: groupCheck.results[wordId] === true,    // Подсветка правильного
    highlightDirectIncorrect: groupCheck.results[wordId] === false, // Подсветка неправильного
  });
  
  // Использует Word внутри себя - это обёртка!
  return props ? <Word {...props} /> : <div>Слово "{wordText}" не найдено</div>;
};

export default WordInGroup;

