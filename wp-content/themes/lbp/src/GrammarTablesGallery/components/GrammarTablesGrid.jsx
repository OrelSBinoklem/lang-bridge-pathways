import React, { useState, useEffect } from 'react';
import tablesData, { allTables } from '../data/tablesData';

const GrammarTablesGrid = ({ cols, selectedLevel, viewMode, onImageClick, onHintClick }) => {
    const [filteredGroups, setFilteredGroups] = useState({ group1: [], group2: [], group3: [] });

    // Ранк уровней как в оригинале
    const LEVEL_RANK = { a1: 0, a2: 1, b1: 2, b2: 3 };

    // Функция фильтрации таблиц
    const filterTables = (tables) => {
        if (!selectedLevel || !LEVEL_RANK.hasOwnProperty(selectedLevel)) {
            return tables;
        }

        const currentRank = LEVEL_RANK[selectedLevel];
        
        return tables.filter(img => {
            const imgLevel = img.level;
            
            // Проверяем, есть ли диапазон в level (например, "a1-b1")
            if (imgLevel.indexOf('-') !== -1) {
                const parts = imgLevel.split('-');
                const startLevel = parts[0].toLowerCase();
                const endLevel = parts[1].toLowerCase();
                
                const startRank = LEVEL_RANK.hasOwnProperty(startLevel) ? LEVEL_RANK[startLevel] : -1;
                const endRank = LEVEL_RANK.hasOwnProperty(endLevel) ? LEVEL_RANK[endLevel] : -1;
                
                // Показываем, если выбранный уровень попадает в интервал
                if (startRank !== -1 && endRank !== -1 && currentRank >= startRank && currentRank <= endRank) {
                    return true;
                }
            } else {
                // Старая логика для одиночного уровня (показываем все <= выбранного)
                const imgRank = LEVEL_RANK.hasOwnProperty(imgLevel.toLowerCase()) ? LEVEL_RANK[imgLevel.toLowerCase()] : -1;
                if (imgRank !== -1 && imgRank <= currentRank) {
                    return true;
                }
            }
            
            return false;
        });
    };

    // Фильтрация изображений по принципу диапазонов уровней для всех групп
    useEffect(() => {
        setFilteredGroups({
            group1: filterTables(tablesData.group1),
            group2: filterTables(tablesData.group2),
            group3: filterTables(tablesData.group3)
        });
    }, [selectedLevel]);

    // Применяем CSS переменную для колонок
    useEffect(() => {
        const galleries = document.querySelectorAll('.gallery');
        galleries.forEach(gallery => {
            gallery.style.setProperty('--cols', cols.toString());
        });
        
        // Пересчитываем ширину в горизонтальном режиме
        if (viewMode === 'horizontal') {
            setTimeout(calculateGalleryWrapperWidths, 100);
        }
    }, [cols, viewMode, filteredGroups]);

    // Расчёт ширины обёрток галерей для горизонтального режима
    const calculateGalleryWrapperWidths = () => {
        if (viewMode !== 'horizontal') return;
        
        const wrappers = document.querySelectorAll('.galleries.horizontal-mode .gallery-wrapper');
        wrappers.forEach(wrapper => {
            const gallery = wrapper.querySelector('.gallery');
            const visibleCards = Array.from(gallery.querySelectorAll('.table-img')).filter(card => {
                return !card.classList.contains('d-none');
            });
            
            const visibleWidth = document.body.clientWidth;
            const galleryWidth = gallery.clientWidth;
            
            const totalPages = Math.ceil((galleryWidth + 12) / (visibleWidth - 13));
            wrapper.style.width = ((visibleWidth - 13 - 13) + (totalPages - 1) * (visibleWidth - 13)) + 'px';
        });
        
        updatePageIndicator();
    };

    // Обновление индикатора страниц
    const updatePageIndicator = () => {
        if (viewMode !== 'horizontal') return;
        
        const container = document.querySelector('.galleries.horizontal-mode');
        if (!container) return;
        
        const visibleWidth = document.body.clientWidth;
        const totalWidth = container.scrollWidth;
        const currentScroll = container.scrollLeft;
        
        const totalPages = Math.ceil((totalWidth + 12 - 26) / (visibleWidth - 13));
        const currentPage = Math.floor((currentScroll + 10) / (visibleWidth - 13)) + 1;
        
        const currentPageEl = document.getElementById('currentPage');
        const totalPagesEl = document.getElementById('totalPages');
        
        if (currentPageEl) currentPageEl.textContent = currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
    };

    // Обработка скролла колесом для горизонтального режима
    useEffect(() => {
        if (viewMode !== 'horizontal') return;
        
        let isScrolling = false;
        let scrollTimeout;
        
        const handleWheelScroll = (e) => {
            e.preventDefault();
            
            if (isScrolling) return;
            isScrolling = true;
            
            const container = e.currentTarget;
            const currentScroll = container.scrollLeft;
            const visibleWidth = document.body.clientWidth - 13;
            
            const delta = e.deltaY || e.deltaX;
            
            if (delta > 0) {
                // Скролл вправо
                container.scrollTo({
                    left: currentScroll + visibleWidth
                });
            } else {
                // Скролл влево
                container.scrollTo({
                    left: currentScroll - visibleWidth
                });
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                updatePageIndicator();
            }, 1);//не трогайте этот таймаут бот
        };
        
        const container = document.querySelector('.galleries');
        if (container) {
            container.addEventListener('wheel', handleWheelScroll, { passive: false });
            container.addEventListener('scroll', updatePageIndicator);
            
            return () => {
                container.removeEventListener('wheel', handleWheelScroll);
                container.removeEventListener('scroll', updatePageIndicator);
            };
        }
    }, [viewMode]);

    const handleImageClick = (image) => {
        onImageClick({
            ...image,
            hintPath: `/wp-content/themes/lbp/assets/hints/${image.id}.html`
        });
    };

    const handleHintIconClick = (e, imageId) => {
        e.stopPropagation(); // Предотвращаем открытие основного модального окна
        onHintClick(imageId);
    };

    const getLevelClass = (level) => {
        // Если уровень с диапазоном (a1-a2), берем первую часть
        const baseLevel = level.indexOf('-') !== -1 ? level.split('-')[0] : level;
        switch (baseLevel) {
            case 'a1': return 'a1';
            case 'a2': return 'a2';
            case 'b1': return 'b1';
            case 'b2': return 'b2';
            default: return 'a1';
        }
    };

    const getLevelLabel = (level, description) => {
        if (description) return description;
        // Если уровень с диапазоном (a1-a2), берем первую часть
        const baseLevel = level.indexOf('-') !== -1 ? level.split('-')[0] : level;
        return baseLevel.toUpperCase();
    };

    // Рендер группы таблиц
    const renderGalleryGroup = (tables, groupNumber) => {
        if (tables.length === 0) return null;
        
        return (
            <div className="gallery-wrapper" key={`group-${groupNumber}`}>
                <div className="gallery" data-cols={cols}>
                    {tables.map(image => (
                        <div 
                            key={image.id} 
                            className="table-img" 
                            data-id={image.id}
                            data-level={image.level}
                            onClick={() => handleImageClick(image)}
                        >
                            <img 
                                src={image.src} 
                                alt={image.alt}
                                loading="lazy" 
                                decoding="async" 
                            />
                            <span className={`level-badge ${getLevelClass(image.level)}`}>
                                {getLevelLabel(image.level, image.description)}
                            </span>
                            {/* Иконка подсказки */}
                            <span 
                                className="hint-icon"
                                data-hint-id={image.id}
                                title={`Показать подсказку (ID: ${image.id})`}
                                onClick={(e) => handleHintIconClick(e, image.id)}
                            >
                                ?
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <footer className="bg-dark text-white py-3 text-center">
            <div className={`container-fluid galleries ${viewMode === 'horizontal' ? 'horizontal-mode' : ''}`}>
                {renderGalleryGroup(filteredGroups.group1, 1)}
                {renderGalleryGroup(filteredGroups.group2, 2)}
                {renderGalleryGroup(filteredGroups.group3, 3)}
            </div>
        </footer>
    );
};

export default GrammarTablesGrid;