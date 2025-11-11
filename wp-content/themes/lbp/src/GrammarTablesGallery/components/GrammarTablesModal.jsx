import React, { useEffect } from 'react';

const GrammarTablesModal = ({ data, onClose }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden'; // Блокируем прокрутку фона

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose} aria-label="Закрыть">
                    &times;
                </button>

                {data.level && (
                    <span className={`modal-level-badge ${data.level}`}>
                        {data.level.toUpperCase()}
                    </span>
                )}

                <img 
                    src={data.src} 
                    alt={data.alt || 'Грамматическая таблица'}
                    className="modal-image-full"
                />

                {data.description && (
                    <div className="modal-caption">
                        {data.description}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarTablesModal;

