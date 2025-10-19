import React from 'react';
import WordEditor from '../WordEditor';

/**
 * Компонент для отображения одного слова в списке
 * 
 * @param {object} word - Объект слова: {id, word, translation_1, translation_2, translation_3, learn_lang, category_ids, ...}
 * @param {object} userData - Данные пользователя по слову: {correct_attempts, correct_attempts_revert, mode_education, mode_education_revert, last_shown, last_shown_revert, easy_education, easy_correct, easy_correct_revert, ...}
 * @param {object} displayStatus - Статус отображения: {showWord, showTranslation, fullyLearned, hasAttempts, cooldownDirect, cooldownRevert}
 * @param {function} formatTime - Функция форматирования времени откатов (только для mode='examen'): (milliseconds) => string (например "19:30")
 * @param {number} dictionaryId - ID словаря
 * @param {number} editingWordId - ID редактируемого слова (null если ничего не редактируется)
 * @param {function} onToggleEdit - Колбэк переключения редактирования: (wordId) => void
 * @param {function} onRefreshDictionaryWords - Колбэк обновления списка слов после редактирования: () => void
 * @param {function} onDeleteWord - Колбэк удаления слова: (wordId) => void
 * @param {boolean} showEditButton - Показывать кнопку редактирования ✏️ (только для админов)
 * @param {string} mode - Режим: 'examen' (с откатами и таймерами) или 'education' (без откатов)
 */
const WordRow = ({
  word,
  userData,
  displayStatus,
  formatTime = null,
  dictionaryId,
  editingWordId,
  onToggleEdit,
  onRefreshDictionaryWords,
  onDeleteWord,
  showEditButton = true,
  mode = 'examen'
}) => {
  const isExamenMode = mode === 'examen' && formatTime;
  
  // Логирование для отладки
  /*console.log('WordRow:', {
    wordId: word.id,
    wordText: word.word,
    mode,
    isExamenMode,
    hasFormatTime: !!formatTime,
    userData: userData,
    displayStatus: displayStatus
  });*/
  
  // Рендер индикатора прогресса
  const renderProgressIndicator = () => {
    if (isExamenMode) {
      // Режим экзамена
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
    } else {
      // Режим обучения
      return userData && userData.easy_education === 1 ? (
        <span className={`words-progress-indicator ${
          displayStatus.fullyLearned ? 'fully-learned' : 
          displayStatus.showWord || displayStatus.showTranslation ? 'partially-learned' : 'not-learned'
        }`}>
          {displayStatus.fullyLearned ? "✓" :
           displayStatus.showWord || displayStatus.showTranslation ? '✓' :
           <span dangerouslySetInnerHTML={{__html: '&mdash;'}} />}&nbsp;&nbsp;
        </span>
      ) : <span>&nbsp;&nbsp;&mdash;&nbsp;&nbsp;</span>;
    }
  };

  return (
    <li key={word.id}>
      {/* Слово */}
      <span className="words-education-list__word">
        {isExamenMode && displayStatus.cooldownDirect ? (
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
            ⏱️ {formatTime(displayStatus.cooldownDirect)}
          </span>
        ) : displayStatus.showWord ? (
          word.word
        ) : (
          <span className="words-hidden-text">
            {isExamenMode && userData && userData.mode_education === 1 ? (
              <span className="learning-mode-text">
                📚 Учу
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
        {isExamenMode && displayStatus.cooldownRevert ? (
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
            ⏱️ {formatTime(displayStatus.cooldownRevert)}
          </span>
        ) : displayStatus.showTranslation ? (
          word.translation_1
        ) : (
          <span className="words-hidden-text">
            {isExamenMode && userData && userData.mode_education_revert === 1 ? (
              <span className="learning-mode-text">
                📚 Учу
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
      {word.translation_2 && (!isExamenMode || !displayStatus.cooldownRevert) && (
        <span className="words-education-list__translation_2">
          , {displayStatus.showTranslation ? (
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
      {word.translation_3 && (!isExamenMode || !displayStatus.cooldownRevert) && (
        <span className="words-education-list__translation_3">
          , {displayStatus.showTranslation ? (
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

      {showEditButton && window.myajax && window.myajax.is_admin && (
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
        </>
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
