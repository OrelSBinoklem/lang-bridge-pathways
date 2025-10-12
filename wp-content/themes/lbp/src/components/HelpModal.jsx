import React from 'react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <button className="help-modal-close" onClick={onClose}>×</button>
        
        <h2 className="help-modal-title">📖 Режим Экзамен</h2>
        
        <div className="help-modal-content">
          <section className="help-section">
            <h3>🎯 Как это работает?</h3>
            <p>
              В режиме <strong>Экзамен</strong> вы проходите усиленную тренировку слов с системой баллов и временных откатов. 
              {/*Это помогает эффективно запоминать слова на долгий срок.*/}
            </p>
          </section>

          <section className="help-section">
            <h3>📚 Режим дообучения</h3>
            <p>
              Чтобы слово засчиталось выученным, вы должны получить <strong>2 балла</strong>. 
              1-й балл даётся, если с первой попытки вы отвечаете правильно после отката 30 мин, 
              а 2-й после 20 часов.
            </p>
            
            <div className="help-note">
              <strong>Если ответили неправильно:</strong>
              <ul>
                <li>Слово переходит в режим дообучения</li>
                <li>Вам даётся неограниченное число попыток</li>
                <li>Когда ответите правильно, начинается откат 30 мин или 20 часов</li>
                <li>После отката у вас опять появится попытка получить балл</li>
              </ul>
            </div>
            
            <div className="help-note">
              <strong>💡 Важно:</strong> Если слово видите в первый раз, отката 30 мин нет, 
              у вас сразу есть попытка получить 1 балл.
            </div>
            
            <div className="help-note">
              <strong>💡 Важно:</strong> Слово имеет как прямой перевод, так и обратный, 
              и они считаются отдельно!
            </div>
          </section>

          <section className="help-section">
            <h3>🎲 Индикаторы в списке</h3>
            <ul>
              <li><strong>Слово видно, перевод скрыт (█)</strong> — начните с прямого перевода</li>
              <li><strong>⏱️ Таймер</strong> — слово на откате, подождите</li>
              <li><strong>📚 Учу</strong> — слово в режиме дообучения</li>
              <li><strong className="words-progress-indicator partially-learned">✓</strong> — частично изучено (1 балл)</li>
              <li><strong className="words-progress-indicator fully-learned">✓</strong> — полностью изучено (2 балла)</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>🚫 Кнопка "Сбросить"</h3>
            <p>
              Сбрасывает все тренировочные данные категории (баллы, откаты, режим дообучения).
              Используйте, если хотите начать изучение категории заново.
            </p>
          </section>

          <section className="help-section help-tips">
            <h3>💡 Советы</h3>
            <ul>
              <li>Не переживайте из-за ошибок — режим дообучения поможет закрепить материал</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

