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
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {Array<{id, word, translation_1}>} words - пары слово/перевод
 * @param {function} [onFullSuccess] - вызывается при полностью правильном ответе (засчитывается раунд плотного дообучения)
 * @param {number} [denseWaitingRemainingSec] - оставшееся время отката плотного дообучения (сек); при > 0 кнопка «Проверить» disabled и на ней показывается таймер
 */
const MatchGameModal = ({ isOpen, onClose, words = [], onFullSuccess, denseWaitingRemainingSec = 0 }) => {
  const pairs = useMemo(() => {
    return words
      .filter(w => w && (w.word || w.word === '') && (w.translation_1 || w.translation_1 === ''))
      .map(w => ({ wordId: w.id, wordText: String(w.word || '').trim(), translationText: String(w.translation_1 || '').trim() }))
      .filter(p => p.wordText !== '' && p.translationText !== '');
  }, [words]);

  const pairsSignature = useMemo(
    () => pairs.map(p => `${p.wordId}:${p.translationText}`).join('|'),
    [pairs]
  );
  const [rightItems, setRightItems] = useState([]);

  const [assigned, setAssigned] = useState({});
  const [checkResult, setCheckResult] = useState(null);
  /** После нажатия «Проверить» — множество wordId правильных пар (подсвечиваем зелёным) */
  const [verifiedCorrectIds, setVerifiedCorrectIds] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Перемешиваем только при открытии окна/смене набора слов, а не на каждом ререндере.
      setRightItems(shuffleArray(pairs.map((p, i) => ({
        id: `right-${p.wordId}-${i}`,
        wordId: p.wordId,
        text: p.translationText,
      }))));
      setAssigned({});
      setCheckResult(null);
      setVerifiedCorrectIds(null);
    }
  }, [isOpen, pairsSignature]);

  if (!isOpen) return null;

  const clearVerified = () => {
    setVerifiedCorrectIds(null);
  };

  const handleDragStartRight = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'from-right', itemId: item.id, wordId: item.wordId, text: item.text }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartSlot = (e, wordId) => {
    const a = assigned[wordId];
    if (!a) return;
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'from-slot', sourceWordId: wordId, itemId: a.itemId, text: a.text }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnWord = (e, targetWordId) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      const { type, itemId, text } = data;
      if (type === 'from-slot') {
        const sourceWordId = data.sourceWordId;
        if (sourceWordId === targetWordId) return;
        setAssigned(prev => {
          const next = { ...prev };
          delete next[sourceWordId];
          next[targetWordId] = { itemId, text };
          return next;
        });
      } else {
        if (!itemId || !text) return;
        setAssigned(prev => ({ ...prev, [targetWordId]: { itemId, text } }));
      }
      clearVerified();
      setCheckResult(null);
    } catch (_) {}
  };

  const handleDropOnRightColumn = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      if (data.type === 'from-slot' && data.sourceWordId != null) {
        setAssigned(prev => {
          const next = { ...prev };
          delete next[data.sourceWordId];
          return next;
        });
        clearVerified();
        setCheckResult(null);
      }
    } catch (_) {}
  };

  const clearAssignment = (wordId) => {
    setAssigned(prev => {
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
    clearVerified();
    setCheckResult(null);
  };

  const takenItemIds = new Set(Object.values(assigned).map(a => a?.itemId).filter(Boolean));
  const rightColumnItems = rightItems.filter(item => !takenItemIds.has(item.id));

  const resetGame = () => {
    setRightItems(shuffleArray(pairs.map((p, i) => ({
      id: `right-${p.wordId}-${i}-${Date.now()}`,
      wordId: p.wordId,
      text: p.translationText,
    }))));
    setAssigned({});
    setCheckResult(null);
    setVerifiedCorrectIds(null);
  };

  const handleCheck = () => {
    const correctCount = pairs.filter(p => assigned[p.wordId]?.text === p.translationText).length;
    const correct = correctCount === pairs.length;
    const correctIds = new Set(pairs.filter(p => assigned[p.wordId]?.text === p.translationText).map(p => p.wordId));
    setVerifiedCorrectIds(correctIds);
    setCheckResult({ correct, correctCount, total: pairs.length });
    if (correct && typeof onFullSuccess === 'function') {
      onFullSuccess();
      resetGame();
    }
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
        <p className="match-game-hint">Перетащи переводы справа к словам слева. Можно перетаскивать с одного сопоставления на другое или вернуть перевод обратно в правую колонку. После «Проверить» правильные пары подсвечиваются зелёным. При полном совпадении засчитывается раунд плотного дообучения.</p>

        {pairs.length === 0 ? (
          <p className="match-game-empty">Нет слов для игры в этой категории.</p>
        ) : (
          <>
            <div className="match-game-columns">
              <div className="match-game-col match-game-col-words">
                <div className="match-game-col-title">Слова</div>
                {pairs.map(p => {
                  const isVerifiedCorrect = verifiedCorrectIds != null && verifiedCorrectIds.has(p.wordId);
                  return (
                    <div
                      key={p.wordId}
                      className={`match-game-word-row${isVerifiedCorrect ? ' match-game-word-row--correct' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDropOnWord(e, p.wordId)}
                    >
                      <span className="match-game-word-text">{p.wordText}</span>
                      <span className="match-game-word-slot">
                        {assigned[p.wordId] ? (
                          <span
                            className="match-game-dropped"
                            draggable
                            onDragStart={e => handleDragStartSlot(e, p.wordId)}
                            onClick={() => clearAssignment(p.wordId)}
                            title="Перетащи в другое место или в правую колонку; клик — убрать"
                          >
                            {assigned[p.wordId].text}
                          </span>
                        ) : (
                          <span className="match-game-slot-placeholder">—</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                className="match-game-col match-game-col-translations"
                onDragOver={handleDragOver}
                onDrop={handleDropOnRightColumn}
                title="Сюда можно вернуть перевод со слота слева"
              >
                <div className="match-game-col-title">Переводы</div>
                {rightColumnItems.map(item => (
                  <div
                    key={item.id}
                    className="match-game-translation-item"
                    draggable
                    onDragStart={e => handleDragStartRight(e, item)}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="match-game-actions">
              <button
                type="button"
                className="training-button match-game-check-btn"
                onClick={handleCheck}
                disabled={denseWaitingRemainingSec > 0}
                title={denseWaitingRemainingSec > 0 ? `Откат: подождите ${Math.floor(denseWaitingRemainingSec / 60)}:${String(denseWaitingRemainingSec % 60).padStart(2, '0')}` : undefined}
              >
                {denseWaitingRemainingSec > 0
                  ? `Проверить (${Math.floor(denseWaitingRemainingSec / 60)}:${String(denseWaitingRemainingSec % 60).padStart(2, '0')})`
                  : 'Проверить'}
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
