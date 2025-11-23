import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WordBulkMoveModal from './WordBulkMoveModal';

const { useState: wpUseState, useEffect: wpUseEffect } = wp.element;

/**
 * Компонент для массового выбора и управления словами
 * 
 * @param {array} words - Массив слов для отображения
 * @param {number} categoryId - ID текущей категории
 * @param {number} dictionaryId - ID текущего словаря
 * @param {array} selectedWordIds - Массив выбранных ID слов (из родительского компонента)
 * @param {function} onSelectAll - Колбэк для выбора всех слов
 * @param {function} onClearSelection - Колбэк для снятия выделения
 * @param {function} onWordsChanged - Колбэк после изменения слов
 */
const WordBulkActions = ({ 
  words = [], 
  categoryId, 
  dictionaryId, 
  selectedWordIds = [],
  onSelectAll,
  onClearSelection,
  onWordsChanged 
}) => {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(window.myajax && window.myajax.is_admin);
  }, []);

  // Показываем только для админов
  if (!isAdmin) {
    return null;
  }

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    }
  };

  const handleMoveClick = () => {
    if (selectedWordIds.length === 0) {
      alert('Выберите хотя бы одно слово');
      return;
    }
    setShowMoveModal(true);
  };

  const handleMoveComplete = () => {
    setShowMoveModal(false);
    if (onClearSelection) {
      onClearSelection();
    }
    if (onWordsChanged) {
      onWordsChanged();
    }
  };

  const selectedCount = selectedWordIds.length;
  const allSelected = words.length > 0 && selectedWordIds.length === words.length;

  return (
    <div className="word-bulk-actions" style={{
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '5px',
      border: '1px solid #ddd'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 'bold' }}>
            Выбрать все ({words.length})
          </span>
        </label>

        {selectedCount > 0 && (
          <>
            <span style={{ color: '#666' }}>
              Выбрано: {selectedCount}
            </span>
            <button
              onClick={handleMoveClick}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0073aa',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📦 Переместить/Скопировать ({selectedCount})
            </button>
            <button
              onClick={onClearSelection}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ccc',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Снять выделение
            </button>
          </>
        )}
      </div>

      {showMoveModal && (
        <WordBulkMoveModal
          wordIds={selectedWordIds}
          sourceCategoryId={categoryId}
          sourceDictionaryId={dictionaryId}
          onClose={() => setShowMoveModal(false)}
          onComplete={handleMoveComplete}
        />
      )}

      {/* Добавляем чекбоксы к каждому слову */}
      <style>{`
        .word-row-with-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .word-row-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

// Экспортируем функции для использования в WordRow
export const withWordCheckbox = (WordRowComponent) => {
  return ({ word, selectedWordIds, onSelectWord, ...props }) => {
    const isSelected = selectedWordIds && selectedWordIds.includes(word.id);

    return (
      <div className="word-row-with-checkbox">
        {selectedWordIds && (
          <input
            type="checkbox"
            className="word-row-checkbox"
            checked={isSelected}
            onChange={() => onSelectWord && onSelectWord(word.id)}
          />
        )}
        <WordRowComponent word={word} {...props} />
      </div>
    );
  };
};

export default WordBulkActions;

