import React from 'react';

const GrammarTablesHeader = ({
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
    const levels = [
        { value: 'a1', label: 'A1', color: '#C82341' },
        { value: 'a2', label: 'A2', color: '#FC8423' },
        { value: 'b1', label: 'B1', color: '#4A9F14' },
        { value: 'b2', label: 'B2', color: '#018587' }
    ];

    const colsOptions = [1, 2, 3, 4];

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <button 
                    className="navbar-toggler" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#navbarNav" 
                    aria-controls="navbarNav" 
                    aria-expanded="false" 
                    aria-label="Переключить меню"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">

                    {/* Поиск глагола */}
                    <div className="me-3">
                        <div className="verb-search-container">
                            <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                placeholder="Поиск глагола..." 
                                style={{ width: '250px' }}
                                value={verbSearchTerm}
                                onChange={(e) => onVerbSearchChange(e.target.value)}
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
                                                    <small>{suggestion.verbArray[1]} / {suggestion.verbArray[2]}</small>
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
                    <ul className="navbar-nav">
                        {levels.map(level => (
                            <li key={level.value} className="nav-item">
                                <a 
                                    className={`nav-link level-filter ${selectedLevel === level.value ? 'active' : ''}`}
                                    href="#"
                                    data-level={level.value}
                                    style={{ color: level.color }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onLevelChange(level.value);
                                    }}
                                >
                                    {level.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    {/* Настройки колонок */}
                    <ul className="navbar-nav ms-5">
                        <li className="nav-item">
                            <div className="btn-group btn-group-sm" role="group" aria-label="Колонки">
                                {colsOptions.map(col => (
                                    <button
                                        key={col}
                                        type="button"
                                        className={`btn btn-outline-light set-cols ${cols === col ? 'active' : ''}`}
                                        data-cols={col}
                                        onClick={() => onColsChange(col)}
                                    >
                                        {col}
                                    </button>
                                ))}
                            </div>
                        </li>
                        
                        {/* Кнопка режима просмотра */}
                        <li className="nav-item ms-3">
                            <button 
                                type="button" 
                                className={`btn btn-outline-light btn-sm ${viewMode === 'horizontal' ? 'active' : ''}`}
                                id="toggleViewMode"
                                onClick={onViewModeToggle}
                            >
                                <span id="viewModeIcon">
                                    {viewMode === 'horizontal' ? '→' : '↓'}
                                </span> Режим
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default GrammarTablesHeader;