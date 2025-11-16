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
    onViewModeToggle,
    onManageSuperTables,
    superSelectionCount = 0,
    showHiddenSuper = false,
    onToggleShowHidden,
    superProfileId = '1',
    onSuperProfileChange
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
        { value: 'b2', label: 'B2', color: '#018587' },
        { value: 'super', label: 'SUPER', color: '#0050b3' }
    ];

    const colsOptions = [1, 2, 3, 4];

    const headerRoot = document.getElementById('react-header-root');
    
    if (!headerRoot) return null;

    const content = (
        <div className="grammar-tables-header-controls">
            {/* Только поиск глагола в хедере */}
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
                            {verbSuggestions.map((suggestion, index) => {
                                if (suggestion.text) {
                                    return (
                                        <div key={index} className="verb-suggestion-item disabled">
                                            {suggestion.text}
                                        </div>
                                    );
                                }

                                return (
                                    <div 
                                        key={index}
                                        className="verb-suggestion-item"
                                        onClick={() => onVerbSuggestionClick(suggestion)}
                                    >
                                        <strong>{suggestion.lemma}</strong>
                                        <small>
                                            {suggestion.translationRu || '—'}
                                            {suggestion.translationUk ? ` / ${suggestion.translationUk}` : ''}
                                        </small>
                                        {suggestion.className && (
                                            <span className="verb-suggestion-class">
                                                Класс: {suggestion.className}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, headerRoot);
};

export default GrammarTablesHeaderPortal;

