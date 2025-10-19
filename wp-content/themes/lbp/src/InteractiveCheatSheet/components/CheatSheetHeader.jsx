import React from 'react';

const CheatSheetHeader = ({
    cols,
    rows,
    onColsChange,
    onRowsChange
}) => {

    return (
        <div className="header">
            <div className="header-left">
            </div>

            <div className="header-right tableControls">
                <div className="number-control">
                    <label>колонки:</label>
                    <button className="colsMinus small" onClick={() => onColsChange(-1)}>
                        −
                    </button>
                    <input type="number" className="cols" readOnly value={cols} />
                    <button className="colsPlus small" onClick={() => onColsChange(1)}>
                        +
                    </button>
                </div>
                <div className="number-control">
                    <label>строки:</label>
                    <button className="rowsMinus small" onClick={() => onRowsChange(-1)}>
                        −
                    </button>
                    <input type="number" className="rows" readOnly value={rows} />
                    <button className="rowsPlus small" onClick={() => onRowsChange(1)}>
                        +
                    </button>
                </div>
            </div>

        </div>
    );
};

export default CheatSheetHeader;

