import React, { useEffect } from 'react';
import { AUDIO_CONFIG, getLanguageConfig, isLanguageSupported } from '../config/audioConfig';

// Универсальная функция проигрывания звука
const playAudio = (word, learnLang) => {
  try {
    // Определяем язык (по умолчанию из конфига)
    const language = learnLang || AUDIO_CONFIG.DEFAULT_LANGUAGE;
    
    // Проверяем поддержку языка
    if (!isLanguageSupported(language)) {
      console.warn('⚠️ Неподдерживаемый язык:', language, 'Поддерживаемые языки:', Object.keys(AUDIO_CONFIG.SUPPORTED_LANGUAGES));
      return;
    }
    
    // Получаем конфигурацию языка
    const langConfig = getLanguageConfig(language);
    
    // Генерируем имя файла используя функцию slugify из конфига
    const fileName = langConfig.slugify(word) + AUDIO_CONFIG.AUDIO_EXTENSION;
    
    // Строим путь к файлу
    const audioPath = `${AUDIO_CONFIG.BASE_PATH}/${langConfig.folder}/audio/${fileName}`;
    
    console.log('🔊 Воспроизводим:', word, `(${language} - ${langConfig.name}) → файл:`, fileName);
    
    const audio = new Audio(audioPath);
    audio.play().catch(error => {
      console.warn('⚠️ Не удалось воспроизвести звук для:', word, error.message);
    });
  } catch (error) {
    console.warn('⚠️ Ошибка при попытке воспроизведения звука:', error.message);
  }
};

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
  inEducationMode = false
}) => {
  // Автоматически проигрываем слово при смене слова
  useEffect(() => {
    if (currentWord) {
      // Проигрываем слово только если это прямой перевод (лат→рус)
      // При обратном переводе (рус→лат) звук воспроизводим только после ответа
      if (!currentMode) {
        const learnLang = currentWord.learn_lang || AUDIO_CONFIG.DEFAULT_LANGUAGE;
        playAudio(currentWord.word, learnLang);
      }
    }
  }, [currentWord, currentMode]);

  // Воспроизводим звук после показа результата при обратном переводе
  useEffect(() => {
    if (showResult && currentMode && currentWord) {
      // Небольшая задержка чтобы результат успел отобразиться
      setTimeout(() => {
        const learnLang = currentWord.learn_lang || AUDIO_CONFIG.DEFAULT_LANGUAGE;
        playAudio(currentWord.word, learnLang);
      }, 100);
    }
  }, [showResult, currentMode, currentWord]);

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
            onClick={() => {
              const learnLang = currentWord.learn_lang || AUDIO_CONFIG.DEFAULT_LANGUAGE;
              playAudio(currentWord.word, learnLang);
            }}
            className="training-audio-button"
            title="Повторить звук"
            type="button"
          >
            🔊
          </button>
        )}
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
          disabled={!userAnswer.trim() || isUpdating}
          className="training-button"
        >
          {isUpdating ? (
            <>
              <span className="training-button-spinner"></span>
              Обновление...
            </>
          ) : (
            'Проверить'
          )}
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
                  <div 
                    className="correct-answer-with-audio"
                    onClick={() => {
                      const learnLang = currentWord.learn_lang || AUDIO_CONFIG.DEFAULT_LANGUAGE;
                      playAudio(currentWord.word, learnLang);
                    }}
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
