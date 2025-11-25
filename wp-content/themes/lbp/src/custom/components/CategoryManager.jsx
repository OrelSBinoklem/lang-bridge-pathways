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

  // Состояние для drag and drop
  const [draggedCategoryId, setDraggedCategoryId] = useState(null);
  const [draggedCategoryParentId, setDraggedCategoryParentId] = useState(null);
  const [categoriesState, setCategoriesState] = useState(categories);

  // Синхронизируем локальное состояние с пропами
  useEffect(() => {
    setCategoriesState(categories);
  }, [categories]);

  // Обработчики drag and drop
  const handleDragStart = (e, category, parentId) => {
    setDraggedCategoryId(category.id);
    setDraggedCategoryParentId(parentId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e, category, parentId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetCategory, parentId) => {
    e.preventDefault();
    
    if (!draggedCategoryId || draggedCategoryId === targetCategory.id) {
      setDraggedCategoryId(null);
      setDraggedCategoryParentId(null);
      return;
    }

    // Перетаскиваем только категории одного уровня (с одинаковым parent_id)
    if (draggedCategoryParentId !== parentId) {
      setDraggedCategoryId(null);
      setDraggedCategoryParentId(null);
      return;
    }

    // Получаем все категории текущего уровня
    const getSiblings = (cats, parentId) => {
      if (parentId === null || parentId === undefined) {
        // Корневые категории
        return cats.filter(cat => !cat.parent_id || cat.parent_id === null);
      }
      // Находим родительскую категорию и возвращаем её детей
      const findCategory = (cats, id) => {
        for (const cat of cats) {
          if (cat.id === id) return cat;
          if (cat.children) {
            const found = findCategory(cat.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      const parent = findCategory(cats, parentId);
      return parent?.children || [];
    };

    const siblings = getSiblings(categoriesState, parentId);
    const sortedSiblings = [...siblings].sort((a, b) => {
      const orderA = a.order !== undefined ? parseInt(a.order) : 0;
      const orderB = b.order !== undefined ? parseInt(b.order) : 0;
      if (orderA !== orderB) return orderA - orderB;
      return parseInt(a.id) - parseInt(b.id);
    });

    const draggedIndex = sortedSiblings.findIndex(c => c.id === draggedCategoryId);
    const targetIndex = sortedSiblings.findIndex(c => c.id === targetCategory.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCategoryId(null);
      setDraggedCategoryParentId(null);
      return;
    }

    // Перемещаем элемент
    const newSiblings = [...sortedSiblings];
    const [removed] = newSiblings.splice(draggedIndex, 1);
    newSiblings.splice(targetIndex, 0, removed);

    // Обновляем order для всех категорий
    const categoryOrders = newSiblings.map((cat, index) => ({
      category_id: cat.id,
      order: index + 1
    }));

    // Сохраняем новый порядок на сервере
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('action', 'reorder_categories');
      formData.append('dictionary_id', dictionaryId);
      formData.append('parent_id', parentId || '');
      formData.append('category_orders', JSON.stringify(categoryOrders));
      formData.append('nonce', window.myajax.nonce);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        // Обновляем локальное состояние
        const updateCategoryOrder = (cats, orders) => {
          return cats.map(cat => {
            const order = orders.find(o => o.category_id === cat.id);
            const updatedCat = { ...cat, order: order ? order.order : cat.order };
            if (cat.children && cat.children.length > 0) {
              updatedCat.children = updateCategoryOrder(cat.children, orders);
            }
            return updatedCat;
          });
        };

        // Обновляем локальное состояние с новыми order
        const updatedCategories = updateCategoryOrder(categoriesState, categoryOrders);
        setCategoriesState(updatedCategories);
        
        // Перезагружаем категории с сервера
        await fetchCategories();
        if (onCategoriesChange) {
          onCategoriesChange();
        }
        setError('');
      } else {
        setError(response.data.message || 'Ошибка обновления порядка');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
      setDraggedCategoryId(null);
      setDraggedCategoryParentId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedCategoryId(null);
    setDraggedCategoryParentId(null);
  };

  const renderCategoryTree = (categories, level = 0, parentId = null) => {
    // Сортируем категории по order перед рендерингом
    const sortedCategories = [...categories].sort((a, b) => {
      const orderA = a.order !== undefined ? parseInt(a.order) : 0;
      const orderB = b.order !== undefined ? parseInt(b.order) : 0;
      if (orderA !== orderB) return orderA - orderB;
      return parseInt(a.id) - parseInt(b.id);
    });

    return sortedCategories.map((category) => {
      const isDragging = draggedCategoryId === category.id;
      const isDragOver = draggedCategoryId && draggedCategoryId !== category.id && draggedCategoryParentId === parentId;
      
      return (
        <div key={category.id} style={{ marginLeft: level * 20 }}>
          <div 
            draggable={!editingCategory}
            onDragStart={(e) => handleDragStart(e, category, parentId)}
            onDragOver={(e) => handleDragOver(e, category, parentId)}
            onDrop={(e) => handleDrop(e, category, parentId)}
            onDragEnd={handleDragEnd}
            style={{ 
              padding: '10px', 
              border: '1px solid #ddd', 
              margin: '5px 0',
              backgroundColor: isDragging ? '#e3f2fd' : isDragOver ? '#fff3e0' : '#f9f9f9',
              cursor: editingCategory ? 'default' : 'move',
              opacity: isDragging ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', cursor: 'move' }} title="Перетащите для изменения порядка">☰</span>
                <strong>{category.name}</strong> (ID: {category.id}, Порядок: {category.order || 0})
              </div>
              <div style={{ marginTop: '5px' }}>
                <button onClick={() => handleEdit(category)} disabled={loading}>Редактировать</button>
                <button onClick={() => handleDelete(category.id)} disabled={loading} style={{ marginLeft: '10px', backgroundColor: '#dc3545', color: 'white' }}>Удалить</button>
              </div>
            </div>
          )}
          </div>
          {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1, category.id)}
        </div>
      );
    });
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
        ) : categoriesState.length > 0 ? (
          renderCategoryTree(categoriesState)
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
