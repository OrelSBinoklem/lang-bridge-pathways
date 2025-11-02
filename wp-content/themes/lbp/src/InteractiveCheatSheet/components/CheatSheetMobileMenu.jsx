import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import VerbSearch from '../../shared/components/VerbSearch';

const CheatSheetMobileMenu = ({
    cols,
    rows,
    onColsChange,
    onRowsChange,
    onVerbSelect
}) => {
    const menuContainer = document.getElementById('primary-menu');
    
    if (!menuContainer) {
        return null;
    }

    // Проверяем, нужно ли показывать (только на мобильных)
    useEffect(() => {
        const checkWidth = () => {
            const isMobile = window.innerWidth < 1200;
            const mobileControls = document.getElementById('cheat-sheet-mobile-controls');
            if (mobileControls) {
                mobileControls.style.display = isMobile ? 'block' : 'none';
            }
        };
        
        checkWidth();
        window.addEventListener('resize', checkWidth);
        
        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    const content = (
        <li id="cheat-sheet-mobile-controls" className="menu-item-mobile-controls" style={{ display: 'none' }}>
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

                {/* Поиск глаголов */}
                <div className="mobile-verb-search">
                    <VerbSearch onVerbSelect={onVerbSelect} />
                </div>
                
                {/* Контролы колонок */}
                <div className="mobile-number-control">
                    <label>Колонки:</label>
                    <button className="btn-control minus" onClick={() => onColsChange(-1)}>−</button>
                    <input type="number" readOnly value={cols} />
                    <button className="btn-control plus" onClick={() => onColsChange(1)}>+</button>
                </div>
                
                {/* Контролы строк */}
                <div className="mobile-number-control">
                    <label>Строки:</label>
                    <button className="btn-control minus" onClick={() => onRowsChange(-1)}>−</button>
                    <input type="number" readOnly value={rows} />
                    <button className="btn-control plus" onClick={() => onRowsChange(1)}>+</button>
                </div>
            </div>
        </li>
    );

    return createPortal(content, menuContainer);
};

export default CheatSheetMobileMenu;

