import axios from "axios";
import WordEditor from "../WordEditor";

const { useEffect, useState } = wp.element;

const Education = ({ categoryId, dictionaryId }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingWordId, setEditingWordId] = useState(null); // ID текущего редактируемого слова

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

  const toggleEdit = (id) => {
    setEditingWordId((prevId) => (prevId === id ? null : id));
  };

  return (
    <div>
      {loading && <p>Загрузка слов...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
      {!loading && !error && (
        <ul className="words-education-list">
          {words.map((word) => (
            <li key={word.id}>
                <span className="words-education-list__word">{word.word}</span>
                <span className="words-education-list__translation_1">&nbsp;&mdash; {word.translation_1}</span>
                {word.translation_2 && <span className="words-education-list__translation_2">, {word.translation_2}</span>}
                {word.translation_3 && <span className="words-education-list__translation_3">, {word.translation_3}</span>}
                {window.myajax && window.myajax.is_admin && (
                  <button
                    className="edit-button"
                    style={{ marginLeft: "10px" }}
                    onClick={() => toggleEdit(word.id)}
                  >
                    ✏️
                  </button>
                )}

              {editingWordId === word.id && (
                <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #ccc" }}>
                  <WordEditor dictionaryId={dictionaryId} word={word} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Education;
