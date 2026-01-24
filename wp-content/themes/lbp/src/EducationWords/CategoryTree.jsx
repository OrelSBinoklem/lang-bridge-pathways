const { useEffect, useState } = wp.element;

const CategoryTree = ({ dictionaryId, onCategoryClick, dictionaryWords = [], categories: propCategories = [], loadingCategories: propLoading = false, userWordsData = {} }) => {
  const [categories, setCategories] = useState(propCategories); // Используем категории из пропов
  const [loading, setLoading] = useState(propLoading); // Используем loading из пропов
  const [error, setError] = useState(null); // Состояние ошибки

  /**
   * Проверка принадлежности слова категории (как в Examen: category_id или category_ids).
   */
  const wordBelongsToCategory = (word, catId) => {
    const catIdNum = parseInt(catId, 10);
    if (word.category_id !== undefined && word.category_id !== null) {
      return parseInt(word.category_id, 10) === catIdNum;
    }
    if (Array.isArray(word.category_ids) && word.category_ids.length > 0) {
      return word.category_ids.some((id) => parseInt(id, 10) === catIdNum);
    }
    return false;
  };

  /**
   * Прогресс категории: прямой и обратный перевод считаются отдельно.
   * 100% — когда все прямые и все обратные переводы выполнены (correct_attempts >= 2 и correct_attempts_revert >= 2).
   */
  const getCategoryProgress = (categoryId) => {
    const words = dictionaryWords.filter((w) => wordBelongsToCategory(w, categoryId));
    const n = words.length;
    if (!n) return { total: 0, learned: 0, progress: 0 };
    const totalUnits = n * 2; // каждое слово = 2 единицы: прямой + обратный
    let learned = 0;
    words.forEach((w) => {
      const u = userWordsData[w.id];
      if (u && u.correct_attempts >= 2) learned += 1;
      if (u && u.correct_attempts_revert >= 2) learned += 1;
    });
    return { total: totalUnits, learned, progress: learned / totalUnits };
  };

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

  // Функция для сортировки категорий по полю order
  const sortCategoriesByOrder = (categories) => {
    return [...categories].sort((a, b) => {
      const orderA = a.order !== undefined ? parseInt(a.order) : 0;
      const orderB = b.order !== undefined ? parseInt(b.order) : 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Если order одинаковый, сортируем по id
      return parseInt(a.id) - parseInt(b.id);
    });
  };

  // Функция для рекурсивного рендера дерева категорий
  const renderCategoryTree = (tree, subCat = false) => {
    // Сортируем категории по полю order перед рендерингом
    const sortedTree = sortCategoriesByOrder(tree);
    
    return (
      <ul className={subCat ? 'category-three-sub' : 'category-three'}>
        {sortedTree.map((category) => {
          const { progress } = subCat ? getCategoryProgress(category.id) : { progress: 0 };
          const isClickable = !!subCat;
          return (
            <li
              onClick={() => subCat && onCategoryClick && onCategoryClick(category)}
              key={category.id}
              className={isClickable ? 'category-item-with-progress' : ''}
              style={isClickable ? { '--category-progress': progress } : undefined}
            >
              <span className="category-three-name">{category.name}</span>
              {isClickable && progress >= 1 && (
                <span className="category-progress-done" aria-hidden="true">✓</span>
              )}
              {category.children && category.children.length > 0 && renderCategoryTree(category.children, true)}
            </li>
          );
        })}
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
