const { useState, useMemo, useEffect } = wp.element;

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Мини-игра: сопоставление слов и переводов перетаскиванием.
 * Не отправляет запросы на сервер и не влияет на прогресс.
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {Array<{id, word, translation_1}>} words - пары слово/перевод
 */
const MatchGameModal = ({ isOpen, onClose, words = [] }) => {
  const pairs = useMemo(() => {
    return words
      .filter(w => w && (w.word || w.word === '') && (w.translation_1 || w.translation_1 === ''))
      .map(w => ({ wordId: w.id, wordText: String(w.word || '').trim(), translationText: String(w.translation_1 || '').trim() }))
      .filter(p => p.wordText !== '' && p.translationText !== '');
  }, [words]);

  const rightItems = useMemo(() => {
    return shuffleArray(pairs.map((p, i) => ({ id: `right-${p.wordId}-${i}`, wordId: p.wordId, text: p.translationText })));
  }, [pairs, isOpen]);

  const [assigned, setAssigned] = useState({});
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setAssigned({});
      setCheckResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId: item.id, wordId: item.wordId, text: item.text }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnWord = (e, targetWordId) => {
    e.preventDefault();
    try {
      const { itemId, text } = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      if (!itemId || !text) return;
      setAssigned(prev => ({ ...prev, [targetWordId]: { itemId, text } }));
      setCheckResult(null);
    } catch (_) {}
  };

  const clearAssignment = (wordId) => {
    setAssigned(prev => {
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
    setCheckResult(null);
  };

  const takenItemIds = new Set(Object.values(assigned).map(a => a?.itemId).filter(Boolean));
  const rightColumnItems = rightItems.filter(item => !takenItemIds.has(item.id));

  const handleCheck = () => {
    const correct = pairs.every(p => assigned[p.wordId]?.text === p.translationText);
    const correctCount = pairs.filter(p => assigned[p.wordId]?.text === p.translationText).length;
    setCheckResult({ correct, correctCount, total: pairs.length });
  };

  const handleClose = () => {
    setAssigned({});
    setCheckResult(null);
    onClose();
  };

  return (
    <div className="match-game-overlay" onClick={handleClose}>
      <div className="match-game-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="match-game-close" onClick={handleClose} title="Закрыть">×</button>
        <h3 className="match-game-title">🎮 Мини-игра: сопоставь переводы</h3>
        <p className="match-game-hint">Перетащи переводы из правого столбца к словам слева. На прогресс это не влияет.</p>

        {pairs.length === 0 ? (
          <p className="match-game-empty">Нет слов для игры в этой категории.</p>
        ) : (
          <>
            <div className="match-game-columns">
              <div className="match-game-col match-game-col-words">
                <div className="match-game-col-title">Слова</div>
                {pairs.map(p => (
                  <div
                    key={p.wordId}
                    className="match-game-word-row"
                    onDragOver={handleDragOver}
                    onDrop={e => handleDropOnWord(e, p.wordId)}
                  >
                    <span className="match-game-word-text">{p.wordText}</span>
                    <span className="match-game-word-slot">
                      {assigned[p.wordId] ? (
                        <span className="match-game-dropped" onClick={() => clearAssignment(p.wordId)} title="Убрать">
                          {assigned[p.wordId].text}
                        </span>
                      ) : (
                        <span className="match-game-slot-placeholder">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="match-game-col match-game-col-translations">
                <div className="match-game-col-title">Переводы</div>
                {rightColumnItems.map(item => (
                  <div
                    key={item.id}
                    className="match-game-translation-item"
                    draggable
                    onDragStart={e => handleDragStart(e, item)}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="match-game-actions">
              <button type="button" className="training-button match-game-check-btn" onClick={handleCheck}>
                Проверить
              </button>
            </div>

            {checkResult !== null && (
              <div className={`match-game-result ${checkResult.correct ? 'match-game-result-ok' : 'match-game-result-wrong'}`}>
                {checkResult.correct
                  ? `✅ Всё верно: ${checkResult.correctCount} из ${checkResult.total}`
                  : `❌ Верно: ${checkResult.correctCount} из ${checkResult.total}`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MatchGameModal;
