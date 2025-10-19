import React, { useState, useEffect, useRef } from 'react';
import GridCell from './GridCell';

const CheatSheetGrid = ({ cols, rows, page, imagesList, onImageUpdate, mode }) => {
    const gridRef = useRef(null);
    const [openMenuIndex, setOpenMenuIndex] = useState(null);

    const gridStyle = {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '1fr'
    };

    const offset = (page - 1) * (cols * rows);
    const cells = [];

    for (let i = 1; i <= cols * rows; i++) {
        const index = offset + i;
        const isLastRow = i > cols * (rows - 1);
        cells.push(
            <GridCell
                key={index}
                index={index}
                isLastRow={isLastRow}
                imageData={imagesList[index]}
                isMenuOpen={openMenuIndex === index}
                onToggleMenu={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                onImageUpdate={onImageUpdate}
            />
        );
    }

    // Закрытие меню при клике вне ячейки
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (gridRef.current && !e.target.closest('.grid-cell')) {
                setOpenMenuIndex(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div
            ref={gridRef}
            className="grid-table"
            id="gridContainer"
            style={gridStyle}
        >
            {cells}
        </div>
    );
};

export default CheatSheetGrid;

