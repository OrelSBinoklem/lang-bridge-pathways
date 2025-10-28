import React from 'react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <button className="help-modal-close" onClick={onClose}>×</button>
        
        <h2 className="help-modal-title">📖 Учим слова по строгому!</h2>
        
        <div className="help-modal-content">
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
                <li>Когда ответите правильно, снова начинается откат 30 мин или 20 часов</li>
                <li>После отката у вас опять появится попытка получить балл</li>
              </ul>
            </div>
            
            <div className="help-note">
              <strong>💡</strong> Слово имеет как прямой перевод, так и обратный,
              и они считаются отдельно! Т.е. выдолжны получить 2 балла за прямой и 2 балла за обратный перевод и тогда слово будет считаться полностью выученным!
            </div>
          </section>

          <section className="help-section">
            <h3>🎲 Индикаторы в списке</h3>
            <ul>
              {/*<li><strong>Слово видно, перевод скрыт (█)</strong> — начните с прямого перевода</li>*/}
              <li><strong>⏱️ Таймер</strong> — слово на откате, подождите</li>
              <li><strong>📚 Учу</strong> — слово в режиме дообучения</li>
              <li><strong className="words-progress-indicator partially-learned">✓</strong> — частично изучено (1 балл)</li>
              <li><strong className="words-progress-indicator fully-learned">✓</strong> — полностью изучено (2 балла)</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>🚫 Кнопка "Лёгкая тренировка"</h3>
            <p>
              Переводит слова в режим дообучения - в сновном нужна для тех слов что вы уже выучили но хотите ещё немного их потренировать но без зброса прогресса в целом.
            </p>
          </section>

          <section className="help-section">
            <h3>🚫 Кнопка "Сбросить"</h3>
            <p>
              Сбрасывает все тренировочные данные категории (баллы, откаты, режим дообучения).
              Используйте, если хотите начать изучение категории заново.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

