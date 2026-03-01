import React, { useState, useEffect } from 'react';
import axios from 'axios';

const { useState: wpUseState, useEffect: wpUseEffect } = wp.element;

/**
 * Модальное окно для выбора целевой категории и перемещения/копирования слов
 * 
 * @param {array} wordIds - Массив ID выбранных слов
 * @param {number} sourceCategoryId - ID исходной категории
 * @param {number} sourceDictionaryId - ID исходного словаря
 * @param {function} onClose - Колбэк закрытия модального окна
 * @param {function} onComplete - Колбэк после успешного выполнения операции
 */
const WordBulkMoveModal = ({ wordIds = [], sourceCategoryId, sourceCategoryIds = [], sourceDictionaryId, onClose, onComplete }) => {
  const [dictionaries, setDictionaries] = useState([]);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState(sourceDictionaryId);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [operation, setOperation] = useState('move'); // 'move' или 'copy'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Загружаем список словарей
  useEffect(() => {
    const fetchDictionaries = async () => {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('action', 'get_all_dictionaries');

        const response = await axios.post(window.myajax.url, formData);

        if (response.data.success) {
          setDictionaries(response.data.data);
        } else {
          setError('Ошибка загрузки словарей: ' + (response.data.message || 'Неизвестная ошибка'));
        }
      } catch (err) {
        setError('Ошибка сети: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDictionaries();
  }, []);

  // Автоматически переключаем на копирование при выборе другого словаря
  useEffect(() => {
    if (selectedDictionaryId && selectedDictionaryId != sourceDictionaryId) {
      setOperation('copy');
    }
  }, [selectedDictionaryId, sourceDictionaryId]);

  // Загружаем категории выбранного словаря
  useEffect(() => {
    if (!selectedDictionaryId) {
      setCategories([]);
      setSelectedCategoryId(null);
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const formData = new FormData();
        formData.append('action', 'get_category_tree');
        formData.append('dictionary_id', selectedDictionaryId);

        const response = await axios.post(window.myajax.url, formData);

        if (response.data.success) {
          // Преобразуем дерево категорий в плоский список
          const flattenCategories = (cats, parentName = '') => {
            let result = [];
            cats.forEach(cat => {
              const fullName = parentName ? `${parentName} > ${cat.name}` : cat.name;
              result.push({ id: cat.id, name: fullName, dictionary_id: selectedDictionaryId });
              if (cat.children && cat.children.length > 0) {
                result = result.concat(flattenCategories(cat.children, fullName));
              }
            });
            return result;
          };

          const flatCategories = flattenCategories(response.data.data);
          setCategories(flatCategories);
        } else {
          setError('Ошибка загрузки категорий: ' + (response.data.message || 'Неизвестная ошибка'));
        }
      } catch (err) {
        setError('Ошибка сети: ' + err.message);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [selectedDictionaryId]);

  const handleSubmit = async () => {
    if (!selectedCategoryId) {
      setError('Выберите целевую категорию');
      return;
    }

    if (wordIds.length === 0) {
      setError('Нет выбранных слов');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('action', operation === 'move' ? 'move_words_to_category' : 'copy_words_to_category');
      formData.append('word_ids', JSON.stringify(wordIds));
      formData.append('source_category_id', sourceCategoryId || 0);
      if (Array.isArray(sourceCategoryIds) && sourceCategoryIds.length > 0) {
        const ids = sourceCategoryIds.map(id => parseInt(id, 10)).filter(Boolean);
        if (ids.length > 0) {
          formData.append('source_category_ids', JSON.stringify(ids));
        }
      }
      formData.append('target_category_id', selectedCategoryId);
      
      // Если словарь отличается, передаем его ID
      if (selectedDictionaryId !== sourceDictionaryId) {
        formData.append('target_dictionary_id', selectedDictionaryId);
      }

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        setSuccess(response.data.data.message || 'Операция выполнена успешно');
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 1500);
      } else {
        setError(response.data.message || 'Ошибка при выполнении операции');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedDictionary = dictionaries.find(d => d.id == selectedDictionaryId);
  const isDifferentDictionary = selectedDictionaryId && selectedDictionaryId != sourceDictionaryId;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Переместить/Скопировать слова</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px 0', color: '#666' }}>
            Выбрано слов: <strong>{wordIds.length}</strong>
          </p>
          {isDifferentDictionary && (
            <p style={{ margin: '0 0 10px 0', color: '#ff9800', fontWeight: 'bold' }}>
              ⚠️ Внимание: Выбран другой словарь. Слова будут скопированы в новый словарь.
            </p>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Тип операции:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="move"
                checked={operation === 'move'}
                onChange={(e) => setOperation(e.target.value)}
                disabled={isDifferentDictionary}
              />
              <span>Переместить</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="copy"
                checked={operation === 'copy'}
                onChange={(e) => setOperation(e.target.value)}
              />
              <span>Скопировать</span>
            </label>
          </div>
          {isDifferentDictionary && (
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
              При выборе другого словаря доступно только копирование
            </p>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Целевой словарь:
          </label>
          {loading ? (
            <p>Загрузка словарей...</p>
          ) : (
            <select
              value={selectedDictionaryId || ''}
              onChange={(e) => {
                setSelectedDictionaryId(parseInt(e.target.value));
                setSelectedCategoryId(null);
              }}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="">-- Выберите словарь --</option>
              {dictionaries.map(dict => (
                <option key={dict.id} value={dict.id}>
                  {dict.name} ({dict.lang} → {dict.learn_lang})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Целевая категория:
          </label>
          {loadingCategories ? (
            <p>Загрузка категорий...</p>
          ) : categories.length === 0 ? (
            <p style={{ color: '#999' }}>
              {selectedDictionaryId ? 'В этом словаре нет категорий' : 'Сначала выберите словарь'}
            </p>
          ) : (
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                maxHeight: '200px'
              }}
              size={Math.min(categories.length, 10)}
            >
              <option value="">-- Выберите категорию --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '10px',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {success}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ccc',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedCategoryId}
            style={{
              padding: '10px 20px',
              backgroundColor: loading || !selectedCategoryId ? '#ccc' : '#0073aa',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !selectedCategoryId ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Выполняется...' : operation === 'move' ? 'Переместить' : 'Скопировать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordBulkMoveModal;

