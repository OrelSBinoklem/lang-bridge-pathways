import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WordManager from './WordManager';

const CategoryManager = ({ dictionaryId, onCategoriesChange }) => {
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Загружаем категории при монтировании компонента
  useEffect(() => {
    fetchCategories();
  }, [dictionaryId]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'get_categories');
      formData.append('dictionary_id', dictionaryId);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        console.log('Loaded categories:', response.data.data);
        setCategories(response.data.data);
        setError('');
      } else {
        setError('Ошибка загрузки категорий');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      setError('Название категории обязательно');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'create_category');
      formData.append('dictionary_id', dictionaryId);
      formData.append('name', newCategoryName);
      formData.append('parent_id', newCategoryParent || '');
      formData.append('order', newCategoryOrder);
      formData.append('nonce', window.myajax.nonce);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        setNewCategoryName('');
        setNewCategoryParent('');
        setNewCategoryOrder(0);
        fetchCategories();
        if (onCategoriesChange) {
          onCategoriesChange();
        }
        setError('');
      } else {
        setError(response.data.message || 'Ошибка создания категории');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!editingCategory.name.trim()) {
      setError('Название категории обязательно');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'update_category');
      formData.append('category_id', editingCategory.id);
      formData.append('name', editingCategory.name);
      formData.append('parent_id', editingCategory.parent_id || '');
      formData.append('order', editingCategory.order);
      formData.append('nonce', window.myajax.nonce);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        setEditingCategory(null);
        fetchCategories();
        if (onCategoriesChange) {
          onCategoriesChange();
        }
        setError('');
      } else {
        setError(response.data.message || 'Ошибка обновления категории');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию? Все слова будут перемещены в корень словаря.')) {
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'delete_category');
      formData.append('category_id', categoryId);
      formData.append('nonce', window.myajax.nonce);

      const response = await axios.post(window.myajax.url, formData);
      
      if (response.data.success) {
        fetchCategories();
        if (onCategoriesChange) {
          onCategoriesChange();
        }
        setError('');
      } else {
        setError(response.data.message || 'Ошибка удаления категории');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Получить плоский список всех категорий для выбора родителя
  const getFlatCategories = (cats, level = 0) => {
    if (!cats || !Array.isArray(cats)) {
      console.log('getFlatCategories: cats is not array', cats);
      return [];
    }
    let result = [];
    cats.forEach(cat => {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(getFlatCategories(cat.children, level + 1));
      }
    });
    console.log('getFlatCategories result:', result);
    return result;
  };

  const flatCategories = getFlatCategories(categories);
  console.log('flatCategories for select:', flatCategories);

  const renderCategoryTree = (categories, level = 0) => {
    return categories.map((category) => (
      <div key={category.id} style={{ marginLeft: level * 20 }}>
        <div style={{ 
          padding: '10px', 
          border: '1px solid #ddd', 
          margin: '5px 0',
          backgroundColor: '#f9f9f9'
        }}>
          {editingCategory && editingCategory.id === category.id ? (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Название:</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                  placeholder="Название категории"
                  required
                  style={{ padding: '5px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Родительская категория:</label>
                <select
                  value={editingCategory.parent_id || ''}
                  onChange={(e) => setEditingCategory({...editingCategory, parent_id: e.target.value || null})}
                  style={{ padding: '5px', width: '100%' }}
                >
                  <option value="">-- Корневая категория --</option>
                  {flatCategories
                    .filter(cat => cat.id !== editingCategory.id) // Исключаем саму категорию
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {'—'.repeat(cat.level)} {cat.name} (ID: {cat.id})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Порядок:</label>
                <input
                  type="number"
                  value={editingCategory.order}
                  onChange={(e) => setEditingCategory({...editingCategory, order: parseInt(e.target.value)})}
                  placeholder="Порядок"
                  min="0"
                  style={{ padding: '5px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>Сохранить</button>
                <button type="button" onClick={() => setEditingCategory(null)} style={{ padding: '8px 16px' }}>Отмена</button>
              </div>
            </form>
          ) : (
            <div>
              <strong>{category.name}</strong> (ID: {category.id}, Порядок: {category.order || 0})
              <div style={{ marginTop: '5px' }}>
                <button onClick={() => handleEdit(category)} disabled={loading}>Редактировать</button>
                <button onClick={() => handleDelete(category.id)} disabled={loading} style={{ marginLeft: '10px', backgroundColor: '#dc3545', color: 'white' }}>Удалить</button>
              </div>
            </div>
          )}
        </div>
        {category.children && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Управление категориями</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffebee', border: '1px solid #f44336' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        <h3>Создать новую категорию</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Название категории:</label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Название категории"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Родительская категория (необязательно):</label>
          <select
            value={newCategoryParent}
            onChange={(e) => setNewCategoryParent(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Корневая категория --</option>
            {flatCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {'—'.repeat(cat.level)} {cat.name} (ID: {cat.id})
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Порядок сортировки:</label>
          <input
            type="number"
            value={newCategoryOrder}
            onChange={(e) => setNewCategoryOrder(parseInt(e.target.value) || 0)}
            placeholder="0"
            min="0"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Создание...' : 'Создать категорию'}
        </button>
      </form>

      <div>
        <h3>Существующие категории</h3>
        {loading && !categories.length ? (
          <p>Загрузка...</p>
        ) : categories.length > 0 ? (
          renderCategoryTree(categories)
        ) : (
          <p>Категории не найдены. Создайте первую категорию!</p>
        )}
      </div>

      {/* Управление словами */}
      <WordManager dictionaryId={dictionaryId} categories={categories} />
    </div>
  );
};

export default CategoryManager;
