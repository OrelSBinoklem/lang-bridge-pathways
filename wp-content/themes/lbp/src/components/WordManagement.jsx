import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Компонент для управления словами прямо в категории
 * Отображается только для админов
 */
const WordManagement = ({ dictionaryId, categoryId, onWordsChanged }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkInsert, setShowBulkInsert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkTargetCategoryId, setBulkTargetCategoryId] = useState(categoryId);
  const [bulkTargetOptions, setBulkTargetOptions] = useState([]);
  const [newWord, setNewWord] = useState({
    word: '',
    translation_1: '',
    translation_2: '',
    translation_3: '',
    translation_input_variable: '',
    difficult_translation: '',
    info: '',
    sound_url: '',
    level: '',
    maxLevel: '',
    type: '',
    gender: '',
    is_phrase: '0'
  });

  const createWord = async (wordData, targetCategoryIds = [categoryId]) => {
    const formData = new FormData();
    formData.append('action', 'create_word');
    formData.append('dictionary_id', dictionaryId);
    formData.append('word_data', JSON.stringify(wordData));
    formData.append('category_ids', JSON.stringify(targetCategoryIds));

    const response = await axios.post(window.myajax.url, formData);
    return response.data;
  };

  useEffect(() => {
    setBulkTargetCategoryId(categoryId);
  }, [categoryId]);

  useEffect(() => {
    if (!showBulkInsert || !dictionaryId || !categoryId) return;

    const fetchTargetCategories = async () => {
      try {
        const formData = new FormData();
        formData.append('action', 'get_category_tree');
        formData.append('dictionary_id', dictionaryId);

        const response = await axios.post(window.myajax.url, formData);
        if (!response.data?.success || !Array.isArray(response.data.data)) {
          setBulkTargetOptions([]);
          return;
        }

        const toInt = (v) => parseInt(v, 10);
        const currentId = toInt(categoryId);

        const findNodeById = (nodes, id) => {
          for (const node of nodes) {
            if (toInt(node.id) === id) return node;
            if (node.children && node.children.length > 0) {
              const found = findNodeById(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const currentNode = findNodeById(response.data.data, currentId);
        if (!currentNode) {
          setBulkTargetOptions([]);
          return;
        }

        const childOptions = (currentNode.children || []).map((child) => ({
          id: toInt(child.id),
          name: child.name
        }));

        setBulkTargetOptions([
          { id: currentId, name: `${currentNode.name} (текущая категория)` },
          ...childOptions
        ]);
      } catch (err) {
        console.error('Ошибка загрузки подкатегорий для массовой вставки:', err);
        setBulkTargetOptions([]);
      }
    };

    fetchTargetCategories();
  }, [showBulkInsert, dictionaryId, categoryId]);

  const handleCreateWord = async (e) => {
    e.preventDefault();

    if (!newWord.word.trim() || !newWord.translation_1.trim()) {
      setError('Слово и перевод обязательны');
      return;
    }

    try {
      setLoading(true);
      const result = await createWord(newWord);
      
      if (result.success) {
        setNewWord({ 
          word: '', 
          translation_1: '', 
          translation_2: '', 
          translation_3: '',
          translation_input_variable: '',
          difficult_translation: '',
          info: '',
          sound_url: '',
          level: '',
          maxLevel: '',
          type: '',
          gender: '',
          is_phrase: '0'
        });
        setShowAddForm(false);
        setError('');
        // Обновляем список слов
        if (onWordsChanged) {
          onWordsChanged();
        }
      } else {
        setError(result.message || 'Ошибка создания слова');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseBulkText = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const words = [];

    for (const line of lines) {
      // Поддерживаем запятую, табуляцию и точку с запятой как разделители
      const parts = line.split(/[,\t;]/).map(part => part.trim()).filter(part => part);
      
      if (parts.length >= 2) {
        words.push({
          word: parts[0],
          translation_1: parts[1],
          translation_2: parts[2] || '',
          translation_3: parts[3] || '',
          translation_input_variable: '',
          difficult_translation: '',
          info: '',
          sound_url: '',
          level: '',
          maxLevel: '',
          type: '',
          gender: '',
          is_phrase: '0'
        });
      }
    }

    return words;
  };

  const handleBulkInsert = async () => {
    if (!bulkText.trim()) {
      setError('Введите список слов');
      return;
    }

    const words = parseBulkText(bulkText);
    
    if (words.length === 0) {
      setError('Не удалось распарсить слова. Формат: слово,перевод1,перевод2,перевод3 (каждое слово с новой строки)');
      return;
    }

    try {
      setBulkLoading(true);
      setError('');
      setBulkProgress({ current: 0, total: words.length });

      let successCount = 0;
      let errorCount = 0;
      const targetCategory = parseInt(bulkTargetCategoryId, 10) || parseInt(categoryId, 10);
      const targetCategoryIds = [targetCategory];

      for (let i = 0; i < words.length; i++) {
        setBulkProgress({ current: i + 1, total: words.length });
        
        try {
          const result = await createWord(words[i], targetCategoryIds);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Ошибка создания слова "${words[i].word}":`, result.message);
          }
        } catch (err) {
          errorCount++;
          console.error(`Ошибка создания слова "${words[i].word}":`, err.message);
        }

        // Небольшая задержка между запросами, чтобы не перегружать сервер
        if (i < words.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setBulkText('');
      setShowBulkInsert(false);
      
      if (errorCount > 0) {
        setError(`Создано: ${successCount}, ошибок: ${errorCount}`);
      } else {
        setError('');
      }

      // Обновляем список слов
      if (onWordsChanged) {
        onWordsChanged();
      }
    } catch (err) {
      setError('Ошибка при массовой вставке: ' + err.message);
    } finally {
      setBulkLoading(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const getCategoryWords = async () => {
    if (!categoryId) return [];

    try {
      const formData = new FormData();
      formData.append('action', 'get_words_by_category');
      formData.append('category_id', categoryId);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (err) {
      console.error('Ошибка получения слов категории:', err);
      return [];
    }
  };

  const deleteWord = async (wordId, categoryIdForDelete) => {
    const formData = new FormData();
    formData.append('action', 'delete_word');
    formData.append('word_id', wordId);
    if (categoryIdForDelete) {
      formData.append('category_id', categoryIdForDelete);
    }

    const response = await axios.post(window.myajax.url, formData);
    return response.data;
  };

  const handleDeleteAllWords = async () => {
    if (!categoryId) {
      setError('Категория не выбрана');
      return;
    }

    const confirmMessage = 'Вы уверены, что хотите удалить ВСЕ слова из этой категории? Это действие нельзя отменить!';
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleteAllLoading(true);
      setError('');

      // Получаем все слова категории
      const words = await getCategoryWords();
      
      if (words.length === 0) {
        setError('В категории нет слов для удаления');
        setDeleteAllLoading(false);
        return;
      }

      setBulkProgress({ current: 0, total: words.length });

      let successCount = 0;
      let errorCount = 0;

      // Удаляем каждое слово
      for (let i = 0; i < words.length; i++) {
        setBulkProgress({ current: i + 1, total: words.length });
        
        try {
          const result = await deleteWord(words[i].id, categoryId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Ошибка удаления слова "${words[i].word}":`, result.message);
          }
        } catch (err) {
          errorCount++;
          console.error(`Ошибка удаления слова "${words[i].word}":`, err.message);
        }

        // Небольшая задержка между запросами
        if (i < words.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (errorCount > 0) {
        setError(`Удалено: ${successCount}, ошибок: ${errorCount}`);
      } else {
        setError('');
      }

      // Обновляем список слов
      if (onWordsChanged) {
        onWordsChanged();
      }
    } catch (err) {
      setError('Ошибка при удалении слов: ' + err.message);
    } finally {
      setDeleteAllLoading(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50', borderRadius: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, color: '#2e7d32' }}>⚙️ Управление словами (только для админов)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => {
              setShowBulkInsert(false);
              setShowAddForm(!showAddForm);
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {showAddForm ? '✕ Отменить' : '+ Добавить слово'}
          </button>
          <button 
            onClick={() => {
              setShowAddForm(false);
              setShowBulkInsert(!showBulkInsert);
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#FF9800', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {showBulkInsert ? '✕ Отменить' : '📋 Вставить список'}
          </button>
          <button 
            onClick={handleDeleteAllWords}
            disabled={deleteAllLoading || bulkLoading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: deleteAllLoading ? '#ccc' : '#f44336', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: deleteAllLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {deleteAllLoading ? `🗑️ Удаление... (${bulkProgress.current}/${bulkProgress.total})` : '🗑️ Удалить все слова'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#d32f2f', marginBottom: '10px', padding: '8px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleCreateWord} style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {/* Левая колонка */}
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Слово (латышское):</label>
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Введите слово..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Перевод 1:</label>
                <input
                  type="text"
                  value={newWord.translation_1}
                  onChange={(e) => setNewWord({...newWord, translation_1: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Основной перевод..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Перевод 2:</label>
                <input
                  type="text"
                  value={newWord.translation_2}
                  onChange={(e) => setNewWord({...newWord, translation_2: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Альтернативный перевод..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Перевод 3:</label>
                <input
                  type="text"
                  value={newWord.translation_3}
                  onChange={(e) => setNewWord({...newWord, translation_3: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Ещё один вариант..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Доп. варианты (через запятую):
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal', marginLeft: '5px' }}>
                    (не отображаются, но учитываются при проверке)
                  </span>
                </label>
                <input
                  type="text"
                  value={newWord.translation_input_variable}
                  onChange={(e) => setNewWord({...newWord, translation_input_variable: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="вариант1, вариант2, вариант3"
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Сложный перевод:</label>
                <input
                  type="text"
                  value={newWord.difficult_translation}
                  onChange={(e) => setNewWord({...newWord, difficult_translation: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Сложный вариант перевода..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Info:</label>
                <input
                  type="text"
                  value={newWord.info}
                  onChange={(e) => setNewWord({...newWord, info: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Дополнительная информация..."
                />
              </div>
            </div>

            {/* Правая колонка */}
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Ссылка на звук:</label>
                <input
                  type="text"
                  value={newWord.sound_url}
                  onChange={(e) => setNewWord({...newWord, sound_url: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="URL звукового файла..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Уровень:</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={newWord.level}
                  onChange={(e) => setNewWord({...newWord, level: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="1-6"
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Макс. уровень:</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={newWord.maxLevel}
                  onChange={(e) => setNewWord({...newWord, maxLevel: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="1-6"
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Тип:</label>
                <input
                  type="text"
                  value={newWord.type}
                  onChange={(e) => setNewWord({...newWord, type: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Тип слова..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Род:</label>
                <input
                  type="text"
                  value={newWord.gender}
                  onChange={(e) => setNewWord({...newWord, gender: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Род слова..."
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Фраза:</label>
                <select
                  value={newWord.is_phrase}
                  onChange={(e) => setNewWord({...newWord, is_phrase: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="0">Нет</option>
                  <option value="1">Да</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                padding: '12px 30px', 
                backgroundColor: '#2196F3', 
                color: 'white', 
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {loading ? 'Создание...' : '✓ Создать слово'}
            </button>
          </div>
        </form>
      )}

      {showBulkInsert && (
        <div style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Куда добавить слова:
            </label>
            <select
              value={bulkTargetCategoryId || ''}
              onChange={(e) => setBulkTargetCategoryId(parseInt(e.target.value, 10))}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' }}
              disabled={bulkLoading}
            >
              {bulkTargetOptions.length > 0 ? (
                bulkTargetOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))
              ) : (
                <option value={categoryId}>Текущая категория</option>
              )}
            </select>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Вставьте список слов (CSV формат):
            </label>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Формат: слово,перевод1,перевод2,перевод3 (каждое слово с новой строки)
              <br />
              Разделители: запятая, табуляция или точка с запятой
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="suns,собака,пес&#10;kaķis,кот,кошка&#10;zirgs,лошадь"
              style={{ 
                width: '100%', 
                minHeight: '200px', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
              disabled={bulkLoading}
            />
          </div>

          {(bulkLoading || deleteAllLoading) && bulkProgress.total > 0 && (
            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#e3f2fd', border: '1px solid #2196F3', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                Обработка: {bulkProgress.current} / {bulkProgress.total}
              </div>
              <div style={{ width: '100%', backgroundColor: '#ddd', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, 
                    backgroundColor: '#2196F3', 
                    height: '100%',
                    transition: 'width 0.3s'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={handleBulkInsert}
              disabled={bulkLoading || !bulkText.trim()}
              style={{ 
                padding: '12px 30px', 
                backgroundColor: bulkLoading ? '#ccc' : '#FF9800', 
                color: 'white', 
                border: 'none',
                borderRadius: '4px',
                cursor: bulkLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {bulkLoading ? `Обработка... (${bulkProgress.current}/${bulkProgress.total})` : '✓ Вставить слова'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordManagement;

