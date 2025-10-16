import React from 'react';
import WordInGroup from './WordInGroup';

/**
 * Компонент группы слов с автоматической регистрацией
 */
const WordGroup = ({ 
  title, 
  className, 
  words, 
  groupCheck, 
  groupWords, 
  onCheck, 
  onReset 
}) => {
  return (
    <div className={className}>
      <h3>{title}</h3>
      <div className="words-container">
        {words.map((word, index) => (
          <div key={index} className="word-card">
            <div className="color-name">{word.name}</div>
            <WordInGroup 
              wordText={word.text} 
              groupCheck={groupCheck} 
              groupWords={groupWords} 
            />
          </div>
        ))}
      </div>
      <div className="group-controls">
        <button onClick={onCheck} className="btn-check-group">
          ✓ Проверить группу
        </button>
        <button onClick={onReset} className="btn-reset-group">
          🔄 Сбросить
        </button>
      </div>
    </div>
  );
};

export default WordGroup;
