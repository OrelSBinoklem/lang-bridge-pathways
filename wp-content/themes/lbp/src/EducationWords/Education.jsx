import axios from "axios";
const { useEffect, useState } = wp.element;

const Education = ({ categoryId }) => {
  const [words, setWords] = useState([]); // Храним дерево категорий
  const [loading, setLoading] = useState(true); // Состояние загрузки
  const [error, setError] = useState(null); // Состояние ошибки

  // Функция для запроса данных с бэкенда
  const fetchWords = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("action", "get_words_by_category");
      formData.append("category_id", categoryId);

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        setError(null);
        setWords(response.data.data);
      } else {
        throw new Error(response.data.message || "Ошибка получения слов");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем категории при монтировании компонента
  useEffect(() => {
    fetchWords();
  }, [categoryId]);

  // Функция для рекурсивного рендера дерева категорий
  const renderEducation = () => {
    return (
      <ul className='words-education-list'>
        {words.map((word) => (
          <li key={word.id}>
            <span className="words-education-list__word">{word.word}</span>
            <span className="words-education-list__translation_1"> - {word.translation_1}</span>
            {word.translation_2 && <span className="words-education-list__translation_2">{word.translation_2}</span>}
            {word.translation_3 && <span className="words-education-list__translation_3">{word.translation_3}</span>}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      {loading && <p>Загрузка слов...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      {!loading && !error && renderEducation(words)}
    </div>
  );
};

export default Education;
