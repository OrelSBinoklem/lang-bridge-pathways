import React from 'react';
import { createPortal } from 'react-dom';

const GrammarTablesMobileMenu = ({
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
    const menuContainer = document.getElementById('primary-menu');
    
    if (!menuContainer) {
        return null;
    }

    const levels = [
        { value: 'a1', label: 'A1', color: '#C82341' },
        { value: 'a2', label: 'A2', color: '#FC8423' },
        { value: 'b1', label: 'B1', color: '#4A9F14' },
        { value: 'b2', label: 'B2', color: '#018587' },
        { value: 'super', label: 'SUPER', color: '#0050b3' }
    ];

    const colsOptions = [1, 2, 3, 4];

    const content = (
        <li id="grammar-tables-mobile-controls" className="menu-item-mobile-controls">
            <div className="mobile-controls-wrapper">
                
                {/* Кнопка выбора языка */}
                <button 
                    className="mobile-lang-btn"
                    onClick={() => {
                        const langModal = document.getElementById('language-modal');
                        if (langModal) {
                            langModal.classList.add('active');
                        }
                    }}
                >
                    🌐 <span className="current-lang-code-mobile">
                        {document.querySelector('.current-lang-code')?.textContent || 'LV'}
                    </span>
                </button>

                {/* Фильтры по уровням */}
                <div className="mobile-level-filters">
                    <label>Уровень:</label>
                    <div className="level-filters-buttons">
                        {levels.map(level => {
                            if (level.value !== 'super') {
                                return (
                                    <button
                                        key={level.value}
                                        className={`level-filter-btn ${selectedLevel === level.value ? 'active' : ''}`}
                                        style={{ 
                                            color: selectedLevel === level.value ? '#fff' : level.color,
                                            backgroundColor: selectedLevel === level.value ? level.color : 'transparent',
                                            borderColor: level.color
                                        }}
                                        onClick={() => onLevelChange(level.value)}
                                    >
                                        {level.label}
                                    </button>
                                );
                            }

                            return (
                                <React.Fragment key="super-sets-mobile">
                                    <button
                                        className={`level-filter-btn ${selectedLevel === 'super' && superProfileId === '1' ? 'active' : ''}`}
                                        style={{ 
                                            color: selectedLevel === 'super' && superProfileId === '1' ? '#fff' : level.color,
                                            backgroundColor: selectedLevel === 'super' && superProfileId === '1' ? level.color : 'transparent',
                                            borderColor: level.color
                                        }}
                                        onClick={() => {
                                            onLevelChange('super');
                                            if (onSuperProfileChange) onSuperProfileChange('1');
                                        }}
                                    >
                                        Набор 1
                                    </button>
                                    <button
                                        className={`level-filter-btn ${selectedLevel === 'super' && superProfileId === '2' ? 'active' : ''}`}
                                        style={{ 
                                            color: selectedLevel === 'super' && superProfileId === '2' ? '#fff' : level.color,
                                            backgroundColor: selectedLevel === 'super' && superProfileId === '2' ? level.color : 'transparent',
                                            borderColor: level.color
                                        }}
                                        onClick={() => {
                                            onLevelChange('super');
                                            if (onSuperProfileChange) onSuperProfileChange('2');
                                        }}
                                    >
                                        Набор 2
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Настройки колонок */}
                <div className="mobile-cols-controls">
                    <label>Колонки:</label>
                    <div className="btn-group btn-group-sm">
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
                <div className="mobile-view-mode">
                    <label>Режим:</label>
                    <button 
                        type="button" 
                        className={`btn btn-outline-light btn-sm ${viewMode === 'horizontal' ? 'active' : ''}`}
                        onClick={onViewModeToggle}
                    >
                        <span className="mode-icon" style={viewMode === 'horizontal' ? { transform: 'rotate(-90deg)' } : {}}>
                            ▼
                        </span> {viewMode === 'horizontal' ? 'Горизонтальный' : 'Вертикальный'}
                    </button>
                </div>

                <div className="mobile-super-controls">
                    <label>Супер таблицы:</label>
                    <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => {
                            if (onManageSuperTables) {
                                onManageSuperTables();
                            }
                        }}
                    >
                        📚 Super ({superSelectionCount})
                    </button>
                    <button
                        type="button"
                        className={`btn btn-outline-light btn-sm mt-2 ${showHiddenSuper ? 'active' : ''}`}
                        onClick={() => {
                            if (onToggleShowHidden) {
                                onToggleShowHidden();
                            }
                        }}
                    >
                        {showHiddenSuper ? '👁 Видны скрытые' : '🙈 Скрыть скрытые'}
                    </button>
                </div>
            </div>
        </li>
    );

    return createPortal(content, menuContainer);
};

export default GrammarTablesMobileMenu;

