import React, { useRef, useEffect, useState } from 'react';
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
    const inputRef = useRef(null);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    
    // Закрываем подсказки при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                if (showVerbSuggestions && onCloseVerbSuggestions) {
                    onCloseVerbSuggestions();
                }
                // Закрываем мобильный поиск при клике вне на мобильных
                if (isMobileSearchOpen && window.innerWidth <= 768) {
                    setIsMobileSearchOpen(false);
                }
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showVerbSuggestions, onCloseVerbSuggestions, isMobileSearchOpen]);

    const handleMobileSearchToggle = () => {
        setIsMobileSearchOpen(!isMobileSearchOpen);
        if (!isMobileSearchOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleMobileSearchClose = () => {
        setIsMobileSearchOpen(false);
        if (onCloseVerbSuggestions) {
            onCloseVerbSuggestions();
        }
    };

    const handleVerbSuggestionClick = (suggestion) => {
        setIsMobileSearchOpen(false);
        if (onVerbSuggestionClick) {
            onVerbSuggestionClick(suggestion);
        }
    };
    
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
            <div className={`verb-search-wrapper ${isMobileSearchOpen ? 'mobile-open' : ''}`} ref={searchRef}>
                <div className="verb-search-container">
                    {/* Иконка поиска для мобильных */}
                    <button
                        className="verb-search-icon-btn"
                        onClick={handleMobileSearchToggle}
                        aria-label="Открыть поиск глагола"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" fill="currentColor"/>
                        </svg>
                    </button>
                    
                    {/* Поле поиска */}
                    <div className={`verb-search-input-wrapper ${isMobileSearchOpen ? 'mobile-open' : ''}`}>
                        <input 
                            ref={inputRef}
                            type="text" 
                            className="form-control form-control-sm verb-search-input" 
                            placeholder="Поиск глагола..." 
                            style={{ width: '200px' }}
                            value={verbSearchTerm}
                            onChange={(e) => onVerbSearchChange(e.target.value)}
                            onFocus={(e) => {
                                setTimeout(() => e.target.select(), 0);
                            }}
                            autoComplete="off"
                        />
                        {isMobileSearchOpen && (
                            <button
                                className="verb-search-close-btn"
                                onClick={handleMobileSearchClose}
                                aria-label="Закрыть поиск"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    
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
                                        onClick={() => handleVerbSuggestionClick(suggestion)}
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

