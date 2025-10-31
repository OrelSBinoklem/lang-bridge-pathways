console.log('InteractiveCheatSheet.jsx: Файл загружается!');

import React, { useState, useEffect } from 'react';
import CheatSheetHeaderPortal from './components/CheatSheetHeaderPortal';
import CheatSheetGrid from './components/CheatSheetGrid';
import VerbModal from '../shared/components/VerbModal';
import './styles/interactive-cheat-sheet.css';

// Утилиты для работы с cookies
const setCookie = (name, value, days = 7) => {
    const stringified = encodeURIComponent(JSON.stringify(value));
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${stringified}; expires=${expires}; path=/`;
};

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        try {
            return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
        } catch (e) {
            console.warn(`Не удалось распарсить cookie "${name}":`, e);
            return null;
        }
    }
    return null;
};

const InteractiveCheatSheet = () => {
    console.log('InteractiveCheatSheet: Компонент загружается!');
    
    const [mode, setMode] = useState(() => getCookie('mode') || 'table');
    const [cols, setCols] = useState(() => parseInt(getCookie('cols')) || 3);
    const [rows, setRows] = useState(() => parseInt(getCookie('rows')) || 4);
    const [imagesList, setImagesList] = useState(() => getCookie('super_tables') || {});
    const [currentPage, setCurrentPage] = useState(() => getCookie('page') || 1);
    const [verbModalData, setVerbModalData] = useState(null);
    const [hintModalData, setHintModalData] = useState(null);

    // Сохраняем настройки в cookies при изменении
    useEffect(() => {
        setCookie('mode', mode);
    }, [mode]);

    useEffect(() => {
        setCookie('cols', cols);
    }, [cols]);

    useEffect(() => {
        setCookie('rows', rows);
    }, [rows]);

    useEffect(() => {
        setCookie('super_tables', imagesList);
    }, [imagesList]);

    useEffect(() => {
        setCookie('page', currentPage);
    }, [currentPage]);

    // Режим всегда 'table', функция удалена

    // Обработчики изменения колонок и строк
    const adjustCols = (delta) => {
        setCols(prev => Math.max(1, prev + delta));
    };

    const adjustRows = (delta) => {
        setRows(prev => Math.max(1, prev + delta));
    };

    // Обработчик для добавления/удаления изображений
    const handleImageUpdate = (index, imageData) => {
        setImagesList(prev => {
            if (imageData === null) {
                const newList = { ...prev };
                delete newList[index];
                return newList;
            }
            return { ...prev, [index]: imageData };
        });
    };

    // Обработчик для переключения страниц (листание)
    const handlePageChange = (delta) => {
        setCurrentPage(prev => Math.max(1, prev + delta));
    };

    // Обработчик выбора глагола из поиска
    const handleVerbSelect = (verbData) => {
        console.log('InteractiveCheatSheet: handleVerbSelect вызван с данными:', verbData);
        setVerbModalData(verbData);
        console.log('InteractiveCheatSheet: verbModalData установлен');
    };

    const handleCloseVerbModal = () => {
        console.log('InteractiveCheatSheet: Закрываем модальное окно');
        setVerbModalData(null);
    };

    // Обработчик клика на иконку подсказки
    const handleHintClick = (hintId) => {
        setHintModalData({
            id: hintId,
            hintPath: `/wp-content/themes/lbp/assets/hints-super-tables/${hintId}.html`
        });
    };

    const handleCloseHint = () => {
        setHintModalData(null);
    };

    // Обработка колесика мыши и свайпов для переключения страниц
    useEffect(() => {

        let isScrolling = false;
        let touchStartY = 0;

        const handleWheel = (e) => {
            
            if (isScrolling) return;
            isScrolling = true;

            if (e.deltaY > 30) handlePageChange(1);
            else if (e.deltaY < -30) handlePageChange(-1);

            setTimeout(() => {
                isScrolling = false;
            }, 100);
        };

        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e) => {

            const deltaY = e.changedTouches[0].clientY - touchStartY;
            if (deltaY < -50) handlePageChange(1);
            else if (deltaY > 50) handlePageChange(-1);
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [mode]);

    console.log('InteractiveCheatSheet: Рендерим компонент');
    
    return (
        <>
            {/* Рендерим хедер через портал в основной header.php */}
            <CheatSheetHeaderPortal
                cols={cols}
                rows={rows}
                onColsChange={adjustCols}
                onRowsChange={adjustRows}
                onVerbSelect={handleVerbSelect}
            />
            
            <div className={`interactive-cheat-sheet __${mode}`}>
                <div className="wrapper">
                    <CheatSheetGrid
                        cols={cols}
                        rows={rows}
                        page={currentPage}
                        imagesList={imagesList}
                        onImageUpdate={handleImageUpdate}
                        onHintClick={handleHintClick}
                        mode={mode}
                    />
                </div>
            </div>

            {/* Модальное окно для отображения глагола */}
            {verbModalData && (
                <VerbModal
                    verbData={verbModalData}
                    onClose={handleCloseVerbModal}
                />
            )}

            {/* Модальное окно для подсказок */}
            {hintModalData && (
                <div className="hint-modal" onClick={handleCloseHint}>
                    <div className="hint-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="hint-modal-close" onClick={handleCloseHint}>
                            &times;
                        </button>
                        <iframe 
                            src={hintModalData.hintPath} 
                            title={`Подсказка ${hintModalData.id}`}
                            style={{ minHeight: '80vh' }}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default InteractiveCheatSheet;

