import React from 'react';
import CategoryManager from './CategoryManager';

/**
 * Компонент для отображения управления категориями в словаре
 * 
 * @param {number} dictionaryId - ID словаря
 * @param {function} onCategoriesChange - Колбэк для обновления категорий в родительском компоненте
 */
const DictionaryCategoryManagement = ({ dictionaryId, onCategoriesChange }) => {
  return (
    <div className="dictionary-category-management">
      <CategoryManager 
        dictionaryId={dictionaryId}
        onCategoriesChange={onCategoriesChange}
      />
    </div>
  );
};

export default DictionaryCategoryManagement;
