import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Компонент для управления словами в категориях
 * Отображается под управлением категориями (только для админов)
 */
const WordManager = ({ dictionaryId, categories }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState({
    word: '',
    translation_1: '',
    translation_2: '',
    translation_3: ''
  });

  // Получить плоский список категорий
  const getFlatCategories = (cats, level = 0) => {
    if (!cats || !Array.isArray(cats)) return [];
    let result = [];
    cats.forEach(cat => {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(getFlatCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  const flatCategories = getFlatCategories(categories);

  // Загружаем слова категории
  const loadCategoryWords = async (categoryId) => {
    if (!categoryId) {
      setWords([]);
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'get_words_by_category');
      formData.append('category_id', categoryId);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        setWords(response.data.data);
        setError('');
      } else {
        setError('Ошибка загрузки слов');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // При изменении категории загружаем слова
  useEffect(() => {
    loadCategoryWords(selectedCategory);
  }, [selectedCategory]);

  // Создать новое слово
  const handleCreateWord = async (e) => {
    e.preventDefault();

    if (!newWord.word.trim() || !newWord.translation_1.trim()) {
      setError('Слово и перевод обязательны');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'create_word');
      formData.append('dictionary_id', dictionaryId);
      formData.append('word_data', JSON.stringify(newWord));
      formData.append('category_ids', JSON.stringify(selectedCategory ? [selectedCategory] : []));

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        setNewWord({ word: '', translation_1: '', translation_2: '', translation_3: '' });
        setShowAddForm(false);
        loadCategoryWords(selectedCategory);
        setError('');
      } else {
        setError(response.data.message || 'Ошибка создания слова');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Удалить слово
  const handleDeleteWord = async (wordId) => {
    if (!confirm('Вы уверены, что хотите удалить это слово?')) {
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'delete_word');
      formData.append('word_id', wordId);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        loadCategoryWords(selectedCategory);
        setError('');
      } else {
        setError(response.data.message || 'Ошибка удаления слова');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', marginTop: '30px', border: '2px solid #2196F3', borderRadius: '5px', backgroundColor: '#E3F2FD' }}>
      <h2>Управление словами</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffebee', border: '1px solid #f44336' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Выберите категорию:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ width: '100%', padding: '8px', fontSize: '14px' }}
        >
          <option value="">-- Выберите категорию --</option>
          {flatCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {'—'.repeat(cat.level)} {cat.name} (ID: {cat.id})
            </option>
          ))}
        </select>
      </div>

      {selectedCategory && (
        <>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '20px' }}
          >
            {showAddForm ? 'Отменить' : '+ Добавить слово'}
          </button>

          {showAddForm && (
            <form onSubmit={handleCreateWord} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
              <h4>Новое слово</h4>
              <div style={{ marginBottom: '10px' }}>
                <label>Слово (латышское):</label>
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Перевод 1:</label>
                <input
                  type="text"
                  value={newWord.translation_1}
                  onChange={(e) => setNewWord({...newWord, translation_1: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Перевод 2 (необязательно):</label>
                <input
                  type="text"
                  value={newWord.translation_2}
                  onChange={(e) => setNewWord({...newWord, translation_2: e.target.value})}
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Перевод 3 (необязательно):</label>
                <input
                  type="text"
                  value={newWord.translation_3}
                  onChange={(e) => setNewWord({...newWord, translation_3: e.target.value})}
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>
                {loading ? 'Создание...' : 'Создать слово'}
              </button>
            </form>
          )}

          <div>
            <h4>Слова в категории ({words.length})</h4>
            {loading ? (
              <p>Загрузка...</p>
            ) : words.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Слово</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Перевод 1</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Перевод 2</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Перевод 3</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map(word => (
                    <tr key={word.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{word.id}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}><strong>{word.word}</strong></td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{word.translation_1}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{word.translation_2 || '—'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{word.translation_3 || '—'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        <button 
                          onClick={() => handleDeleteWord(word.id)}
                          disabled={loading}
                          style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>В этой категории нет слов. Добавьте первое слово!</p>
            )}
          </div>
        </>
      )}

      {!selectedCategory && (
        <p style={{ fontStyle: 'italic', color: '#666' }}>
          Выберите категорию для просмотра и управления словами
        </p>
      )}
    </div>
  );
};

export default WordManager;

