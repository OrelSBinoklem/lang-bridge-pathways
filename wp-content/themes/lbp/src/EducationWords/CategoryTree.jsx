import axios from "axios";
const { useEffect, useState } = wp.element;

const CategoryTree = ({ dictionaryId, onCategoryClick, dictionaryWords = [], categories: propCategories = [], loadingCategories: propLoading = false }) => {
  const [categories, setCategories] = useState(propCategories); // Используем категории из пропов
  const [loading, setLoading] = useState(propLoading); // Используем loading из пропов
  const [error, setError] = useState(null); // Состояние ошибки

  // Функция генерации фейковых категорий по 50 слов
  const generateFakeCategories = (words) => {
    console.log('🔧 CategoryTree: Генерация фейковых категорий для', words.length, 'слов');
    const wordsPerCategory = 50;
    const fakeCategories = [];
    
    // Примечание: category_id к словам должны быть присвоены в родительском компоненте Dictionary.jsx
    // Здесь мы только создаём структуру категорий
    
    for (let i = 0; i < words.length; i += wordsPerCategory) {
      const startNum = i + 1;
      const endNum = Math.min(i + wordsPerCategory, words.length);
      const categoryId = -(Math.floor(i / wordsPerCategory) + 1);
      
      fakeCategories.push({
        id: categoryId,
        name: `${startNum}-${endNum}`,
        parent_id: 0,
        children: []
      });
    }
    
    return [{
      id: 0,
      name: "Категории",
      parent_id: null,
      children: fakeCategories
    }];
  };

  // Синхронизируем локальное состояние с пропами
  useEffect(() => {
    setCategories(propCategories);
  }, [propCategories]);

  useEffect(() => {
    setLoading(propLoading);
  }, [propLoading]);

  // Примечание: генерация фейковых категорий происходит в Dictionary.jsx
  // CategoryTree только отображает категории, переданные через пропы

  // Функция для рекурсивного рендера дерева категорий
  const renderCategoryTree = (tree, subCat = false) => {
    return (
      <ul className={subCat ? 'category-three-sub' : 'category-three'}>
        {tree.map((category) => (
          <li
            onClick={() => subCat && onCategoryClick && onCategoryClick(category)}
            key={category.id}
          >
            <span
              className="category-three-name"
            >
              {category.name}
            </span>
            {category.children && category.children.length > 0 && renderCategoryTree(category.children, true)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      {loading && <p>Загрузка категорий...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      {!loading && !error && renderCategoryTree(categories)}
    </div>
  );
};

export default CategoryTree;
