import React, { useState, useRef, useEffect, memo } from 'react';

// Изолируем dangerouslySetInnerHTML: React не управляет этим DOM, при ре-рендере родителя
// может возникнуть removeChild. Мемоизация предотвращает лишние обновления.
const PopoverHtmlContent = memo(({ html }) => (
  <div className="word-info-popover__content" dangerouslySetInnerHTML={{ __html: html || '' }} />
));
import WordEditor from '../WordEditor';
import WordWithPosHint from './WordWithPosHint';
import WordDifficultyStats from './WordDifficultyStats';
import { useAdminMode } from '../custom/contexts/AdminModeContext';
import { learnedWithSimplifiedTierTwo } from '../custom/utils/helpers';

const GLOSBE_BASE = 'https://ru.glosbe.com/словарь-латышский-русский/';

/**
 * Компонент для отображения одного слова в списке
 * 
 * @param {object} word - Объект слова: {id, word, translation_1, translation_2, translation_3, learn_lang, category_ids, ...}
 * @param {object} userData - Данные пользователя по слову: {correct_attempts, correct_attempts_revert, mode_education, mode_education_revert, last_shown, last_shown_revert, ...}
 * @param {object} displayStatus - Статус отображения: {showWord, showTranslation, fullyLearned, hasAttempts, cooldownDirect, cooldownRevert}
 * @param {object|null} denseMeta - Данные dense-сессии по слову
 * @param {function} formatTime - Функция форматирования времени откатов: (milliseconds) => string (например "19:30")
 * @param {number} dictionaryId - ID словаря
 * @param {number} editingWordId - ID редактируемого слова (null если ничего не редактируется)
 * @param {function} onToggleEdit - Колбэк переключения редактирования: (wordId) => void
 * @param {function} onRefreshDictionaryWords - Колбэк обновления списка слов после редактирования: () => void
 * @param {function} [onRefreshUserData] - Колбэк обновления данных прогресса пользователя (состояние слов): () => void
 * @param {function} onDeleteWord - Колбэк удаления слова: (wordId, categoryId?) => void
 * @param {number} [categoryIdForDelete] - ID категории для удаления (если задан — удалит только из категории)
 * @param {boolean} showEditButton - Показывать кнопку редактирования ✏️ (только для админов)
 * @param {boolean} showCheckbox - Показывать чекбокс для массового выбора
 * @param {boolean} isSelected - Выбрано ли слово
 * @param {function} onToggleSelect - Колбэк переключения выбора слова
 * @param {boolean} denseAddMode - Режим «клик по слову = добавить/убрать из плотного»
 * @param {function} onDenseToggle - Колбэк переключения слова в плотном: (wordId) => void
 * @param {boolean} showDifficultyStats - Показать статистику сложности (баллы и ошибки)
 */
const WordRow = ({
  word,
  userData,
  displayStatus,
  denseMeta = null,
  formatTime,
  dictionaryId,
  editingWordId,
  onToggleEdit,
  onRefreshDictionaryWords,
  onRefreshUserData,
  onDeleteWord,
  categoryIdForDelete = null,
  showEditButton = true,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect,
  denseAddMode = false,
  onDenseToggle,
  showDifficultyStats = false,
}) => {
  const { isAdminModeActive } = useAdminMode();
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const popoverRef = useRef(null);

  const closeInfoPopover = () => setShowInfoPopover(false);

  const isEditingThisRow = editingWordId === word.id;
  const showInfoHint = !isEditingThisRow && word.info && String(word.info).trim() &&
    ((displayStatus.showWord && displayStatus.showTranslation) || (userData?.mode_education_revert === 1 && userData?.mode_education === 1)) &&
    !displayStatus.cooldownDirect && !displayStatus.cooldownRevert;

  // Открывать Glosbe только если слово выучено (те же условия что и для "?") или в режиме дообучения
  const canOpenGlosbe =
    (((displayStatus.showWord && displayStatus.showTranslation) || (userData?.mode_education_revert === 1 && userData?.mode_education === 1)) &&
      !displayStatus.cooldownDirect && !displayStatus.cooldownRevert) ||
    Boolean(denseMeta);

  const openGlosbe = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const w = word.word != null ? String(word.word).trim() : '';
    if (w && canOpenGlosbe) {
      window.open(GLOSBE_BASE + encodeURIComponent(w), '_blank');
    }
  };

  useEffect(() => {
    if (isEditingThisRow) {
      closeInfoPopover();
      return;
    }
    if (!showInfoPopover) return;
    const onDoc = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) closeInfoPopover();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showInfoPopover, isEditingThisRow]);

  const handleRowClick = (e) => {
    if (editingWordId === word.id) return;
    if (e.target?.closest?.('.edit-button, .delete-button, input[type="checkbox"], .word-editor, .word-info-popover, .info-wysiwyg-modal-overlay, .info-wysiwyg-modal, .words-education-list__info-hint, .word-difficulty-line')) return;
    if (denseAddMode && onDenseToggle) {
      onDenseToggle(word.id);
    }
  };

  // Индикатор прогресса; в упрощённом режиме при 2+ баллах по направлению — ✓* (галочка + звёздочка)
  const inEasyMode = Number(displayStatus.modeEducation) === 1 || Number(displayStatus.modeEducationRevert) === 1;
  const renderProgressIndicator = () => {
    const clickableProps = canOpenGlosbe
      ? {
          role: 'button',
          tabIndex: 0,
          title: 'Открыть в Glosbe',
          onClick: openGlosbe,
          onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') openGlosbe(e); },
          style: { cursor: 'pointer' }
        }
      : {};

    const dash = <span dangerouslySetInnerHTML={{ __html: '&mdash;' }} />;

    if (!userData || !displayStatus.hasAttempts) {
      return (
        <span {...clickableProps}>
          &nbsp;&nbsp;&mdash;&nbsp;&nbsp;
        </span>
      );
    }

    const directLearned = userData.correct_attempts >= 2;
    const revertLearned = userData.correct_attempts_revert >= 2;
    const bothLearned = directLearned && revertLearned;
    const showSimplifiedStar = learnedWithSimplifiedTierTwo(userData);

    let progressClass = 'not-learned';
    let showCheck = false;

    if (bothLearned && !inEasyMode) {
      progressClass = 'fully-learned';
      showCheck = true;
    } else if (bothLearned && inEasyMode) {
      progressClass = 'fully-learned';
      showCheck = true;
    } else if (!inEasyMode && (directLearned || revertLearned)) {
      progressClass = 'partially-learned';
      showCheck = true;
    } else if (inEasyMode && (directLearned || revertLearned)) {
      progressClass = 'partially-learned';
      showCheck = true;
    }

    const showStar = showCheck && showSimplifiedStar;
    const indicatorStyle = {
      ...(clickableProps.style || {}),
      ...(showStar ? { position: 'relative', display: 'inline-block' } : {})
    };

    return (
      <span
        className={`words-progress-indicator ${progressClass}`}
        {...clickableProps}
        style={indicatorStyle}
      >
        {showCheck ? (
          <>
            ✓
            {showStar && (
              <span className="words-progress-indicator__easy-star" aria-hidden="true">
                *
              </span>
            )}
          </>
        ) : (
          dash
        )}
        &nbsp;&nbsp;
      </span>
    );
  };

  return (
    <li
      key={word.id}
      className={`${showInfoHint ? 'words-education-list__row--has-info' : ''} ${denseMeta ? 'words-education-list__row--dense' : ''} ${showDifficultyStats ? 'words-education-list__row--with-stats' : ''}`}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        const tag = e.target?.tagName?.toLowerCase();
        const isFormField = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
        if (isFormField || e.target?.closest?.('.word-editor')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick(e);
        }
      }}
    >
      {showDifficultyStats && <WordDifficultyStats userData={userData} />}

      {denseMeta && (
        <span className="words-education-list__dense-badge">
          <span className="words-education-list__dense-badge-icon">🔒</span>
          <span className="words-education-list__dense-badge-count">{denseMeta.attemptsLeft}</span>
          {!!denseMeta.waitingRemainingSec && (
            <span className="words-education-list__dense-badge-time">
              ⏱️ {formatTime(denseMeta.waitingRemainingSec * 1000)}
            </span>
          )}
        </span>
      )}
      {/* Слово — key принуждает remount при смене режима, избегая removeChild */}
      <span className="words-education-list__word">
        <span key={displayStatus.cooldownRevert ? 'cooldown' : 'ready'}>
        {displayStatus.cooldownRevert ? (
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
            ⏱️ {formatTime(displayStatus.cooldownRevert)}
          </span>
        ) : displayStatus.showWord ? (
          userData && Number(userData.mode_education_revert) === 1 ? (
            <span className="learning-mode-text">
              <span className="learning-mode-icon">📚</span> <span style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}><WordWithPosHint text={word.word} hintFirst /></span>
            </span>
          ) : (
            <WordWithPosHint text={word.word} hintFirst />
          )
        ) : (
          <span className="words-hidden-text">
            {userData && userData.mode_education_revert === 1 ? (
              <span className="learning-mode-text">
                <span className="learning-mode-icon">📚</span> <span style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}><WordWithPosHint text={word.word} hintFirst /></span>
              </span>
            ) : (
              word.word.split('').map((char, index) => 
                char === ' ' ? ' ' : '█ '
              ).join('')
            )}
          </span>
        )}
        </span>
      </span>

      <span className="words-education-list__translation-wrap">
      {/* Перевод 1 — key принуждает remount при смене режима */}
      <span className="words-education-list__translation_1">
        {renderProgressIndicator()}
        <span key={displayStatus.cooldownDirect ? 'cooldown' : 'ready'}>
        {displayStatus.cooldownDirect ? (
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
            ⏱️ {formatTime(displayStatus.cooldownDirect)}
          </span>
        ) : displayStatus.showTranslation ? (
          userData && Number(userData.mode_education) === 1 ? (
            <span className="learning-mode-text">
              <span style={{ color: '#333', fontSize: '16px', fontWeight: 'normal' }}>{word.translation_1}</span> <span className="learning-mode-icon">📚</span>
            </span>
          ) : (
            word.translation_1
          )
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
      </span>

      {showInfoHint && (
        <span
          className="words-education-list__info-hint"
          title="Подсказка"
          onClick={(e) => { e.stopPropagation(); setShowInfoPopover((v) => !v); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setShowInfoPopover((v) => !v); } }}
        >
          ?
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
                  onDeleteWord(word.id, categoryIdForDelete);
                }
              }}
              title={categoryIdForDelete ? "Удалить из категории" : "Удалить слово"}
            >
              🗑️
            </button>
          )}
        </>
      )}

      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, marginLeft: '10px' }}
        />
      )}

      {showInfoPopover && !isEditingThisRow && word.info && String(word.info).trim() && (
        <div className="word-info-popover-backdrop" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
          <div
            ref={popoverRef}
            className="word-info-popover"
            role="dialog"
            aria-label="Подсказка"
          >
            <PopoverHtmlContent html={word.info} />
          </div>
        </div>
      )}

      {editingWordId === word.id && (
        <div className="word-editor-wrap">
          <WordEditor 
            dictionaryId={dictionaryId} 
            word={word} 
            onClose={() => onToggleEdit(null)}
            onRefreshDictionaryWords={onRefreshDictionaryWords}
            onRefreshUserData={onRefreshUserData}
          />
        </div>
      )}
    </li>
  );
};

// Пропускаем ре-рендер при редактировании, если изменились только displayStatus/formatTime
// (избегаем конфликта ReactQuill с обновлениями из setCurrentTime)
function arePropsEqual(prev, next) {
  const isEditingPrev = prev.editingWordId === prev.word?.id;
  const isEditingNext = next.editingWordId === next.word?.id;
  if (isEditingPrev && isEditingNext && prev.word?.id === next.word?.id) {
    return (
      prev.word === next.word &&
      prev.userData === next.userData &&
      prev.editingWordId === next.editingWordId &&
      prev.dictionaryId === next.dictionaryId &&
      prev.categoryIdForDelete === next.categoryIdForDelete &&
      prev.showCheckbox === next.showCheckbox &&
      prev.isSelected === next.isSelected
    );
  }
  return false;
}

export default memo(WordRow, arePropsEqual);
