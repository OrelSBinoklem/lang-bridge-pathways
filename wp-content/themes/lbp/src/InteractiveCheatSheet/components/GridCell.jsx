import React from 'react';

const MENU_ITEMS = [
    { url: '1.png', label: 'Склонение сущ.', rows: 0, cols: 0 },
    { url: '2.png', label: 'Предлоги', rows: 0, cols: 0 },
    { url: '9.png', label: 'Предлоги 2 тип', rows: 0, cols: 0 },
    { url: '3.png', label: 'Спряжение гл. наст.', rows: 0, cols: 0 },
    { url: '4.png', label: 'Спряжение гл. п. б.', rows: 0, cols: 0 },
    { url: '5.jpg', label: 'Вопросы', rows: 0, cols: 0 },
    { url: '6.jpg', label: 'Числа', rows: 0, cols: 0 },
    { url: '7.png', label: 'Глаголы', rows: 2, cols: 0 },
    { url: '8.png', label: 'Прилагательные', rows: 0, cols: 0 },
    { url: '13.png', label: 'Прилагательные (B1)', rows: 0, cols: 0 },
    { url: '14.png', label: 'Прилагательные (B2)', rows: 2, cols: 0 },
    { url: '10.png', label: 'Глаголы A2 часть 1', rows: 2, cols: 0 },
    { url: '11.png', label: 'Глаголы A2 часть 2', rows: 2, cols: 0 },
    { url: '12.png', label: 'Глаголы B1', rows: 2, cols: 0 }
];

const GridCell = ({ index, isLastRow, imageData, isMenuOpen, onToggleMenu, onImageUpdate, onHintClick }) => {
    const handleHintIconClick = (e, hintId) => {
        e.stopPropagation(); // Предотвращаем открытие меню
        if (onHintClick) {
            onHintClick(hintId);
        }
    };

    // Извлекаем hint-id из имени файла (например, "1.png" -> "1")
    const getHintId = (url) => {
        if (!url) return null;
        // Убираем расширение и путь, оставляем только число
        const match = url.match(/(\d+)\.(png|jpg|jpeg)/i);
        return match ? match[1] : null;
    };
    const handleMenuItemClick = (item, e) => {
        e.stopPropagation();
        onImageUpdate(index, {
            url: item.url,
            rows: item.rows,
            cols: item.cols
        });
        onToggleMenu();
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onImageUpdate(index, null);
        onToggleMenu();
    };

    const handleCellClick = (e) => {
        e.stopPropagation();
        onToggleMenu();
    };

    const getImagePath = (url) => {
        // Используем путь к изображениям в теме WordPress
        return `/wp-content/themes/lbp/assets/images/super-tables/${url}`;
    };

    return (
        <div
            className={`grid-cell ${isLastRow ? '__last-row' : ''}`}
            data-index={index}
            onClick={handleCellClick}
        >
            <div className="cell-title">+</div>
            
            {imageData && (
                <div
                    className={`img-cheat-sheet __rows-${imageData.rows || 0} __cols-${imageData.cols || 0}`}
                    style={{
                        backgroundImage: `url('${getImagePath(imageData.url)}')`
                    }}
                >
                    {/* Иконка подсказки - показываем только если есть hint-id */}
                    {getHintId(imageData.url) && (
                        <span 
                            className="hint-icon"
                            data-hint-id={getHintId(imageData.url)}
                            title={`Показать подсказку (ID: ${getHintId(imageData.url)})`}
                            onClick={(e) => handleHintIconClick(e, getHintId(imageData.url))}
                        >
                            ?
                        </span>
                    )}
                </div>
            )}

            <div className={`dropdown-menu ${isMenuOpen ? '' : 'hidden'}`}>
                {MENU_ITEMS.map((item, idx) => (
                    <div
                        key={idx}
                        className="menu-item"
                        onClick={(e) => handleMenuItemClick(item, e)}
                    >
                        {item.label}
                    </div>
                ))}
                <div
                    className="menu-item menu-item-delete"
                    onClick={handleDeleteClick}
                >
                    Удалить
                </div>
            </div>
        </div>
    );
};

export default GridCell;

