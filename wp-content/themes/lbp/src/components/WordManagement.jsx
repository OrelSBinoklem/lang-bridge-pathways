import React, { useState } from 'react';
import axios from 'axios';

/**
 * Компонент для управления словами прямо в категории
 * Отображается только для админов
 */
const WordManagement = ({ dictionaryId, categoryId, onWordsChanged }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newWord, setNewWord] = useState({
    word: '',
    translation_1: '',
    translation_2: '',
    translation_3: '',
    difficult_translation: '',
    sound_url: '',
    level: '',
    maxLevel: '',
    type: '',
    gender: '',
    is_phrase: '0'
  });

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
      formData.append('category_ids', JSON.stringify([categoryId]));

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        setNewWord({ 
          word: '', 
          translation_1: '', 
          translation_2: '', 
          translation_3: '',
          difficult_translation: '',
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
        setError(response.data.message || 'Ошибка создания слова');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50', borderRadius: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#2e7d32' }}>⚙️ Управление словами (только для админов)</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
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
                <label style={{ display: 'block', marginBottom: '5px' }}>Сложный перевод:</label>
                <input
                  type="text"
                  value={newWord.difficult_translation}
                  onChange={(e) => setNewWord({...newWord, difficult_translation: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Сложный вариант перевода..."
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
    </div>
  );
};

export default WordManagement;

