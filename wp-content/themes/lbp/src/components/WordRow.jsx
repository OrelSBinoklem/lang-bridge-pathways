import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import WordEditor from '../WordEditor';
import { useAdminMode } from '../custom/contexts/AdminModeContext';

/**
 * Компонент для отображения одного слова в списке
 * 
 * @param {object} word - Объект слова: {id, word, translation_1, translation_2, translation_3, learn_lang, category_ids, ...}
 * @param {object} userData - Данные пользователя по слову: {correct_attempts, correct_attempts_revert, mode_education, mode_education_revert, last_shown, last_shown_revert, ...}
 * @param {object} displayStatus - Статус отображения: {showWord, showTranslation, fullyLearned, hasAttempts, cooldownDirect, cooldownRevert}
 * @param {function} formatTime - Функция форматирования времени откатов: (milliseconds) => string (например "19:30")
 * @param {number} dictionaryId - ID словаря
 * @param {number} editingWordId - ID редактируемого слова (null если ничего не редактируется)
 * @param {function} onToggleEdit - Колбэк переключения редактирования: (wordId) => void
 * @param {function} onRefreshDictionaryWords - Колбэк обновления списка слов после редактирования: () => void
 * @param {function} onDeleteWord - Колбэк удаления слова: (wordId) => void
 * @param {boolean} showEditButton - Показывать кнопку редактирования ✏️ (только для админов)
 * @param {boolean} showCheckbox - Показывать чекбокс для массового выбора
 * @param {boolean} isSelected - Выбрано ли слово
 * @param {function} onToggleSelect - Колбэк переключения выбора слова
 */
const WordRow = ({
  word,
  userData,
  displayStatus,
  formatTime,
  dictionaryId,
  editingWordId,
  onToggleEdit,
  onRefreshDictionaryWords,
  onDeleteWord,
  showEditButton = true,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect
}) => {
  const { isAdminModeActive } = useAdminMode();
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const popoverRef = useRef(null);

  const closeInfoPopover = () => setShowInfoPopover(false);

  const showInfoHint = word.info && String(word.info).trim() &&
    ((displayStatus.showWord && displayStatus.showTranslation) || (userData?.mode_education_revert === 1 && userData?.mode_education === 1)) &&
    !displayStatus.cooldownDirect && !displayStatus.cooldownRevert;

  useEffect(() => {
    if (!showInfoPopover) return;
    const onDoc = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) closeInfoPopover();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showInfoPopover]);

  const handleRowClick = (e) => {
    if (!showInfoHint) return;
    if (e.target?.closest?.('.edit-button, .delete-button, input[type="checkbox"], .word-editor, .word-info-popover')) return;
    setShowInfoPopover((v) => !v);
  };

  // Рендер индикатора прогресса
  const renderProgressIndicator = () => {
    return userData && displayStatus.hasAttempts ? (
      <span className={`words-progress-indicator ${
        displayStatus.fullyLearned ? 'fully-learned' : 
        (userData.correct_attempts >= 2 || userData.correct_attempts_revert >= 2) ? 'partially-learned' : 'not-learned'
      }`}>
        {displayStatus.fullyLearned ? "✓" :
         (userData.correct_attempts >= 2 || userData.correct_attempts_revert >= 2) ? '✓' :
         <span dangerouslySetInnerHTML={{__html: '&mdash;'}} />}&nbsp;&nbsp;
      </span>
    ) : <span>&nbsp;&nbsp;&mdash;&nbsp;&nbsp;</span>;
  };

  return (
    <li
      key={word.id}
      className={showInfoHint ? 'words-education-list__row--has-info' : ''}
      onClick={handleRowClick}
      role={showInfoHint ? 'button' : undefined}
      tabIndex={showInfoHint ? 0 : undefined}
      onKeyDown={(e) => {
        if (showInfoHint && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleRowClick(e);
        }
      }}
    >
      {/* Слово */}
      <span className="words-education-list__word">
        {displayStatus.cooldownRevert ? (
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
            ⏱️ {formatTime(displayStatus.cooldownRevert)}
          </span>
        ) : displayStatus.showWord ? (
          word.word
        ) : (
          <span className="words-hidden-text">
            {userData && userData.mode_education_revert === 1 ? (
              <span className="learning-mode-text">
                <span className="learning-mode-icon">📚</span> <span style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}>{word.word}</span>
              </span>
            ) : (
              word.word.split('').map((char, index) => 
                char === ' ' ? ' ' : '█ '
              ).join('')
            )}
          </span>
        )}
      </span>
      
      {/* Перевод 1 */}
      <span className="words-education-list__translation_1">
        {renderProgressIndicator()}
        {displayStatus.cooldownDirect ? (
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
            ⏱️ {formatTime(displayStatus.cooldownDirect)}
          </span>
        ) : displayStatus.showTranslation ? (
          word.translation_1
        ) : (
          <span className="words-hidden-text">
            {userData && userData.mode_education === 1 ? (
              <span className="learning-mode-text">
                <span style={{ color: '#333', fontSize: '16px', fontWeight: 'normal' }}>{word.translation_1}</span> <span className="learning-mode-icon">📚</span>
              </span>
            ) : (
              word.translation_1.split('').map((char, index) => 
                char === ' ' ? ' ' : '█ '
              ).join('')
            )}
          </span>
        )}
      </span>
      
      {/* Перевод 2 */}
      {word.translation_2 && !displayStatus.cooldownDirect && (
        <span className="words-education-list__translation_2">
          , {displayStatus.showTranslation || (userData && userData.mode_education === 1) ? (
            word.translation_2
          ) : (
            <span className="words-hidden-text">
              {word.translation_2.split('').map((char, index) =>
                char === ' ' ? ' ' : '█ '
              ).join('')}
            </span>
          )}
        </span>
      )}
      
      {/* Перевод 3 */}
      {word.translation_3 && !displayStatus.cooldownDirect && (
        <span className="words-education-list__translation_3">
          , {displayStatus.showTranslation || (userData && userData.mode_education === 1) ? (
            word.translation_3
          ) : (
            <span className="words-hidden-text">
              {word.translation_3.split('').map((char, index) =>
                char === ' ' ? ' ' : '█ '
              ).join('')}
            </span>
          )}
        </span>
      )}

      {showEditButton && isAdminModeActive && (
        <>
          <button
            className="edit-button"
            style={{ marginLeft: "10px" }}
            onClick={() => onToggleEdit(word.id)}
            title="Редактировать слово"
          >
            ✏️
          </button>
          {onDeleteWord && (
            <button
              className="delete-button"
              onClick={() => {
                if (confirm(`Удалить слово "${word.word}"?`)) {
                  onDeleteWord(word.id);
                }
              }}
              title="Удалить слово"
            >
              🗑️
            </button>
          )}
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, marginLeft: '10px' }}
            />
          )}
        </>
      )}

      {showInfoHint && (
        <span className="words-education-list__info-hint" title="Подсказка">?</span>
      )}

      {showInfoPopover && word.info && String(word.info).trim() && createPortal(
        <div className="word-info-popover-backdrop" aria-hidden="true">
          <div
            ref={popoverRef}
            className="word-info-popover"
            role="dialog"
            aria-label="Подсказка"
          >
            <div
              className="word-info-popover__content"
              dangerouslySetInnerHTML={{ __html: word.info }}
            />
          </div>
        </div>,
        document.body
      )}

      {editingWordId === word.id && (
        <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #ccc" }}>
          <WordEditor 
            dictionaryId={dictionaryId} 
            word={word} 
            onClose={() => onToggleEdit(null)}
            onRefreshDictionaryWords={onRefreshDictionaryWords}
          />
        </div>
      )}
    </li>
  );
};

export default WordRow;
