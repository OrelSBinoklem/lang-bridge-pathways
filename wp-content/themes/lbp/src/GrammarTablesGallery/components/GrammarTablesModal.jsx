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
                <button className="modal-close-btn" onClick={onClose}>
                    &times;
                </button>
                
                <div className="modal-header">
                    <h3>Таблица грамматики</h3>
                    <span className={`level-badge ${data.level}`}>
                        {data.level.toUpperCase()}
                    </span>
                </div>

                <div className="modal-body">
                    <img 
                        src={data.src} 
                        alt={data.alt}
                        className="modal-image"
                    />
                    
                    {data.description && (
                        <p className="modal-description">
                            {data.description}
                        </p>
                    )}
                </div>

                <div className="modal-footer">
                    {data.hintPath && (
                        <button 
                            className="btn btn-primary"
                            onClick={() => {
                                // Открыть подсказку в новом окне или iframe
                                window.open(data.hintPath, '_blank');
                            }}
                        >
                            Открыть подсказку
                        </button>
                    )}
                    
                    <button 
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GrammarTablesModal;

