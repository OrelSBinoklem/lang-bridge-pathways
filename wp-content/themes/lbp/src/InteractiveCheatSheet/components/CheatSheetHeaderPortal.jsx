import React from 'react';
import { createPortal } from 'react-dom';
import VerbSearch from '../../shared/components/VerbSearch';

const CheatSheetHeaderPortal = ({
    cols,
    rows,
    onColsChange,
    onRowsChange,
    onVerbSelect
}) => {
    console.log('CheatSheetHeaderPortal: Рендерим портал с onVerbSelect:', !!onVerbSelect);
    
    const headerRoot = document.getElementById('react-header-root');
    
    if (!headerRoot) {
        console.warn('CheatSheetHeaderPortal: react-header-root не найден!');
        return null;
    }
    
    console.log('CheatSheetHeaderPortal: headerRoot найден, рендерим портал');

    const content = (
        <div className="cheat-sheet-header-controls">
            {/* Поиск глаголов */}
            {console.log('CheatSheetHeaderPortal: Рендерим VerbSearch с onVerbSelect:', !!onVerbSelect)}
            <VerbSearch onVerbSelect={onVerbSelect} />
            
            {/* Контролы колонок и строк */}
            <div className="number-control">
                <label>Колонки:</label>
                <button className="btn-control minus" onClick={() => onColsChange(-1)}>
                    −
                </button>
                <input type="number" readOnly value={cols} />
                <button className="btn-control plus" onClick={() => onColsChange(1)}>
                    +
                </button>
            </div>
            <div className="number-control">
                <label>Строки:</label>
                <button className="btn-control minus" onClick={() => onRowsChange(-1)}>
                    −
                </button>
                <input type="number" readOnly value={rows} />
                <button className="btn-control plus" onClick={() => onRowsChange(1)}>
                    +
                </button>
            </div>
        </div>
    );

    return createPortal(content, headerRoot);
};

export default CheatSheetHeaderPortal;

