import React from 'react';

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
  inEducationMode = false
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
      
      <h3 className="training-title">
        {currentMode ? 'Переведите на латышский:' : 'Переведите на русский:'}
      </h3>
      
      {!!inEducationMode && (
        <div style={{ color: '#ff9800', marginBottom: '10px', fontWeight: 'bold' }}>
          📚 Слово переведено в режим обучения!
        </div>
      )}
      
      <div className="training-word-display">
        {currentMode ? currentWord.translation_1 : currentWord.word}
      </div>

      <input
        data-training-input
        type="text"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && !showResult && onCheckAnswer()}
        placeholder="Введите ваш ответ..."
        autoFocus
        className="training-input"
        disabled={showResult}
      />

      {!showResult ? (
        <button
          onClick={onCheckAnswer}
          disabled={!userAnswer.trim()}
          className="training-button"
        >
          Проверить
        </button>
      ) : (
        <div>
          <div className={`training-result ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✅ Правильно!' : '❌ Неправильно'}
          </div>
          
            {!isCorrect && (
              <div className="training-correct-answer">
                <strong>Правильный ответ:</strong>
                {currentMode ? (
                  <span className="correct-answer-text"> {currentWord.word}</span>
                ) : (
                  <span className="correct-answer-text">
                    {' '}{currentWord.translation_1}
                    {currentWord.translation_2 && currentWord.translation_2 !== '0' && `, ${currentWord.translation_2}`}
                    {currentWord.translation_3 && currentWord.translation_3 !== '0' && `, ${currentWord.translation_3}`}
                  </span>
                )}
              </div>
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
