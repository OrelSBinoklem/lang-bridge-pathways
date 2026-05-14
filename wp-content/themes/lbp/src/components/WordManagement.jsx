import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import WordEditor from '../WordEditor';

/**
 * Разбор строк CSV: валидные записи и ошибки (номер строки с 1).
 */
function analyzeBulkCsvLines(text) {
  const validRows = [];
  const invalidLines = [];
  const lines = String(text || '').split(/\n/);

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/[,\t;]/).map((p) => p.trim()).filter((p) => p.length > 0);

    if (parts.length < 2) {
      invalidLines.push({
        lineNum,
        rawLine: trimmed,
        message: 'Нужны минимум 2 колонки: слово, перевод1 (остальные опционально)',
      });
      return;
    }

    const word = parts[0];
    const translation_1 = parts[1];

    if (!String(word).trim()) {
      invalidLines.push({
        lineNum,
        rawLine: trimmed,
        message: 'Первый столбец (слово) пустой',
      });
      return;
    }
    if (!String(translation_1).trim()) {
      invalidLines.push({
        lineNum,
        rawLine: trimmed,
        message: 'Второй столбец (перевод 1) пустой',
      });
      return;
    }

    validRows.push({
      lineNum,
      rawLine: trimmed,
      word,
      translation_1,
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
      is_phrase: '0',
    });
  });

  return { validRows, invalidLines };
}

/**
 * Компонент для управления словами прямо в категории
 * Отображается только для админов
 */
const WordManagement = ({ dictionaryId, categoryId, categoryWords = [], existingDictionaryWords = [], categoryTree = [], onWordsChanged }) => {
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
  const [dictionaryWords, setDictionaryWords] = useState([]);
  const [dictionaryWordsLoading, setDictionaryWordsLoading] = useState(false);
  const [duplicateCheckValue, setDuplicateCheckValue] = useState('');
  const [showBulkSimilarPanel, setShowBulkSimilarPanel] = useState(false);
  const [showCategorySimilarDrawer, setShowCategorySimilarDrawer] = useState(false);
  const [similarPanelEditingWordId, setSimilarPanelEditingWordId] = useState(null);
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

  useEffect(() => {
    // Если слова уже переданы родителем, используем их и не ходим в AJAX.
    if (Array.isArray(existingDictionaryWords) && existingDictionaryWords.length > 0) {
      setDictionaryWords(existingDictionaryWords);
      setDictionaryWordsLoading(false);
      return;
    }

    if ((!showBulkInsert && !showCategorySimilarDrawer) || !dictionaryId) return;
    const fetchDictionaryWords = async () => {
      try {
        setDictionaryWordsLoading(true);
        const formData = new FormData();
        formData.append('action', 'get_dictionary_words');
        formData.append('dictionary_id', dictionaryId);
        const response = await axios.post(window.myajax.url, formData);
        if (response.data?.success && Array.isArray(response.data.data)) {
          setDictionaryWords(response.data.data);
        } else {
          setDictionaryWords([]);
        }
      } catch (err) {
        setDictionaryWords([]);
      } finally {
        setDictionaryWordsLoading(false);
      }
    };
    fetchDictionaryWords();
  }, [showBulkInsert, showCategorySimilarDrawer, dictionaryId, existingDictionaryWords]);

  useEffect(() => {
    if (similarPanelEditingWordId == null) return;
    if (!dictionaryWords.some((w) => String(w.id) === String(similarPanelEditingWordId))) {
      setSimilarPanelEditingWordId(null);
    }
  }, [dictionaryWords, similarPanelEditingWordId]);

  const similarPanelEditWord = useMemo(() => {
    if (similarPanelEditingWordId == null) return null;
    return dictionaryWords.find((x) => String(x.id) === String(similarPanelEditingWordId)) || null;
  }, [similarPanelEditingWordId, dictionaryWords]);

  const normalizeWord = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?()[\]{}"'`]/g, '')
    .replace(/\s+/g, ' ');

  const levenshtein = (a, b) => {
    const s = normalizeWord(a);
    const t = normalizeWord(b);
    const m = s.length;
    const n = t.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  const similarityScore = (query, candidate) => {
    const q = normalizeWord(query);
    const c = normalizeWord(candidate);
    if (!q || !c) return -1;
    if (q === c) return 1000;
    if (c.startsWith(q)) return 700 - (c.length - q.length);
    if (c.includes(q)) return 500 - (c.length - q.length);
    const dist = levenshtein(q, c);
    const maxLen = Math.max(q.length, c.length);
    const ratio = maxLen > 0 ? (1 - dist / maxLen) : 0;
    return Math.round(ratio * 100);
  };

  const categoryMetaById = useMemo(() => {
    const map = new Map();
    const walk = (nodes, depth = 0, parentId = null) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node) => {
        const id = parseInt(node.id, 10);
        if (!Number.isNaN(id)) {
          map.set(id, { name: String(node.name || ''), depth, parentId });
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children, depth + 1, id);
        }
      });
    };
    walk(categoryTree, 0, null);
    return map;
  }, [categoryTree]);

  const buildCategoryPath = (categoryId) => {
    const parts = [];
    let currentId = categoryId;
    const guard = new Set();
    while (currentId && !guard.has(currentId)) {
      guard.add(currentId);
      const meta = categoryMetaById.get(currentId);
      if (!meta || !meta.name) break;
      parts.unshift(meta.name);
      currentId = meta.parentId || null;
    }
    return parts.join(' > ');
  };

  const getDeepestCategoryPaths = (word) => {
    const ids = Array.isArray(word?.category_ids) ? word.category_ids.map(v => parseInt(v, 10)).filter(Boolean) : [];
    if (ids.length === 0) return [];
    const entries = ids
      .map((id) => ({ id, meta: categoryMetaById.get(id) }))
      .filter((entry) => entry.meta && entry.meta.name);
    if (entries.length === 0) return [];
    const maxDepth = Math.max(...entries.map((e) => e.meta.depth));
    const deepestPaths = entries
      .filter((e) => e.meta.depth === maxDepth)
      .map((e) => buildCategoryPath(e.id))
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    return deepestPaths;
  };

  const getMatchesForQuery = useCallback((queryValue) => {
    const q = normalizeWord(queryValue);
    if (!q || dictionaryWords.length === 0) return { exact: [], similar: [] };

    const words = dictionaryWords
      .map((w) => ({
        id: w.id,
        word: w.word,
        translation_1: w.translation_1 || '',
        category_ids: Array.isArray(w.category_ids) ? w.category_ids : [],
      }))
      .filter((w) => normalizeWord(w.word).length > 0);

    const exact = words.filter((w) => normalizeWord(w.word) === q);
    if (exact.length > 0) return { exact, similar: [] };

    const similar = words
      .map((w) => ({ ...w, _score: similarityScore(q, w.word) }))
      .filter((w) => w._score >= 20)
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    return { exact: [], similar };
  }, [dictionaryWords]);

  const duplicateMatches = useMemo(
    () => getMatchesForQuery(duplicateCheckValue),
    [duplicateCheckValue, getMatchesForQuery]
  );

  const filterOutSelfMatches = (items, selfId) =>
    (items || []).filter((x) => String(x.id) !== String(selfId));

  const categorySimilarReport = useMemo(() => {
    if (!showCategorySimilarDrawer || !Array.isArray(categoryWords)) return null;
    return categoryWords
      .filter((cw) => normalizeWord(cw?.word || '').length > 0)
      .map((cw) => {
        const { exact, similar } = getMatchesForQuery(cw.word);
        return {
          sourceId: cw.id,
          sourceWord: cw.word,
          sourceTranslation: cw.translation_1 || '',
          exact: filterOutSelfMatches(exact, cw.id),
          similar: filterOutSelfMatches(similar, cw.id),
        };
      });
  }, [showCategorySimilarDrawer, categoryWords, getMatchesForQuery]);

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
    const { validRows } = analyzeBulkCsvLines(text);
    return validRows.map((row) => ({
      word: row.word,
      translation_1: row.translation_1,
      translation_2: row.translation_2,
      translation_3: row.translation_3,
      translation_input_variable: row.translation_input_variable,
      difficult_translation: row.difficult_translation,
      info: row.info,
      sound_url: row.sound_url,
      level: row.level,
      maxLevel: row.maxLevel,
      type: row.type,
      gender: row.gender,
      is_phrase: row.is_phrase,
    }));
  };

  const bulkSimilarReport = useMemo(() => {
    if (!showBulkSimilarPanel || !bulkText.trim()) return null;
    const { validRows, invalidLines } = analyzeBulkCsvLines(bulkText);
    const rowsWithMatches = validRows.map((row) => ({
      lineNum: row.lineNum,
      inputWord: row.word,
      inputTranslation_1: row.translation_1,
      ...getMatchesForQuery(row.word),
    }));
    return { invalidLines, rowsWithMatches };
  }, [showBulkSimilarPanel, bulkText, getMatchesForQuery]);

  const handleToggleBulkSimilarPanel = () => {
    if (!showBulkSimilarPanel) {
      if (!bulkText.trim()) {
        setError('Вставьте текст в поле списка, чтобы открыть проверку похожих слов');
        return;
      }
      setError('');
      setShowBulkSimilarPanel(true);
      return;
    }
    setShowBulkSimilarPanel(false);
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
      setShowBulkSimilarPanel(false);

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

  const handleSimilarMatchDelete = async (wordId) => {
    const w = dictionaryWords.find((x) => String(x.id) === String(wordId));
    const label = w?.word ?? wordId;
    if (!window.confirm(`Удалить слово «${label}» из этой категории?`)) return;
    try {
      const result = await deleteWord(wordId, categoryId);
      if (result.success) {
        setDictionaryWords((prev) => prev.filter((x) => String(x.id) !== String(wordId)));
        setSimilarPanelEditingWordId((cur) => (String(cur) === String(wordId) ? null : cur));
        setError('');
        if (onWordsChanged) onWordsChanged();
      } else {
        setError(result.message || result.data?.message || 'Не удалось удалить слово');
      }
    } catch (err) {
      setError('Ошибка при удалении: ' + err.message);
    }
  };

  const openSimilarWordEditor = (wordId) => {
    const w = dictionaryWords.find((x) => String(x.id) === String(wordId));
    if (w) setSimilarPanelEditingWordId(wordId);
  };

  const renderSimilarDictWordRow = (item) => {
    const rest = { ...item };
    delete rest._score;
    return (
      <span className="bulk-similar-match">
        <span className="bulk-similar-match__text">
          <span style={{ fontWeight: 600, color: '#111' }}>{rest.word}</span>
          {rest.translation_1 ? ` — ${rest.translation_1}` : ''}
          {getDeepestCategoryPaths(rest).length > 0 && (
            <span style={{ color: '#546e7a', fontStyle: 'italic' }}>
              {' — '}{getDeepestCategoryPaths(rest).join(', ')}
            </span>
          )}
        </span>
        <button
          type="button"
          className="edit-button"
          title="Редактировать слово"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openSimilarWordEditor(rest.id);
          }}
        >
          ✏️
        </button>
        <button
          type="button"
          className="delete-button"
          title="Удалить из категории"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSimilarMatchDelete(rest.id);
          }}
        >
          🗑️
        </button>
      </span>
    );
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
              setShowBulkInsert((prev) => {
                if (prev) setShowBulkSimilarPanel(false);
                return !prev;
              });
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
          <button
            type="button"
            onClick={() => {
              setShowCategorySimilarDrawer((open) => !open);
              if (!showCategorySimilarDrawer) setError('');
            }}
            disabled={!categoryId || categoryWords.length === 0}
            title={
              !categoryId
                ? 'Нет категории'
                : categoryWords.length === 0
                  ? 'В категории нет слов'
                  : 'Похожие слова в словаре для каждого слова категории'
            }
            style={{
              padding: '8px 16px',
              backgroundColor: showCategorySimilarDrawer ? '#607d8b' : '#0288d1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !categoryId || categoryWords.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {showCategorySimilarDrawer ? '✕ Закрыть похожие' : '🔎 Похожие по категории'}
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
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ marginBottom: '14px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', background: '#fafafa' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
              Проверка похожих слов (в текущем словаре):
            </label>
            <input
              type="text"
              value={duplicateCheckValue}
              onChange={(e) => setDuplicateCheckValue(e.target.value)}
              placeholder="Введите слово для проверки дублей..."
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              disabled={bulkLoading}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
              {dictionaryWordsLoading ? 'Проверяю словарь...' : (
                duplicateCheckValue.trim() ? (
                  duplicateMatches.exact.length > 0 ? (
                    duplicateMatches.exact.length === 1 ? (
                      <div style={{ color: '#c62828', fontWeight: 'bold' }}>
                        <span style={{ color: '#111', fontWeight: 700 }}>
                          Полное совпадение: {duplicateMatches.exact[0].word}
                          {duplicateMatches.exact[0].translation_1 ? ` — ${duplicateMatches.exact[0].translation_1}` : ''}
                        </span>
                        {getDeepestCategoryPaths(duplicateMatches.exact[0]).length > 0 && (
                          <span style={{ color: '#546e7a', fontWeight: 500, fontStyle: 'italic', fontSize: '12px' }}>
                            {' — '}{getDeepestCategoryPaths(duplicateMatches.exact[0]).join(', ')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#c62828', fontWeight: 'bold' }}>
                        <div style={{ marginBottom: '4px', color: '#111' }}>
                          Полные совпадения ({duplicateMatches.exact.length}):
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontWeight: 'normal' }}>
                          {duplicateMatches.exact.map((item) => (
                            <li key={item.id}>
                              <span style={{ color: '#111', fontWeight: 700 }}>
                                {item.word}
                                {item.translation_1 ? ` — ${item.translation_1}` : ''}
                              </span>
                              {getDeepestCategoryPaths(item).length > 0 && (
                                <span style={{ color: '#546e7a', fontWeight: 500, fontStyle: 'italic', fontSize: '12px' }}>
                                  {' — '}{getDeepestCategoryPaths(item).join(', ')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ) : duplicateMatches.similar.length > 0 ? (
                    <div>
                      <div style={{ marginBottom: '4px' }}>Похожие слова:</div>
                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        {duplicateMatches.similar.map(item => (
                          <li key={item.id}>
                            <span style={{ color: '#111', fontWeight: 600 }}>
                              {item.word}
                              {item.translation_1 ? ` — ${item.translation_1}` : ''}
                            </span>
                            {getDeepestCategoryPaths(item).length > 0 && (
                              <span style={{ color: '#546e7a', fontWeight: 500, fontStyle: 'italic', fontSize: '12px' }}>
                                {' — '}{getDeepestCategoryPaths(item).join(', ')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : 'Совпадений не найдено'
                ) : 'Введите слово выше, чтобы увидеть совпадения'
              )}
            </div>
          </div>

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
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleToggleBulkSimilarPanel}
                disabled={bulkLoading}
                style={{
                  padding: '8px 14px',
                  backgroundColor: showBulkSimilarPanel ? '#607d8b' : '#0288d1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: bulkLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {showBulkSimilarPanel ? '◀ Скрыть проверку по списку' : '▶ Проверка похожих по списку CSV'}
              </button>
            </div>
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

            {showBulkSimilarPanel && bulkSimilarReport && (
              <aside
                style={{
                  flex: '0 0 min(360px, 40vw)',
                  maxWidth: '400px',
                  minWidth: '260px',
                  maxHeight: 'min(78vh, 640px)',
                  overflowY: 'auto',
                  position: 'sticky',
                  top: '8px',
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #bdbdbd',
                  borderRadius: '6px',
                  fontSize: '12px',
                  alignSelf: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#37474f' }}>Похожие в словаре</span>
                  <button
                    type="button"
                    onClick={() => setShowBulkSimilarPanel(false)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      border: '1px solid #90a4ae',
                      borderRadius: '4px',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Закрыть
                  </button>
                </div>

                {dictionaryWordsLoading ? (
                  <div style={{ color: '#555' }}>Загружается словарь…</div>
                ) : (
                  <>
                    {bulkSimilarReport.invalidLines.length > 0 && (
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '8px',
                          backgroundColor: '#fff3e0',
                          border: '1px solid #ff9800',
                          borderRadius: '4px',
                          color: '#5d4037',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                          Ошибки формата ({bulkSimilarReport.invalidLines.length} строк)
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {bulkSimilarReport.invalidLines.map((err) => (
                            <li key={err.lineNum} style={{ marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600 }}>Стр. {err.lineNum}:</span> {err.message}
                              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6d4c41', marginTop: '2px' }}>
                                {err.rawLine}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {bulkSimilarReport.rowsWithMatches.length === 0 ? (
                      <div style={{ color: '#666' }}>
                        {bulkSimilarReport.invalidLines.length > 0
                          ? 'Нет строк с корректным форматом «слово,перевод…» для сравнения с словарём.'
                          : 'Нет непустых строк в списке.'}
                      </div>
                    ) : (
                      bulkSimilarReport.rowsWithMatches.map((row) => (
                        <div
                          key={`${row.lineNum}-${row.inputWord}`}
                          style={{
                            marginBottom: '12px',
                            paddingBottom: '10px',
                            borderBottom: '1px solid #e0e0e0',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#263238', marginBottom: '4px' }}>
                            Стр. {row.lineNum}: <span style={{ color: '#1565c0' }}>{row.inputWord}</span>
                            {row.inputTranslation_1 ? (
                              <span style={{ fontWeight: 600, color: '#37474f' }}> — {row.inputTranslation_1}</span>
                            ) : null}
                          </div>
                          {row.exact.length > 0 ? (
                            <div style={{ color: '#c62828', fontWeight: 'bold', fontSize: '11px' }}>
                              {row.exact.length === 1 ? (
                                <div>
                                  <span style={{ marginRight: '4px' }}>Полное совпадение:</span>
                                  {renderSimilarDictWordRow(row.exact[0])}
                                </div>
                              ) : (
                                <>
                                  <div>Полные совпадения ({row.exact.length}):</div>
                                  <ul style={{ margin: '4px 0 0', paddingLeft: 0, listStyle: 'none', fontWeight: 'normal' }}>
                                    {row.exact.map((item) => (
                                      <li key={item.id}>
                                        {renderSimilarDictWordRow(item)}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          ) : row.similar.length > 0 ? (
                            <div>
                              <div style={{ marginBottom: '2px', color: '#455a64' }}>Похожие:</div>
                              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                                {row.similar.map((item) => (
                                    <li key={item.id}>
                                      {renderSimilarDictWordRow(item)}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ) : (
                            <div style={{ color: '#2e7d32', fontSize: '11px' }}>Совпадений в словаре не найдено</div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </aside>
            )}
          </div>
        </div>
      )}

      {similarPanelEditWord && (
        <div
          className="bulk-similar-word-editor-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSimilarPanelEditingWordId(null);
          }}
          role="presentation"
        >
          <div className="bulk-similar-word-editor-inner" onClick={(e) => e.stopPropagation()}>
            <WordEditor
              dictionaryId={dictionaryId}
              word={similarPanelEditWord}
              onClose={() => setSimilarPanelEditingWordId(null)}
              onRefreshDictionaryWords={() => {
                if (onWordsChanged) onWordsChanged();
              }}
            />
          </div>
        </div>
      )}

      {showCategorySimilarDrawer && (
        <>
          <div
            role="presentation"
            onClick={() => setShowCategorySimilarDrawer(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99997,
              background: 'rgba(0,0,0,0.25)',
            }}
          />
          <aside
            aria-label="Похожие слова по всей категории"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: 'min(400px, 42vw)',
              minWidth: '260px',
              maxWidth: '440px',
              zIndex: 99998,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderLeft: '1px solid #bdbdbd',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontWeight: 'bold', color: '#37474f' }}>Похожие в словаре (категория)</span>
              <button
                type="button"
                onClick={() => setShowCategorySimilarDrawer(false)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  border: '1px solid #90a4ae',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Закрыть
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#546e7a', marginBottom: '8px', flexShrink: 0 }}>
              Все слова категории против полного словаря; совпадение с тем же словом скрыто.
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {dictionaryWordsLoading ? (
                <div style={{ color: '#555' }}>Загружается словарь…</div>
              ) : !dictionaryWords.length ? (
                <div style={{ color: '#c62828' }}>
                  Нет данных словаря для сравнения (проверьте сеть или права). Попробуйте обновить страницу.
                </div>
              ) : categorySimilarReport && categorySimilarReport.length === 0 ? (
                <div style={{ color: '#666' }}>Нет слов с непустым текстом в категории.</div>
              ) : (
                categorySimilarReport.map((row) => (
                  <div
                    key={row.sourceId}
                    style={{
                      marginBottom: '12px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#263238', marginBottom: '4px' }}>
                      <span style={{ color: '#1565c0' }}>{row.sourceWord}</span>
                      {row.sourceTranslation ? (
                        <span style={{ fontWeight: 600, color: '#37474f' }}> — {row.sourceTranslation}</span>
                      ) : null}
                    </div>
                    {row.exact.length > 0 ? (
                      <div style={{ color: '#c62828', fontWeight: 'bold', fontSize: '11px' }}>
                        {row.exact.length === 1 ? (
                          <div>
                            <span style={{ marginRight: '4px' }}>Полное совпадение:</span>
                            {renderSimilarDictWordRow(row.exact[0])}
                          </div>
                        ) : (
                          <>
                            <div>Полные совпадения ({row.exact.length}):</div>
                            <ul style={{ margin: '4px 0 0', paddingLeft: 0, listStyle: 'none', fontWeight: 'normal' }}>
                              {row.exact.map((item) => (
                                <li key={item.id}>{renderSimilarDictWordRow(item)}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    ) : row.similar.length > 0 ? (
                      <div>
                        <div style={{ marginBottom: '2px', color: '#455a64' }}>Похожие:</div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                          {row.similar.map((item) => (
                            <li key={item.id}>{renderSimilarDictWordRow(item)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ color: '#2e7d32', fontSize: '11px' }}>Совпадений в словаре не найдено</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default WordManagement;

