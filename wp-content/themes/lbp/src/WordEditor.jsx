import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { useAdminMode } from './custom/contexts/AdminModeContext';

const INFO_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ header: [1, 2, 3, false] }],
    ['clean'],
  ],
};

const DEFAULT_PROGRESS = {
  attempts: 0,
  correct_attempts: 0,
  attempts_revert: 0,
  correct_attempts_revert: 0,
  mode_education: 0,
  mode_education_revert: 0,
  last_shown: '',
  last_shown_revert: '',
};

const WordEditor = ({ dictionaryId, word, onClose, onRefreshDictionaryWords, onRefreshUserData }) => {
  const { isAdminModeActive } = useAdminMode();
  const [formData, setFormData] = useState({ ...word });
  const [status, setStatus] = useState(null);
  const [infoWysiwyg, setInfoWysiwyg] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showInfoHtmlModal, setShowInfoHtmlModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressUserDisplay, setProgressUserDisplay] = useState('');
  const [progressForm, setProgressForm] = useState({ ...DEFAULT_PROGRESS });
  const [progressStatus, setProgressStatus] = useState(null);

  const onInfoHtmlChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, info: value }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const loadProgressForModal = useCallback(async () => {
    if (!word?.id) return;
    setProgressStatus(null);
    try {
      const fd = new FormData();
      fd.append('action', 'get_word_progress_admin');
      fd.append('word_id', word.id);
      const res = await axios.post(window.myajax.url, fd);
      if (res.data?.success) {
        const p = res.data.data?.progress || null;
        setProgressUserDisplay(res.data.data?.user_display || '');
        setProgressForm({
          attempts: p?.attempts ?? 0,
          correct_attempts: p?.correct_attempts ?? 0,
          attempts_revert: p?.attempts_revert ?? 0,
          correct_attempts_revert: p?.correct_attempts_revert ?? 0,
          mode_education: p?.mode_education ?? 0,
          mode_education_revert: p?.mode_education_revert ?? 0,
          last_shown: p?.last_shown ? String(p.last_shown).replace(' ', 'T').slice(0, 19) : '',
          last_shown_revert: p?.last_shown_revert ? String(p.last_shown_revert).replace(' ', 'T').slice(0, 19) : '',
        });
      }
    } catch (e) {
      setProgressStatus('Ошибка загрузки: ' + (e?.message || ''));
    }
  }, [word?.id]);

  useEffect(() => {
    if (showProgressModal && word?.id) loadProgressForModal();
  }, [showProgressModal, word?.id, loadProgressForModal]);

  const handleProgressFieldChange = (e) => {
    const { name, value } = e.target;
    setProgressForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProgress = async () => {
    setProgressStatus(null);
    try {
      const fd = new FormData();
      fd.append('action', 'update_word_progress_admin');
      fd.append('word_id', word.id);
      fd.append('attempts', progressForm.attempts);
      fd.append('correct_attempts', progressForm.correct_attempts);
      fd.append('attempts_revert', progressForm.attempts_revert);
      fd.append('correct_attempts_revert', progressForm.correct_attempts_revert);
      fd.append('mode_education', progressForm.mode_education);
      fd.append('mode_education_revert', progressForm.mode_education_revert);
      fd.append('last_shown', progressForm.last_shown ? progressForm.last_shown.replace('T', ' ') : '');
      fd.append('last_shown_revert', progressForm.last_shown_revert ? progressForm.last_shown_revert.replace('T', ' ') : '');
      const res = await axios.post(window.myajax.url, fd);
      if (res.data?.success) {
        setProgressStatus('Прогресс сохранён');
        if (onRefreshDictionaryWords) onRefreshDictionaryWords();
        if (onRefreshUserData) onRefreshUserData();
      } else {
        setProgressStatus(res.data?.data?.message || 'Ошибка');
      }
    } catch (e) {
      setProgressStatus('Ошибка: ' + (e?.message || ''));
    }
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
      {isAdminModeActive && (
        <div className="word-editor-progress-row">
          <button
            type="button"
            className="word-editor-progress-btn"
            onClick={() => setShowProgressModal(true)}
            title="Редактировать прогресс обучения (текущий админ и это слово)"
          >
            Редактировать прогресс
          </button>
        </div>
      )}

      {showProgressModal && (
        <div className="info-wysiwyg-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100002 }}>
          <div className="info-wysiwyg-modal word-editor-progress-modal">
            <div className="info-wysiwyg-modal-header">
              <span>Редактирование прогресса обучения</span>
              <button type="button" className="info-wysiwyg-modal-close" onClick={() => { setShowProgressModal(false); setProgressStatus(null); }}>
                ✕
              </button>
            </div>
            <div className="info-wysiwyg-modal-body">
              <p className="word-editor-progress-meta"><strong>Пользователь:</strong> {progressUserDisplay || '—'}</p>
              <p className="word-editor-progress-meta"><strong>Слово:</strong> {word?.word ?? ''} (ID: {word?.id ?? '—'})</p>
              <div className="field-row">
                <label>attempts (прямой):</label>
                <input type="number" min="0" name="attempts" value={progressForm.attempts} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>correct_attempts (прямой):</label>
                <input type="number" min="0" name="correct_attempts" value={progressForm.correct_attempts} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>attempts_revert (обратный):</label>
                <input type="number" min="0" name="attempts_revert" value={progressForm.attempts_revert} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>correct_attempts_revert (обратный):</label>
                <input type="number" min="0" name="correct_attempts_revert" value={progressForm.correct_attempts_revert} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>mode_education (0/1):</label>
                <input type="number" min="0" max="1" name="mode_education" value={progressForm.mode_education} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>mode_education_revert (0/1):</label>
                <input type="number" min="0" max="1" name="mode_education_revert" value={progressForm.mode_education_revert} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>last_shown:</label>
                <input type="datetime-local" name="last_shown" value={progressForm.last_shown} onChange={handleProgressFieldChange} />
              </div>
              <div className="field-row">
                <label>last_shown_revert:</label>
                <input type="datetime-local" name="last_shown_revert" value={progressForm.last_shown_revert} onChange={handleProgressFieldChange} />
              </div>
              {progressStatus && <p className="word-editor-progress-status">{progressStatus}</p>}
              <button type="button" className="word-editor-progress-save" onClick={handleSaveProgress}>Сохранить прогресс</button>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => { setInfoWysiwyg(false); setShowInfoModal(false); setShowInfoHtmlModal(true); }}
            >
              HTML
            </button>
            <button
              type="button"
              className={`info-mode-btn ${infoWysiwyg ? 'is-active' : ''}`}
              onClick={() => { setInfoWysiwyg(true); setShowInfoHtmlModal(false); setShowInfoModal(true); }}
              title="Списки, заголовки, выделение"
            >
              Визуальный
            </button>
          </div>
          <div className="info-preview">
            {showInfoHtmlModal || showInfoModal ? (
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
        </div>
      </div>

      {showInfoHtmlModal && (
        <div className="info-wysiwyg-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100001 }}>
          <div className="info-wysiwyg-modal">
            <div className="info-wysiwyg-modal-header">
              <span>Подсказка — редактор HTML</span>
              <button type="button" className="info-wysiwyg-modal-close" onClick={() => setShowInfoHtmlModal(false)}>
                Готово
              </button>
            </div>
            <div className="info-wysiwyg-modal-body" style={{ minHeight: '280px' }}>
              <CodeMirror
                value={formData.info || ''}
                onChange={onInfoHtmlChange}
                extensions={[html({ matchClosingTags: true, autoCloseTags: true })]}
                placeholder="HTML-код подсказки..."
                basicSetup={{ lineNumbers: true, foldGutter: true }}
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="info-wysiwyg-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100001 }}>
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
        </div>
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
