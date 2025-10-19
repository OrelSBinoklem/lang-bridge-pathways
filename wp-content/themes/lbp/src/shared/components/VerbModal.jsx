import React from 'react';

const VerbModal = ({ verbData, onClose }) => {
    console.log('VerbModal: Рендер с данными:', verbData);
    
    if (!verbData) {
        console.log('VerbModal: verbData пустые, не рендерим');
        return null;
    }

    return (
        <div className="verb-image-overlay" onClick={onClose}>
            <div className="verb-image-content" onClick={(e) => e.stopPropagation()}>
                <button className="verb-close-btn" onClick={onClose}>
                    &times;
                </button>
                <div className="verb-info">
                    <strong>{verbData.latvian || verbData.verb}</strong> — {verbData.russian || verbData.translation}
                    {(verbData.ukrainian || verbData.transcription) && ` / ${verbData.ukrainian || verbData.transcription}`}
                </div>
                <img
                    src={verbData.imagePath || verbData.imageSrc}
                    alt={`${verbData.latvian || verbData.verb} - ${verbData.russian || verbData.translation}`}
                    onError={(e) => {
                        e.target.onerror = null;
                        const imagePath = verbData.imagePath || verbData.imageSrc;
                        e.target.src = imagePath.replace('.webp', '.png');
                    }}
                />
            </div>
        </div>
    );
};

export default VerbModal;

