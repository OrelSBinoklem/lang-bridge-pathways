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
  statistic_attempts: 0,
  statistic_attempts_revert: 0,
  statistic_correct_attempts: 0,
  statistic_correct_attempts_revert: 0,
  mode_education: 0,
  mode_education_revert: 0,
  easy_education: 0,
  cooldown_tier_snapshot: 0,
  cooldown_tier_revert_snapshot: 0,
  attempts_all: 0,
  correct_attempts_all: 0,
  easy_correct: 0,
  easy_correct_revert: 0,
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
  const [progressUserDisplay, setProgressUserDisplay] = useState('');
  const [progressRecordId, setProgressRecordId] = useState(null);
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

  const loadProgress = useCallback(async () => {
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
        setProgressRecordId(p?.id != null ? Number(p.id) : null);
        setProgressForm({
          attempts: p?.attempts ?? 0,
          correct_attempts: Math.min(2, Math.max(0, Number(p?.correct_attempts) || 0)),
          attempts_revert: p?.attempts_revert ?? 0,
          correct_attempts_revert: Math.min(2, Math.max(0, Number(p?.correct_attempts_revert) || 0)),
          statistic_attempts: p?.statistic_attempts ?? 0,
          statistic_attempts_revert: p?.statistic_attempts_revert ?? 0,
          statistic_correct_attempts: p?.statistic_correct_attempts ?? 0,
          statistic_correct_attempts_revert: p?.statistic_correct_attempts_revert ?? 0,
          mode_education: p?.mode_education ?? 0,
          mode_education_revert: p?.mode_education_revert ?? 0,
          easy_education: p?.easy_education ?? 0,
          cooldown_tier_snapshot: p?.cooldown_tier ?? 0,
          cooldown_tier_revert_snapshot: p?.cooldown_tier_revert ?? 0,
          attempts_all: p?.attempts_all ?? 0,
          correct_attempts_all: p?.correct_attempts_all ?? 0,
          easy_correct: p?.easy_correct ?? 0,
          easy_correct_revert: p?.easy_correct_revert ?? 0,
          last_shown: p?.last_shown ? String(p.last_shown).replace(' ', 'T').slice(0, 19) : '',
          last_shown_revert: p?.last_shown_revert ? String(p.last_shown_revert).replace(' ', 'T').slice(0, 19) : '',
        });
      }
    } catch (e) {
      setProgressStatus('Ошибка загрузки: ' + (e?.message || ''));
    }
  }, [word?.id]);

  useEffect(() => {
    if (isAdminModeActive && word?.id) loadProgress();
  }, [isAdminModeActive, word?.id, loadProgress]);

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
      fd.append('statistic_attempts', progressForm.statistic_attempts);
      fd.append('statistic_attempts_revert', progressForm.statistic_attempts_revert);
      fd.append('statistic_correct_attempts', progressForm.statistic_correct_attempts);
      fd.append('statistic_correct_attempts_revert', progressForm.statistic_correct_attempts_revert);
      fd.append('mode_education', progressForm.mode_education);
      fd.append('mode_education_revert', progressForm.mode_education_revert);
      fd.append('easy_education', progressForm.easy_education);
      fd.append('attempts_all', progressForm.attempts_all);
      fd.append('correct_attempts_all', progressForm.correct_attempts_all);
      fd.append('easy_correct', progressForm.easy_correct);
      fd.append('easy_correct_revert', progressForm.easy_correct_revert);
      fd.append('cooldown_tier', Math.min(2, Math.max(0, parseInt(progressForm.cooldown_tier_snapshot, 10) || 0)));
      fd.append('cooldown_tier_revert', Math.min(2, Math.max(0, parseInt(progressForm.cooldown_tier_revert_snapshot, 10) || 0)));
      fd.append('last_shown', progressForm.last_shown ? progressForm.last_shown.replace('T', ' ') : '');
      fd.append('last_shown_revert', progressForm.last_shown_revert ? progressForm.last_shown_revert.replace('T', ' ') : '');
      const res = await axios.post(window.myajax.url, fd);
      if (res.data?.success) {
        setProgressStatus('Прогресс сохранён');
        await loadProgress();
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

      <h4 className="word-editor-section-heading word-editor-section-heading--dict">Поля слова в словаре</h4>

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

      {isAdminModeActive && (
        <section className="word-editor-user-progress-section" aria-labelledby="word-editor-user-progress-heading">
          <h4 id="word-editor-user-progress-heading" className="word-editor-section-heading">
            Состояние изучения для текущего пользователя
          </h4>
          <p className="word-editor-progress-meta">
            <strong>Пользователь:</strong> {progressUserDisplay || '—'} · <strong>Слово:</strong> {word?.word ?? ''}{' '}
            (dict_word_id: {word?.id ?? '—'})
            {progressRecordId != null && (
              <> · <strong>id строки прогресса:</strong> {progressRecordId}</>
            )}
          </p>

          <div className="word-editor-progress-fieldset word-editor-progress-fieldset--all">
            <div className="field-row">
              <label>correct_attempts:</label>
              <select
                name="correct_attempts"
                value={progressForm.correct_attempts}
                onChange={(e) =>
                  setProgressForm((prev) => ({ ...prev, correct_attempts: parseInt(e.target.value, 10) }))
                }
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="field-row">
              <label>correct_attempts_revert:</label>
              <select
                name="correct_attempts_revert"
                value={progressForm.correct_attempts_revert}
                onChange={(e) =>
                  setProgressForm((prev) => ({ ...prev, correct_attempts_revert: parseInt(e.target.value, 10) }))
                }
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="field-row">
              <label>attempts:</label>
              <input type="number" min="0" name="attempts" value={progressForm.attempts} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>attempts_revert:</label>
              <input type="number" min="0" name="attempts_revert" value={progressForm.attempts_revert} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>attempts_all:</label>
              <input type="number" min="0" name="attempts_all" value={progressForm.attempts_all} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>correct_attempts_all:</label>
              <input type="number" min="0" name="correct_attempts_all" value={progressForm.correct_attempts_all} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>mode_education:</label>
              <input type="number" min="0" max="1" name="mode_education" value={progressForm.mode_education} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>mode_education_revert:</label>
              <input type="number" min="0" max="1" name="mode_education_revert" value={progressForm.mode_education_revert} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>easy_education:</label>
              <input type="number" min="0" name="easy_education" value={progressForm.easy_education} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>easy_correct:</label>
              <input type="number" min="0" name="easy_correct" value={progressForm.easy_correct} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>easy_correct_revert:</label>
              <input type="number" min="0" name="easy_correct_revert" value={progressForm.easy_correct_revert} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>cooldown_tier:</label>
              <select
                value={Math.min(2, Math.max(0, Number(progressForm.cooldown_tier_snapshot) || 0))}
                onChange={(e) =>
                  setProgressForm((prev) => ({
                    ...prev,
                    cooldown_tier_snapshot: parseInt(e.target.value, 10),
                  }))
                }
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="field-row">
              <label>cooldown_tier_revert:</label>
              <select
                value={Math.min(2, Math.max(0, Number(progressForm.cooldown_tier_revert_snapshot) || 0))}
                onChange={(e) =>
                  setProgressForm((prev) => ({
                    ...prev,
                    cooldown_tier_revert_snapshot: parseInt(e.target.value, 10),
                  }))
                }
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="field-row">
              <label>statistic_attempts:</label>
              <input type="number" min="0" name="statistic_attempts" value={progressForm.statistic_attempts} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>statistic_correct_attempts:</label>
              <input type="number" min="0" name="statistic_correct_attempts" value={progressForm.statistic_correct_attempts} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>statistic_attempts_revert:</label>
              <input type="number" min="0" name="statistic_attempts_revert" value={progressForm.statistic_attempts_revert} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>statistic_correct_attempts_revert:</label>
              <input type="number" min="0" name="statistic_correct_attempts_revert" value={progressForm.statistic_correct_attempts_revert} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>last_shown:</label>
              <input type="datetime-local" name="last_shown" value={progressForm.last_shown} onChange={handleProgressFieldChange} />
            </div>
            <div className="field-row">
              <label>last_shown_revert:</label>
              <input type="datetime-local" name="last_shown_revert" value={progressForm.last_shown_revert} onChange={handleProgressFieldChange} />
            </div>
          </div>

          <div className="word-editor-progress-actions">
            {progressStatus && <p className="word-editor-progress-status">{progressStatus}</p>}
            <button type="button" className="word-editor-progress-save" onClick={handleSaveProgress}>
              Сохранить прогресс
            </button>
            <button type="button" className="word-editor-progress-reload" onClick={() => loadProgress()}>
              Обновить из БД
            </button>
          </div>
        </section>
      )}

      <br />
      <button onClick={handleSubmit}>Сохранить</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default WordEditor;
