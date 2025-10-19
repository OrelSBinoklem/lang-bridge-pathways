import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const GrammarTablesHeaderPortal = ({
    cols,
    selectedLevel,
    verbSearchTerm,
    verbSuggestions,
    showVerbSuggestions,
    viewMode,
    onColsChange,
    onLevelChange,
    onVerbSearchChange,
    onVerbSuggestionClick,
    onCloseVerbSuggestions,
    onViewModeToggle
}) => {
    const searchRef = useRef(null);
    
    // Закрываем подсказки при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                if (showVerbSuggestions && onCloseVerbSuggestions) {
                    onCloseVerbSuggestions();
                }
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showVerbSuggestions, onCloseVerbSuggestions]);
    
    const levels = [
        { value: 'a1', label: 'A1', color: '#C82341' },
        { value: 'a2', label: 'A2', color: '#FC8423' },
        { value: 'b1', label: 'B1', color: '#4A9F14' },
        { value: 'b2', label: 'B2', color: '#018587' }
    ];

    const colsOptions = [1, 2, 3, 4];

    const headerRoot = document.getElementById('react-header-root');
    
    if (!headerRoot) return null;

    const content = (
        <div className="grammar-tables-header-controls">
            {/* Поиск глагола */}
            <div className="verb-search-wrapper" ref={searchRef}>
                <div className="verb-search-container">
                    <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        placeholder="Поиск глагола..." 
                        style={{ width: '200px' }}
                        value={verbSearchTerm}
                        onChange={(e) => onVerbSearchChange(e.target.value)}
                        onFocus={(e) => {
                            setTimeout(() => e.target.select(), 0);
                        }}
                    />
                    {showVerbSuggestions && verbSuggestions.length > 0 && (
                        <div className="verb-suggestions">
                            {verbSuggestions.map((suggestion, index) => (
                                <div 
                                    key={index}
                                    className="verb-suggestion-item"
                                    onClick={() => {
                                        if (suggestion.verbArray) {
                                            onVerbSuggestionClick(suggestion);
                                        }
                                    }}
                                >
                                    {suggestion.verbArray ? (
                                        <>
                                            <strong>{suggestion.verbArray[0]}</strong>
                                            <small> {suggestion.verbArray[1]} / {suggestion.verbArray[2]}</small>
                                        </>
                                    ) : (
                                        suggestion.text
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Фильтры по уровням */}
            <div className="level-filters-wrapper">
                {levels.map(level => (
                    <button
                        key={level.value}
                        className={`level-filter-btn ${selectedLevel === level.value ? 'active' : ''}`}
                        data-level={level.value}
                        style={{ 
                            color: selectedLevel === level.value ? '#fff' : level.color,
                            backgroundColor: selectedLevel === level.value ? level.color : 'transparent',
                            borderColor: level.color
                        }}
                        onClick={() => onLevelChange(level.value)}
                    >
                        {level.label}
                    </button>
                ))}
            </div>

            {/* Настройки колонок */}
            <div className="cols-controls-wrapper">
                <div className="btn-group btn-group-sm" role="group" aria-label="Колонки">
                    {colsOptions.map(col => (
                        <button
                            key={col}
                            type="button"
                            className={`btn btn-outline-light btn-sm ${cols === col ? 'active' : ''}`}
                            onClick={() => onColsChange(col)}
                        >
                            {col}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Кнопка режима просмотра */}
            <div className="view-mode-wrapper">
                <button 
                    type="button" 
                    className={`btn btn-outline-light btn-sm ${viewMode === 'horizontal' ? 'active' : ''}`}
                    onClick={onViewModeToggle}
                    title="Переключить режим"
                >
                    <span className="mode-icon" style={viewMode === 'horizontal' ? { transform: 'rotate(-90deg)' } : {}}>
                        ▼
                    </span> Режим
                </button>
            </div>
        </div>
    );

    return createPortal(content, headerRoot);
};

export default GrammarTablesHeaderPortal;

