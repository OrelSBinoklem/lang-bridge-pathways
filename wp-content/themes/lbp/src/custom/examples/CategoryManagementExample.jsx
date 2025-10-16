import React, { useState } from 'react';
import DictionaryCategoryManagement from '../components/DictionaryCategoryManagement';

/**
 * ПРИМЕР использования управления категориями
 * 
 * Этот компонент показывает, как интегрировать CategoryManager в существующую страницу
 */
const ExampleCategoryManagementPage = ({ dictionaryId, dictionaryName }) => {
  const [showManagement, setShowManagement] = useState(false);

  return (
    <div className="example-category-page">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h1>📚 {dictionaryName}</h1>
        
        {window.myajax && window.myajax.is_admin && (
          <button
            onClick={() => setShowManagement(!showManagement)}
            style={{
              padding: '10px 20px',
              backgroundColor: showManagement ? '#dc3545' : '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showManagement ? '❌ Скрыть управление' : '⚙️ Управление категориями'}
          </button>
        )}
      </div>

      {/* Переключатель для показа/скрытия управления категориями */}
      {showManagement && (
        <DictionaryCategoryManagement
          dictionaryId={dictionaryId}
          dictionaryName={dictionaryName}
        />
      )}

      {/* Здесь будет ваш обычный контент словаря */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3>📖 Содержимое словаря</h3>
        <p>Здесь будет обычный контент вашего словаря...</p>
        
        {/* Пример: список слов, категории и т.д. */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          marginTop: '15px'
        }}>
          <h4>💡 Как использовать:</h4>
          <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>Нажмите "⚙️ Управление категориями" для доступа к панели управления</li>
            <li>Создавайте корневые категории (1-й уровень)</li>
            <li>Создавайте вложенные категории (2-й уровень) выбрав родительскую</li>
            <li>Устанавливайте порядок сортировки через поле "order"</li>
            <li>Редактируйте существующие категории кнопкой ✏️</li>
            <li>Удаляйте ненужные категории кнопкой 🗑️</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ExampleCategoryManagementPage;
