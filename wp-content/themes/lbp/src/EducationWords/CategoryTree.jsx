import axios from "axios";
const { useEffect, useState } = wp.element;

const CategoryTree = ({ dictionaryId, onCategoryClick }) => {
  const [categories, setCategories] = useState([]); // Храним дерево категорий
  const [loading, setLoading] = useState(true); // Состояние загрузки
  const [error, setError] = useState(null); // Состояние ошибки

  // Функция для запроса данных с бэкенда
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("action", "get_category_tree");
      formData.append("dictionary_id", dictionaryId);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        // Если список категорий одноуровневый
        //console.log(response.data.data)
        if(response.data.data.some(item => Array.isArray(item.children) && item.children.length > 0)) {
          setCategories(response.data.data); // Устанавливаем дерево категорий
        } else {
          setCategories([{
            "id": 0,
            "name": "Категории",
            "parent_id": null,
            children: response.data.data
          }]); // Устанавливаем дерево категорий и в корне делаем мокавую категорию response.data.data
        }

      } else {
        throw new Error(response.data.message || "Ошибка получения категорий");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем категории при монтировании компонента
  useEffect(() => {
    fetchCategories();
  }, [dictionaryId]);

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
