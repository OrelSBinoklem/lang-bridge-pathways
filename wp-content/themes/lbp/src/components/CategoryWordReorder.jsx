import axios from "axios";
const { useState, useEffect } = wp.element;

/**
 * Компонент для изменения порядка слов в категории
 * Два режима:
 * 1. Drag & Drop - перетаскивание слов мышью
 * 2. Text mode - вставка списка слов через textarea
 */
const CategoryWordReorder = ({ 
  categoryId, 
  words, 
  onClose, 
  onReorderComplete 
}) => {
  const [mode, setMode] = useState('drag'); // 'drag' или 'text'
  const [orderedWords, setOrderedWords] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Инициализация списка слов (только один раз при монтировании)
  useEffect(() => {
    if (words.length > 0) {
      // Сортируем по текущему order
      const sorted = [...words].sort((a, b) => a.order - b.order);
      setOrderedWords(sorted);
      
      // Заполняем textarea текущим порядком
      const textList = sorted.map(w => w.word).join('\n');
      setTextInput(textList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Только при монтировании, words берем из замыкания

  // === DRAG & DROP MODE ===
  
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newWords = [...orderedWords];
    const draggedWord = newWords[draggedIndex];
    
    // Удаляем из старой позиции
    newWords.splice(draggedIndex, 1);
    // Вставляем в новую позицию
    newWords.splice(index, 0, draggedWord);
    
    setOrderedWords(newWords);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // === TEXT MODE ===
  
  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };

  const applyTextOrder = () => {
    console.log('🔄 Применяем текстовый порядок');
    console.log('📝 Входной текст (построчно):', textInput.split('\n').map(l => l.trim()).filter(l => l));
    
    // Разбиваем по строкам и удаляем пустые
    const lines = textInput.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Создаем массив оставшихся слов для обработки дубликатов
    const remainingWords = [...orderedWords];
    
    const newOrder = [];
    const notFound = [];
    
    lines.forEach(line => {
      // Ищем первое совпадение среди оставшихся слов
      const wordIndex = remainingWords.findIndex(w => w.word.toLowerCase() === line.toLowerCase());
      
      if (wordIndex !== -1) {
        // Нашли слово - добавляем и удаляем из оставшихся
        newOrder.push(remainingWords[wordIndex]);
        remainingWords.splice(wordIndex, 1);
      } else {
        notFound.push(line);
      }
    });
    
    // Добавляем слова, которые не были упомянуты, в конец
    remainingWords.forEach(word => {
      newOrder.push(word);
    });
    
    if (notFound.length > 0) {
      console.warn('⚠️ Не найденные слова:', notFound);
      setError(`Слова не найдены в категории: ${notFound.join(', ')}`);
    } else {
      setError(null);
    }
    
    console.log('✅ Новый порядок применен:');
    newOrder.forEach((word, index) => {
      console.log(`${index + 1}. [ID: ${word.id}] ${word.word} → ${word.translation_1 || ''}`);
    });
    
    setOrderedWords(newOrder);
    
    // Переключаемся на режим drag для визуального подтверждения
    setMode('drag');
  };

  // === SAVE ===
  
  const handleSave = async () => {
    console.log('💾 Начинаем сохранение нового порядка');
    setSaving(true);
    setError(null);
    
    try {
      // Получаем финальный порядок слов
      let finalWords = orderedWords;
      
      // Если в текстовом режиме, применяем порядок из текста
      if (mode === 'text') {
        console.log('📝 В текстовом режиме - применяем порядок из текста');
        
        const lines = textInput.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        const remainingWords = [...orderedWords];
        const newOrder = [];
        
        lines.forEach(line => {
          const wordIndex = remainingWords.findIndex(w => w.word.toLowerCase() === line.toLowerCase());
          if (wordIndex !== -1) {
            newOrder.push(remainingWords[wordIndex]);
            remainingWords.splice(wordIndex, 1);
          }
        });
        
        // Добавляем не упомянутые слова в конец
        remainingWords.forEach(word => newOrder.push(word));
        
        finalWords = newOrder;
      }
      
      // Создаем массив с новым порядком
      const wordOrders = finalWords.map((word, index) => ({
        word_id: word.id,
        order: index + 1 // order начинается с 1
      }));
      
      console.log('📤 Отправляем данные:', {
        category_id: categoryId,
        words_count: wordOrders.length
      });
      
      // Показываем все слова в порядке сохранения
      console.log('📋 СПИСОК СЛОВ В НОВОМ ПОРЯДКЕ:');
      finalWords.forEach((word, index) => {
        console.log(`${index + 1}. [ID: ${word.id}] ${word.word} → ${word.translation_1 || ''}`);
      });
      
      console.log('📦 Данные для отправки (word_orders):', wordOrders);
      
      const formData = new FormData();
      formData.append('action', 'reorder_category_words');
      formData.append('category_id', categoryId);
      formData.append('word_orders', JSON.stringify(wordOrders));
      
      const response = await axios.post(window.myajax.url, formData);
      
      console.log('📥 Ответ сервера:', response.data);
      
      if (response.data.success) {
        console.log('✅ Сохранение успешно');
        if (onReorderComplete) {
          onReorderComplete();
        }
        onClose();
      } else {
        console.error('❌ Ошибка от сервера:', response.data.data?.message);
        setError(response.data.data?.message || 'Ошибка при сохранении');
      }
    } catch (err) {
      console.error('❌ Ошибка сети:', err);
      setError('Ошибка сети: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Функция для перемешивания слов (случайный порядок)
  const handleShuffle = () => {
    const shuffled = [...orderedWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrderedWords(shuffled);
    
    // Обновляем текстовое поле
    const textList = shuffled.map(w => w.word).join('\n');
    setTextInput(textList);
  };

  return (
    <div className="word-reorder-modal">
      <div className="word-reorder-overlay" onClick={onClose}></div>
      <div className="word-reorder-content">
        <div className="word-reorder-header">
          <h2>Изменить порядок слов в категории</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="word-reorder-toolbar">
          <div className="mode-switch">
            <button 
              className={mode === 'drag' ? 'active' : ''}
              onClick={() => setMode('drag')}
            >
              🖱️ Перетаскивание
            </button>
            <button 
              className={mode === 'text' ? 'active' : ''}
              onClick={() => setMode('text')}
            >
              📝 Текстовый режим
            </button>
          </div>
          
          <button 
            className="shuffle-btn"
            onClick={handleShuffle}
            title="Перемешать случайным образом"
          >
            🎲 Перемешать
          </button>
        </div>

        {error && (
          <div className="word-reorder-error">
            {error}
          </div>
        )}

        <div className="word-reorder-body">
          {mode === 'drag' ? (
            <div className="drag-mode">
              <p className="hint">Перетащите слова мышью для изменения порядка</p>
              <div className="words-list">
                {orderedWords.map((word, index) => (
                  <div
                    key={word.id}
                    className={`word-item ${draggedIndex === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="word-order">{index + 1}</span>
                    <span className="word-text">{word.word}</span>
                    <span className="word-translation">
                      {word.translation_1 && word.translation_1 !== '0' ? word.translation_1 : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-mode">
              <p className="hint">
                Вставьте список слов (по одному на строку). 
                Порядок строк = новый порядок слов.
              </p>
              <textarea
                value={textInput}
                onChange={handleTextChange}
                rows={15}
                placeholder="Введите слова, по одному на строку..."
              />
              <button 
                className="apply-text-btn"
                onClick={applyTextOrder}
              >
                Применить порядок из текста
              </button>
            </div>
          )}
        </div>

        <div className="word-reorder-footer">
          <button 
            className="cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>
          <button 
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить новый порядок'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryWordReorder;

