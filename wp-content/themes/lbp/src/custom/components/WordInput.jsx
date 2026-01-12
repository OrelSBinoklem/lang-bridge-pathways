import React, { useState, useEffect } from 'react';
import WordEditor from '../../WordEditor';
import { useAdminMode } from '../contexts/AdminModeContext';

/**
 * Компонент для ввода слова (упрощенная версия WordField)
 * 
 * Показывает только:
 * - Поле ввода для слова
 * - Индикатор прогресса (галочка)
 * - Таймер отката (вместо поля ввода, по центру)
 * 
 * @param {object} word - Объект слова: {id, word, translation_1, translation_2, translation_3, ...}
 * @param {object} userData - Данные пользователя по слову
 * @param {object} displayStatus - Статус отображения: {showWord, fullyLearned, hasAttempts, cooldownRevert}
 * @param {function} formatTime - Функция форматирования времени откатов
 * @param {number} dictionaryId - ID словаря
 * @param {number} editingWordId - ID редактируемого слова
 * @param {function} onToggleEdit - Колбэк переключения редактирования
 * @param {function} onRefreshDictionaryWords - Колбэк обновления списка слов
 * @param {boolean} showEditButton - Показывать кнопку редактирования ✏️
 * @param {string} value - Значение поля ввода
 * @param {function} onChange - Колбэк изменения значения: (wordId, value) => void
 * @param {boolean} highlightCorrect - Подсветка при правильном ответе
 * @param {boolean} highlightIncorrect - Подсветка при неправильном ответе
 */
const WordInput = ({
  word,
  userData,
  displayStatus,
  formatTime,
  dictionaryId,
  editingWordId,
  onToggleEdit,
  onRefreshDictionaryWords,
  showEditButton = true,
  value = '',
  onChange = null,
  highlightCorrect = false,
  highlightIncorrect = false,
}) => {
  const { isAdminModeActive } = useAdminMode();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Показать всплывашку при неправильном ответе
  useEffect(() => {
    if (highlightIncorrect) {
      setShowTooltip(true);
      const timer = setTimeout(() => setShowTooltip(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [highlightIncorrect]);
  
  // Стили для поля ввода
  const getFieldStyle = (isCorrect, isIncorrect) => {
    const base = {
      border: '1px solid #ced4da',
      borderRadius: '3px',
      padding: '4px 8px',
      fontSize: '13px',
      width: '140px',
      fontFamily: 'inherit',
      textAlign: 'center',
    };
    if (isCorrect) return { ...base, backgroundColor: '#d4edda', borderColor: '#28a745' };
    if (isIncorrect) return { ...base, backgroundColor: '#f8d7da', borderColor: '#dc3545' };
    return base;
  };

  // Стили для таймера отката (показывается вместо поля ввода)
  const getTimerStyle = () => {
    return {
      border: '1px solid #ff9800',
      borderRadius: '3px',
      padding: '4px 8px',
      fontSize: '13px',
      width: '140px',
      textAlign: 'center',
      color: '#ff9800',
      fontWeight: 'bold',
      backgroundColor: '#fff3e0',
    };
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px',
      padding: '2px 0px'
    }}>
      
      {/* Поле ввода или таймер отката */}
      {displayStatus.cooldownRevert ? (
        // Показываем таймер отката вместо поля ввода
        <span style={getTimerStyle()}>
          ⏱️ {formatTime(displayStatus.cooldownRevert)}
        </span>
      ) : displayStatus.showWord ? (
        // Если слово уже показано - показываем его
        <span style={{
          border: '1px solid #ced4da',
          borderRadius: '3px',
          padding: '4px 8px',
          fontSize: '13px',
          width: '140px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
        }}>
          {word.word}
        </span>
      ) : onChange ? (
        // Показываем поле ввода
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(word.id, e.target.value)}
            placeholder="Введите слово"
            style={getFieldStyle(highlightCorrect, highlightIncorrect)}
            className="word-input-field"
          />
          {/* Индикатор выученного слова */}
          {userData && displayStatus && displayStatus.fullyLearned && (
            <span style={{ 
              position: 'absolute',
              right: '6px',
              pointerEvents: 'none',
              fontSize: '14px',
              color: '#28a745',
              fontWeight: 'bold'
            }}>
              ✓
            </span>
          )}
          {userData && userData.mode_education_revert === 1 && (
            <span className="learning-mode-text learning-glow" style={{ 
              position: 'absolute',
              right: '6px',
              pointerEvents: 'none'
            }}>
              <span className="learning-mode-icon">📚 Учу</span>
            </span>
          )}
          {showTooltip && (
            <span className="word-field-tooltip">
              ✓ {word.word}
            </span>
          )}
        </span>
      ) : (
        // Если нет onChange - показываем скрытое слово
        <span className="words-hidden-text" style={{
          border: '1px solid #ced4da',
          borderRadius: '3px',
          padding: '4px 8px',
          fontSize: '13px',
          width: '140px',
          textAlign: 'center',
        }}>
          {userData && userData.mode_education_revert === 1 ? (
            <span className="learning-mode-text">
              <span className="learning-mode-icon">📚 Учу</span> <span style={{ color: '#333' }}>{word.word}</span>
            </span>
          ) : (
            word.word.split('').map((char, index) => 
              char === ' ' ? ' ' : '█ '
            ).join('')
          )}
        </span>
      )}

      {/* Кнопка редактирования (только для админов) */}
      {showEditButton && isAdminModeActive && (
        <button
          className="edit-button"
          style={{ marginLeft: "10px" }}
          onClick={() => onToggleEdit(word.id)}
          title="Редактировать слово"
        >
          ✏️
        </button>
      )}

      {/* Форма редактирования */}
      {editingWordId === word.id && (
        <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #ccc", width: '100%' }}>
          <WordEditor 
            dictionaryId={dictionaryId} 
            word={word} 
            onClose={() => onToggleEdit(null)}
            onRefreshDictionaryWords={onRefreshDictionaryWords}
          />
        </div>
      )}
    </div>
  );
};

export default WordInput;

