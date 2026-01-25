import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import ReactQuill from 'react-quill';

const INFO_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ header: [1, 2, 3, false] }],
    ['clean'],
  ],
};

const WordEditor = ({ dictionaryId, word, onClose, onRefreshDictionaryWords }) => {
  const [formData, setFormData] = useState({ ...word });
  const [status, setStatus] = useState(null);
  const [infoWysiwyg, setInfoWysiwyg] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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
        // Обновляем слова словаря после успешного сохранения
        if (onRefreshDictionaryWords) {
          onRefreshDictionaryWords();
        }
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
      <h3>
        Редактирование слова
        <button type="button" className="close-button" onClick={onClose}>
          ✕
        </button>
      </h3>

      <div className="field-row">
        <label>Слово:</label>
        <input name="word" value={formData.word} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Перевод 1:</label>
        <input name="translation_1" value={formData.translation_1 || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Перевод 2:</label>
        <input name="translation_2" value={formData.translation_2 || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Перевод 3:</label>
        <input name="translation_3" value={formData.translation_3 || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Доп. варианты:</label>
        <input 
          name="translation_input_variable" 
          value={formData.translation_input_variable || ''} 
          onChange={handleChange}
          placeholder="вариант1, вариант2, вариант3"
          title="Дополнительные варианты перевода для проверки ответов (не отображаются пользователю)"
        />
      </div>

      <div className="field-row">
        <label>Сложный перевод:</label>
        <input name="difficult_translation" value={formData.difficult_translation || ''} onChange={handleChange} />
      </div>

      <div className="field-row field-row--info">
        <label>Подсказка:</label>
        <div className="info-editor-wrap">
          <div className="info-editor-actions">
            <button
              type="button"
              className={`info-mode-btn ${!infoWysiwyg ? 'is-active' : ''}`}
              onClick={() => { setInfoWysiwyg(false); setShowInfoModal(false); }}
            >
              HTML
            </button>
            <button
              type="button"
              className={`info-mode-btn ${infoWysiwyg ? 'is-active' : ''}`}
              onClick={() => { setInfoWysiwyg(true); setShowInfoModal(true); }}
              title="Списки, заголовки, выделение"
            >
              Визуальный
            </button>
          </div>
          {infoWysiwyg ? (
            <div className="info-preview">
              {showInfoModal ? (
                <span className="info-preview-editing">Редактируется в окне…</span>
              ) : formData.info ? (
                (() => {
                  const plain = String(formData.info).replace(/<[^>]+>/g, ' ').trim();
                  return <span>{plain.slice(0, 80)}{plain.length > 80 ? '…' : ''}</span>;
                })()
              ) : (
                <span className="info-preview-empty">Нет текста</span>
              )}
            </div>
          ) : (
            <textarea
              name="info"
              value={formData.info || ''}
              onChange={handleChange}
              rows={5}
              style={{ resize: 'vertical', minHeight: '5em' }}
            />
          )}
        </div>
      </div>

      {showInfoModal && createPortal(
        <div className="info-wysiwyg-modal-overlay">
          <div className="info-wysiwyg-modal">
            <div className="info-wysiwyg-modal-header">
              <span>Подсказка — визуальный редактор</span>
              <button type="button" className="info-wysiwyg-modal-close" onClick={() => setShowInfoModal(false)}>
                Готово
              </button>
            </div>
            <div className="info-wysiwyg-modal-body">
              <ReactQuill
                theme="snow"
                value={formData.info || ''}
                onChange={(v) => setFormData((p) => ({ ...p, info: v }))}
                modules={INFO_MODULES}
                className="info-quill info-quill--modal"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="field-row">
        <label>Ссылка на звук:</label>
        <input name="sound_url" value={formData.sound_url || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Уровень:</label>
        <input name="level" type="number" min="1" max="6" value={formData.level || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Макс. уровень:</label>
        <input name="maxLevel" type="number" min="1" max="6" value={formData.maxLevel || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Тип:</label>
        <input name="type" value={formData.type || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Род:</label>
        <input name="gender" value={formData.gender || ''} onChange={handleChange} />
      </div>

      <div className="field-row">
        <label>Фраза:</label>
        <select name="is_phrase" value={formData.is_phrase} onChange={handleChange}>
          <option value="0">Нет</option>
          <option value="1">Да</option>
        </select>
      </div>

      <br />
      <button onClick={handleSubmit}>Сохранить</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default WordEditor;
