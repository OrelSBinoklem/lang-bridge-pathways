import React, { useState } from 'react';
import WordManagement from '../../components/WordManagement';
import WordBulkActions from '../../components/WordBulkActions';
import { useAdminMode } from '../contexts/AdminModeContext';

/**
 * Универсальный компонент управления словами для всех категорий
 * 
 * Объединяет:
 * - ⚙️ Управление словами (добавление, массовая вставка)
 * - 📦 Переместить/Скопировать слова
 * 
 * Отображается только для админов и только для конкретных категорий (не для categoryId === 0)
 * 
 * @param {function} onBulkActionsToggle - Колбэк для уведомления родителя об изменении состояния выбора
 * @param {function} onSelectedWordsChange - Колбэк для уведомления родителя об изменении выбранных слов
 */
const CategoryWordManagement = ({ 
  dictionaryId, 
  categoryId, 
  sourceCategoryIds = [],
  categoryWords = [],
  dictionaryWords = [],
  categories = [],
  onWordsChanged,
  onBulkActionsToggle,
  onSelectedWordsChange,
  externalShowBulkActions = null,
  externalSelectedWordIds = null
}) => {
  const [internalSelectedWordIds, setInternalSelectedWordIds] = useState([]);
  const [internalShowBulkActions, setInternalShowBulkActions] = useState(false);
  
  // Используем внешнее состояние, если оно передано, иначе внутреннее
  const selectedWordIds = externalSelectedWordIds !== null ? externalSelectedWordIds : internalSelectedWordIds;
  const showBulkActions = externalShowBulkActions !== null ? externalShowBulkActions : internalShowBulkActions;
  
  const setSelectedWordIds = (ids) => {
    if (externalSelectedWordIds === null) {
      setInternalSelectedWordIds(ids);
    }
    if (onSelectedWordsChange) {
      onSelectedWordsChange(ids);
    }
  };
  
  const setShowBulkActions = (show) => {
    if (externalShowBulkActions === null) {
      setInternalShowBulkActions(show);
    }
    if (onBulkActionsToggle) {
      onBulkActionsToggle(show);
    }
  };

  // Показываем только для админов в режиме админа и для конкретных категорий
  const { isAdminModeActive } = useAdminMode();
  const categoryIdNum = parseInt(categoryId) || 0;
  
  if (!isAdminModeActive || categoryIdNum === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '30px' }}>
      {/* Управление словами */}
      <WordManagement
        dictionaryId={dictionaryId}
        categoryId={categoryId}
        existingDictionaryWords={dictionaryWords}
        categoryTree={categories}
        onWordsChanged={onWordsChanged}
      />

      {/* Переместить/Скопировать слова */}
      {categoryWords.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {!showBulkActions ? (
            <div style={{ 
              textAlign: 'center',
              padding: '15px'
            }}>
              <button
                onClick={() => setShowBulkActions(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0073aa',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📦 Переместить/Скопировать слова
              </button>
            </div>
          ) : (
            <WordBulkActions
              dictionaryId={dictionaryId}
              categoryId={categoryId}
              sourceCategoryIds={sourceCategoryIds}
              words={categoryWords}
              selectedWordIds={selectedWordIds}
              onSelectAll={() => {
                if (selectedWordIds.length === categoryWords.length) {
                  setSelectedWordIds([]);
                } else {
                  setSelectedWordIds(categoryWords.map(w => w.id));
                }
              }}
              onClearSelection={() => {
                setSelectedWordIds([]);
                setShowBulkActions(false);
              }}
              onWordsChanged={() => {
                setSelectedWordIds([]);
                setShowBulkActions(false);
                if (onWordsChanged) {
                  onWordsChanged();
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryWordManagement;

