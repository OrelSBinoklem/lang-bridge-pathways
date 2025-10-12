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
              Это помогает эффективно запоминать слова на долгий срок.
            </p>
          </section>

          <section className="help-section">
            <h3>⭐ Система баллов</h3>
            <ul>
              <li><strong>0 баллов</strong> — слово новое, начинайте изучение</li>
              <li><strong>1 балл</strong> — вы ответили правильно с первого раза</li>
              <li><strong>2 балла</strong> — слово полностью изучено! ✓</li>
            </ul>
            <p className="help-note">
              💡 Вам нужно набрать по 2 балла для прямого и обратного перевода каждого слова.
            </p>
          </section>

          <section className="help-section">
            <h3>⏱️ Временные откаты</h3>
            <ul>
              <li><strong>20 часов</strong> — откат после получения первого балла (правильный ответ с первой попытки)</li>
              <li><strong>30 минут</strong> — откат после выхода из режима обучения</li>
            </ul>
            <p className="help-note">
              ⚠️ Пока идет откат, слово не появится в тренировке. Отдохните и возвращайтесь!
            </p>
          </section>

          <section className="help-section">
            <h3>📚 Режим обучения</h3>
            <p>
              Если вы ответили <strong>неправильно с первой попытки</strong>, слово переходит в режим обучения. 
              В этом режиме вы можете пытаться ответить сколько угодно раз без штрафов.
            </p>
            <p className="help-note">
              ✅ Когда ответите правильно, слово получит 30-минутный откат (но без балла).
            </p>
          </section>

          <section className="help-section">
            <h3>🎲 Индикаторы в списке</h3>
            <ul>
              <li><strong>Слово видно, перевод скрыт (█)</strong> — начните с прямого перевода</li>
              <li><strong>⏱️ Таймер</strong> — слово на откате, подождите</li>
              <li><strong>📚 Учу</strong> — слово в режиме обучения</li>
              <li><strong>✓</strong> — частично изучено (1 балл)</li>
              <li><strong>✓ + всё видно</strong> — полностью изучено (2 балла)</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>🚫 Кнопка "Сбросить"</h3>
            <p>
              Сбрасывает все тренировочные данные категории (баллы, откаты, режим обучения). 
              Используйте, если хотите начать изучение категории заново.
            </p>
          </section>

          <section className="help-section help-tips">
            <h3>💡 Советы</h3>
            <ul>
              <li>Старайтесь отвечать правильно с первого раза — так вы быстрее накопите баллы</li>
              <li>Не переживайте из-за ошибок — режим обучения поможет закрепить материал</li>
              <li>Возвращайтесь после откатов — повторение через интервалы очень эффективно!</li>
              <li>Изучайте слова в обе стороны — так вы лучше их запомните</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

