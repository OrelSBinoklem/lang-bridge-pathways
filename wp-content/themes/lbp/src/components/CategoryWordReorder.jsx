import axios from "axios";
const { useState, useEffect, useMemo } = wp.element;

const wordBelongsToCategoryId = (word, catIdNum) => {
  if (word.category_id !== undefined) return parseInt(word.category_id, 10) === catIdNum;
  if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
    return word.category_ids.some(id => parseInt(id, 10) === catIdNum);
  }
  return false;
};

/**
 * Компонент для изменения порядка слов в категории.
 * Если передан subcategories — показываются группы (корневая категория + подкатегории), перетаскивание между группами и внутри.
 */
const CategoryWordReorder = ({ 
  categoryId, 
  subcategories = [], 
  words, 
  onClose, 
  onReorderComplete 
}) => {
  const [mode, setMode] = useState('drag');
  const [orderedWords, setOrderedWords] = useState([]);
  const [groups, setGroups] = useState([]); // [{ id, name, words: [] }, ...]
  const [wordToInitialCategoryId, setWordToInitialCategoryId] = useState(new Map()); // для сохранения перемещений
  const [textInput, setTextInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [draggedGroup, setDraggedGroup] = useState(null);
  const [draggedWordIndex, setDraggedWordIndex] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { groupIndex, wordIndex } или { groupIndex, wordIndex: -1 }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sortingWithAI, setSortingWithAI] = useState(false);

  const hasGroups = subcategories && subcategories.length > 0;

  // Инициализация: плоский список или группы по подкатегориям
  useEffect(() => {
    if (words.length === 0) return;
    const sortedAll = [...words].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!hasGroups) {
      setOrderedWords(sortedAll);
      setTextInput(sortedAll.map(w => w.word).join('\n'));
      return;
    }
    const catIdNum = parseInt(categoryId, 10);
    const direct = sortedAll.filter(w => wordBelongsToCategoryId(w, catIdNum));
    const directSorted = [...direct].sort((a, b) => (a.order || 0) - (b.order || 0));
    const initialGroups = [
      { id: categoryId, name: 'Слова категории', words: directSorted }
    ];
    const wordToCat = new Map();
    directSorted.forEach(w => wordToCat.set(w.id, catIdNum));
    subcategories.forEach(sub => {
      const subIdNum = parseInt(sub.id, 10);
      const subWords = sortedAll.filter(w => wordBelongsToCategoryId(w, subIdNum));
      subWords.forEach(w => wordToCat.set(w.id, subIdNum));
      initialGroups.push({
        id: sub.id,
        name: sub.name,
        words: [...subWords].sort((a, b) => (a.order || 0) - (b.order || 0))
      });
    });
    setGroups(initialGroups);
    setWordToInitialCategoryId(wordToCat);
    setTextInput(sortedAll.map(w => w.word).join('\n'));
  }, [words.length, categoryId, hasGroups, subcategories?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // === DRAG & DROP (плоский список, без подкатегорий) ===
  const handleDragStart = (e, index) => {
    if (hasGroups) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverFlat = (e, index) => {
    e.preventDefault();
    if (hasGroups || draggedIndex === null || draggedIndex === index) return;
    const newWords = [...orderedWords];
    const draggedWord = newWords[draggedIndex];
    newWords.splice(draggedIndex, 1);
    newWords.splice(index, 0, draggedWord);
    setOrderedWords(newWords);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedGroup(null);
    setDraggedWordIndex(null);
    setDropTarget(null);
  };

  // === DRAG & DROP (группы: между подкатегориями и внутри) ===
  const handleGroupDragStart = (e, groupIndex, wordIndex) => {
    if (!hasGroups) return;
    setDraggedGroup(groupIndex);
    setDraggedWordIndex(wordIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e, targetGroupIndex, targetWordIndex) => {
    e.preventDefault();
    if (!hasGroups) return;
    // Внутри одной подкатегории переставляем сразу на dragOver (как в плоском режиме),
    // иначе при drop на соседний элемент визуально может казаться, что порядок не меняется.
    if (
      draggedGroup !== null &&
      draggedWordIndex !== null &&
      draggedGroup === targetGroupIndex &&
      targetWordIndex >= 0 &&
      draggedWordIndex !== targetWordIndex
    ) {
      setGroups(prev => {
        const next = prev.map(gr => ({ ...gr, words: [...gr.words] }));
        const list = next[targetGroupIndex].words;
        const moved = list[draggedWordIndex];
        list.splice(draggedWordIndex, 1);
        let insertAt = targetWordIndex;
        // При движении вниз после удаления индекс сдвигается на -1 (off-by-one),
        // иначе визуально "тащится соседний" элемент.
        if (insertAt > draggedWordIndex) insertAt -= 1;
        list.splice(insertAt, 0, moved);
        return next;
      });
      let nextDraggedIndex = targetWordIndex;
      if (nextDraggedIndex > draggedWordIndex) nextDraggedIndex -= 1;
      setDraggedWordIndex(nextDraggedIndex);
    }
    setDropTarget({ groupIndex: targetGroupIndex, wordIndex: targetWordIndex });
  };

  const getDropIndexByPointer = (e, wordIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLowerHalf = (e.clientY - rect.top) > rect.height / 2;
    return isLowerHalf ? wordIndex + 1 : wordIndex;
  };

  const handleGroupDrop = (e, targetGroupIndex, targetWordIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasGroups || draggedGroup === null || draggedWordIndex === null) return;
    const g = groups.map(gr => ({ ...gr, words: [...gr.words] }));
    const src = g[draggedGroup];
    const word = src.words[draggedWordIndex];
    if (draggedGroup === targetGroupIndex) {
      // Внутри той же группы порядок уже обновляется в handleGroupDragOver.
      // На drop дублировать перестановку нельзя — иначе получается смещение "на 1 позицию".
      // Исключение: дроп в пустую область группы (targetWordIndex = -1) — отправляем в конец.
      if (targetWordIndex < 0) {
        const list = [...src.words];
        list.splice(draggedWordIndex, 1);
        list.push(word);
        g[targetGroupIndex] = { ...src, words: list };
      }
    } else {
      src.words.splice(draggedWordIndex, 1);
      const target = g[targetGroupIndex];
      const insertAt = targetWordIndex < 0 ? target.words.length : Math.min(targetWordIndex, target.words.length);
      target.words.splice(insertAt, 0, word);
    }
    setGroups(g);
    handleDragEnd();
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
    setSaving(true);
    setError(null);
    try {
      if (hasGroups && groups.length > 0) {
        // Группы: сначала перемещаем слова между категориями, потом сохраняем порядок в каждой
        const initialCat = wordToInitialCategoryId;
        for (const group of groups) {
          const targetCatId = parseInt(group.id, 10);
          for (let i = 0; i < group.words.length; i++) {
            const w = group.words[i];
            const prevCatId = initialCat.get(w.id);
            if (prevCatId !== undefined && prevCatId !== targetCatId) {
              const formData = new FormData();
              formData.append('action', 'move_words_to_category');
              formData.append('word_ids', JSON.stringify([w.id]));
              formData.append('source_category_id', prevCatId);
              formData.append('target_category_id', targetCatId);
              const res = await axios.post(window.myajax.url, formData);
              if (!res.data.success) {
                setError(res.data.data?.message || 'Ошибка перемещения слова');
                setSaving(false);
                return;
              }
            }
          }
        }
        for (const group of groups) {
          // Пустые группы не отправляем: backend ожидает непустой массив word_orders.
          if (!Array.isArray(group.words) || group.words.length === 0) {
            continue;
          }
          const wordOrders = group.words.map((w, i) => ({ word_id: w.id, order: i + 1 }));
          const formData = new FormData();
          formData.append('action', 'reorder_category_words');
          formData.append('category_id', group.id);
          formData.append('word_orders', JSON.stringify(wordOrders));
          const res = await axios.post(window.myajax.url, formData);
          if (!res.data.success) {
            setError(res.data.data?.message || 'Ошибка сохранения порядка');
            setSaving(false);
            return;
          }
        }
      } else {
        let finalWords = orderedWords;
        if (mode === 'text') {
          const lines = textInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const remaining = [...orderedWords];
          const newOrder = [];
          lines.forEach(line => {
            const idx = remaining.findIndex(w => w.word.toLowerCase() === line.toLowerCase());
            if (idx !== -1) { newOrder.push(remaining[idx]); remaining.splice(idx, 1); }
          });
          remaining.forEach(w => newOrder.push(w));
          finalWords = newOrder;
        }
        const wordOrders = finalWords.map((w, i) => ({ word_id: w.id, order: i + 1 }));
        const formData = new FormData();
        formData.append('action', 'reorder_category_words');
        formData.append('category_id', categoryId);
        formData.append('word_orders', JSON.stringify(wordOrders));
        const response = await axios.post(window.myajax.url, formData);
        if (!response.data.success) {
          setError(response.data.data?.message || 'Ошибка при сохранении');
          setSaving(false);
          return;
        }
      }
      if (onReorderComplete) onReorderComplete();
      onClose();
    } catch (err) {
      setError('Ошибка сети: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const handleShuffle = () => {
    if (hasGroups && groups.length > 0) {
      setGroups(prev => prev.map(gr => ({ ...gr, words: shuffleArray(gr.words) })));
      const flat = groups.flatMap(gr => gr.words);
      setTextInput(flat.map(w => w.word).join('\n'));
    } else {
      const shuffled = shuffleArray(orderedWords);
      setOrderedWords(shuffled);
      setTextInput(shuffled.map(w => w.word).join('\n'));
    }
  };

  // Функция для автоматической сортировки через AI
  const handleAISort = async () => {
    console.log('🤖 Запускаем AI сортировку');
    setSortingWithAI(true);
    setError(null);

    try {
      // Сначала перемешиваем слова случайным образом, чтобы GPT не мог схалтурить
      const shuffled = [...orderedWords];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      console.log('🎲 Перемешали слова перед отправкой в AI');
      
      // Подготавливаем данные для отправки
      const wordsData = shuffled.map(word => ({
        id: word.id,
        word: word.word,
        translation_1: word.translation_1 || ''
      }));

      console.log('📤 Отправляем перемешанные слова на AI сортировку:', wordsData.length);

      const formData = new FormData();
      formData.append('action', 'sort_words_with_ai');
      formData.append('category_id', categoryId);
      formData.append('words', JSON.stringify(wordsData));

      const response = await axios.post(window.myajax.url, formData);

      console.log('📥 Ответ от AI:', response.data);

      if (response.data.success) {
        const sortedWords = response.data.data.sorted_words;
        
        // Находим полные объекты слов по ID
        const fullSortedWords = sortedWords.map(sortedWord => {
          return orderedWords.find(w => w.id === sortedWord.id);
        }).filter(Boolean);

        console.log('✅ AI отсортировал слова:', fullSortedWords.length);
        
        setOrderedWords(fullSortedWords);
        
        // Обновляем текстовое поле
        const textList = fullSortedWords.map(w => w.word).join('\n');
        setTextInput(textList);

        // Переключаемся на режим drag для визуального подтверждения
        setMode('drag');
      } else {
        setError(response.data.data?.message || 'Ошибка AI сортировки');
      }
    } catch (err) {
      console.error('❌ Ошибка AI сортировки:', err);
      setError('Ошибка сети: ' + err.message);
    } finally {
      setSortingWithAI(false);
    }
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
              disabled={sortingWithAI}
            >
              🖱️ Перетаскивание
            </button>
            {!hasGroups && (
              <button 
                className={mode === 'text' ? 'active' : ''}
                onClick={() => setMode('text')}
                disabled={sortingWithAI}
              >
                📝 Текстовый режим
              </button>
            )}
          </div>
          
          <div className="toolbar-actions">
            {!hasGroups && (
              <button 
                className="ai-sort-btn"
                onClick={handleAISort}
                disabled={sortingWithAI}
                title="Автоматическая сортировка по смыслу через AI"
              >
                {sortingWithAI ? '⏳ Сортирую...' : '🤖 Упорядочить ботом'}
              </button>
            )}
            <button 
              className="shuffle-btn"
              onClick={handleShuffle}
              disabled={sortingWithAI}
              title="Перемешать случайным образом"
            >
              🎲 Перемешать
            </button>
          </div>
        </div>

        {error && (
          <div className="word-reorder-error">
            {error}
          </div>
        )}

        <div className="word-reorder-body">
          {mode === 'drag' ? (
            <div className="drag-mode">
              <p className="hint">
                {hasGroups
                  ? 'Перетащите слова мышью для изменения порядка. Можно перетаскивать между блоками (корневая категория и подкатегории).'
                  : 'Перетащите слова мышью для изменения порядка'}
              </p>
              {hasGroups && groups.length > 0 ? (
                <div className="words-list-by-groups">
                  {groups.map((group, groupIndex) => (
                    <div
                      key={group.id}
                      className={`word-reorder-group ${dropTarget && dropTarget.groupIndex === groupIndex ? 'drop-target' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleGroupDragOver(e, groupIndex, -1);
                      }}
                      onDrop={(e) => handleGroupDrop(e, groupIndex, -1)}
                      onDragLeave={() => setDropTarget(null)}
                    >
                      <h4 className="word-reorder-group-title">{group.name}</h4>
                      <div className="words-list">
                        {group.words.map((word, wordIndex) => (
                          <div
                            key={word.id}
                            className={`word-item ${draggedGroup === groupIndex && draggedWordIndex === wordIndex ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleGroupDragStart(e, groupIndex, wordIndex)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const dropIndex = getDropIndexByPointer(e, wordIndex);
                              handleGroupDragOver(e, groupIndex, dropIndex);
                            }}
                            onDrop={(e) => {
                              const dropIndex = getDropIndexByPointer(e, wordIndex);
                              handleGroupDrop(e, groupIndex, dropIndex);
                            }}
                            onDragEnd={handleDragEnd}
                          >
                            <span className="word-order">{wordIndex + 1}</span>
                            <span className="word-text">{word.word}</span>
                            <span className="word-translation">
                              {word.translation_1 && word.translation_1 !== '0' ? word.translation_1 : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="words-list">
                  {orderedWords.map((word, index) => (
                    <div
                      key={word.id}
                      className={`word-item ${draggedIndex === index ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOverFlat(e, index)}
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
              )}
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

