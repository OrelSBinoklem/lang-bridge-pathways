import React, { useState } from 'react';
import axios from 'axios';

const WordEditor = ({ dictionaryId, word }) => {
  console.log(word);
  const [formData, setFormData] = useState({ ...word });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    const postData = new FormData();
    postData.append('action', 'update_word');
    postData.append('dictionary_id', dictionaryId);
    postData.append('word_id', word.id);
    postData.append('fields', JSON.stringify(formData));

    try {
      const response = await axios.post(window.myajax.url, postData);
      if (response.data.success) {
        setStatus('Слово успешно обновлено!');
      } else {
        setStatus('Ошибка: ' + response.data.data.message);
      }
    } catch (err) {
      setStatus('Ошибка запроса');
      console.error(err);
    }
  };

  return (
    <div className="word-editor">
      <h3>Редактирование слова</h3>

      <label>Слово:</label>
      <input name="word" value={formData.word} onChange={handleChange} />

      <label>Перевод 1:</label>
      <input name="translation_1" value={formData.translation_1 || ''} onChange={handleChange} />

      <label>Перевод 2:</label>
      <input name="translation_2" value={formData.translation_2 || ''} onChange={handleChange} />

      <label>Перевод 3:</label>
      <input name="translation_3" value={formData.translation_3 || ''} onChange={handleChange} />

      <label>Сложный перевод:</label>
      <input name="difficult_translation" value={formData.difficult_translation || ''} onChange={handleChange} />

      <label>Ссылка на звук (sound_url):</label>
      <input name="sound_url" value={formData.sound_url || ''} onChange={handleChange} />

      <label>Уровень:</label>
      <input name="level" type="number" min="1" max="6" value={formData.level || ''} onChange={handleChange} />

      <label>Макс. уровень:</label>
      <input name="maxLevel" type="number" min="1" max="6" value={formData.maxLevel || ''} onChange={handleChange} />

      <label>Тип:</label>
      <input name="type" value={formData.type || ''} onChange={handleChange} />

      <label>Род:</label>
      <input name="gender" value={formData.gender || ''} onChange={handleChange} />

      <label>Фраза:</label>
      <select name="is_phrase" value={formData.is_phrase} onChange={handleChange}>
        <option value="0">Нет</option>
        <option value="1">Да</option>
      </select>

      <br />
      <button onClick={handleSubmit}>Сохранить</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default WordEditor;
