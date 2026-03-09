import React from 'react';
import { playWordAudio } from '../config/audioConfig';
import { stripParenthesesAndPunctuation } from '../custom/utils/helpers';

// Звук при смене слова вызывается колбэком из Examen (только прямой режим). Здесь только по клику.

const TrainingInterface = ({
  currentWord,
  currentMode,
  userAnswer,
  setUserAnswer,
  showResult,
  isCorrect,
  onCheckAnswer,
  onNextWord,
  onFinishTraining,
  isUpdating = false,
  inEducationMode = false,
  manualInputError = false,
  phraseRetryTooltip = false,
  phraseMinWords = 3,
  selectionMode = false,
  choiceOptions = []
}) => {
  if (!currentWord) return null;

  return (
    <div className="training-interface">
      <button 
        onClick={onFinishTraining}
        className="training-close-button"
        title="Выйти из тренировки"
        type="button"
      >
        ×
      </button>
      
      <div className="training-word-display">
        {currentMode ? (
          <>
            {currentWord.translation_1}
            {currentWord.translation_2 && currentWord.translation_2 !== '0' && `, ${currentWord.translation_2}`}
            {currentWord.translation_3 && currentWord.translation_3 !== '0' && `, ${currentWord.translation_3}`}
          </>
        ) : currentWord.word}
        
        {/* Кнопка повтора звука для прямого перевода (лат→рус) */}
        {!currentMode && (
          <button
            onClick={() => playWordAudio(currentWord.word, currentWord.learn_lang)}
            className="training-audio-button"
            title="Повторить звук"
            type="button"
          >
            🔊
          </button>
        )}
      </div>

      {!showResult && (
        <>
          {phraseRetryTooltip && (
            <div className="training-phrase-retry-tooltip" role="status">
              Ещё одна попытка для фраз — фраза это {phraseMinWords} и более слов
            </div>
          )}
          <input
            data-training-input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onCheckAnswer()}
            placeholder="Введите ваш ответ..."
            autoFocus={!selectionMode}
            className={`training-input ${manualInputError ? 'training-input--error' : ''}`}
          />

          {selectionMode && choiceOptions.length > 0 && (
            <div className="training-choice-options">
              {choiceOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className="training-choice-btn"
                  disabled={isUpdating}
                  onClick={() => {
                    const cleaned = stripParenthesesAndPunctuation(opt);
                    setUserAnswer(cleaned);
                    onCheckAnswer(cleaned);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => onCheckAnswer()}
            disabled={isUpdating}
            className="training-button"
          >
            {isUpdating ? (
              <>
                <span className="training-button-spinner"></span>
                Обновление...
              </>
            ) : userAnswer.trim() ? (
              'Проверить'
            ) : (
              'Пропустить'
            )}
          </button>
        </>
      )}

      {showResult && (
        <div>
          <div className={`training-result ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✅ Правильно!' : (
              <>
                ❌ Неправильно:
                {userAnswer && userAnswer.trim() && (
                  <div style={{ marginTop: '4px', fontSize: '1.1em' }}>{userAnswer.trim()}</div>
                )}
              </>
            )}
          </div>
          {!isCorrect && (
            <>
              <div className="training-correct-answer">
              <strong>Правильный ответ:</strong>
              {currentMode ? (
                <div
                  className="correct-answer-with-audio"
                  onClick={() => playWordAudio(currentWord.word, currentWord.learn_lang)}
                  title="Кликните для воспроизведения звука"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="correct-answer-text">{currentWord.word}</span>
                  <span className="training-audio-button-inline">🔊</span>
                </div>
              ) : (
                <span className="correct-answer-text">
                  {' '}{currentWord.translation_1}
                  {currentWord.translation_2 && currentWord.translation_2 !== '0' && `, ${currentWord.translation_2}`}
                  {currentWord.translation_3 && currentWord.translation_3 !== '0' && `, ${currentWord.translation_3}`}
                </span>
              )}
              </div>
            </>
          )}
          <div className="training-controls">
            <button
              data-next-word
              onClick={onNextWord}
              onKeyPress={(e) => e.key === 'Enter' && onNextWord()}
              tabIndex={0}
              className="training-next-button"
            >
              Следующее слово
            </button>
            <button
              onClick={onFinishTraining}
              onKeyPress={(e) => e.key === 'Enter' && onFinishTraining()}
              tabIndex={1}
              className="training-finish-button"
            >
              Завершить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingInterface;
