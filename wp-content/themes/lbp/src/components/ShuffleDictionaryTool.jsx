import axios from "axios";
const { useState } = wp.element;

/**
 * Инструмент для перемешивания слов словаря (защита авторских прав)
 * 
 * Перемешивает ДАННЫЕ записей (ID остаются, слова меняются местами)
 * 
 * ВАЖНО: Операция необратима!
 */
const ShuffleDictionaryTool = ({ dictionaryId, onComplete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleOpenConfirm = () => {
    setShowConfirm(true);
    setConfirmed(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    setShowConfirm(false);
    setConfirmed(false);
    setError(null);
  };

  const handleExecute = async () => {
    if (!confirmed) {
      setError('Подтвердите операцию галочкой');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'initialize_and_shuffle_dictionary');
      formData.append('dictionary_id', dictionaryId);
      formData.append('confirm', 'YES_SHUFFLE_PERMANENTLY');

      const response = await axios.post(window.myajax.url, formData);

      if (response.data.success) {
        setResult(response.data.data);
        if (onComplete) {
          onComplete();
        }
      } else {
        setError(response.data.data?.message || 'Ошибка при выполнении операции');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Показываем кнопку только для админов
  if (!window.myajax || !window.myajax.is_admin) {
    return null;
  }

  return (
    <>
      <button 
        className="shuffle-dictionary-btn"
        onClick={handleOpenConfirm}
        title="Перемешать слова для защиты авторских прав"
      >
        🎲 Перемешать словарь
      </button>

      {showConfirm && (
        <div className="shuffle-dictionary-modal">
          <div className="shuffle-dictionary-overlay" onClick={handleClose}></div>
          <div className="shuffle-dictionary-content">
            <div className="shuffle-dictionary-header">
              <h2>⚠️ Перемешивание словаря</h2>
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>

            <div className="shuffle-dictionary-body">
              {!result ? (
                <>
                  <div className="warning-box">
                    <p><strong>ВНИМАНИЕ! Эта операция необратима!</strong></p>
                    <p>Будет выполнено случайное перемешивание ДАННЫХ слов внутри каждой категории:</p>
                    <ul>
                      <li>ID записей остаются прежними</li>
                      <li>Слова, переводы и все данные меняются местами случайным образом</li>
                      <li>Order не изменяется</li>
                    </ul>
                    <p>Это защитит от прямого копирования авторских материалов из БД.</p>
                  </div>

                  {error && (
                    <div className="error-box">
                      {error}
                    </div>
                  )}

                  <div className="confirm-checkbox-group">
                    <label className="confirm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        disabled={loading}
                        className="confirm-checkbox"
                      />
                      <span className="confirm-text">
                        Я понимаю, что это действие необратимо и хочу перемешать словарь
                      </span>
                    </label>
                  </div>

                  <div className="shuffle-dictionary-actions">
                    <button 
                      className="cancel-btn"
                      onClick={handleClose}
                      disabled={loading}
                    >
                      Отмена
                    </button>
                    <button 
                      className="execute-btn"
                      onClick={handleExecute}
                      disabled={loading || !confirmed}
                    >
                      {loading ? '⏳ Выполняется...' : '🎲 Выполнить перемешивание'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="success-box">
                  <h3>✅ Операция выполнена успешно!</h3>
                  <p>{result.message}</p>
                  <ul>
                    <li>Обработано категорий: <strong>{result.categories_processed}</strong></li>
                    <li>Перемешано записей: <strong>{result.words_shuffled}</strong></li>
                  </ul>
                  <button 
                    className="close-success-btn"
                    onClick={handleClose}
                  >
                    Закрыть
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShuffleDictionaryTool;

