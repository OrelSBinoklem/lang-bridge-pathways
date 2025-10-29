import React, { useState, useEffect, useCallback } from 'react';
import tablesData, { allTables } from '../data/tablesData';

const GrammarTablesGrid = ({ cols, selectedLevel, viewMode, onImageClick, onHintClick }) => {
    const [filteredGroups, setFilteredGroups] = useState({ group1: [], group2: [], group3: [] });

    // Ранк уровней как в оригинале
    const LEVEL_RANK = { a1: 0, a2: 1, b1: 2, b2: 3 };

    // Функция фильтрации таблиц по уровню
    const filterTables = (tables) => {
        if (!selectedLevel || !LEVEL_RANK.hasOwnProperty(selectedLevel)) {
            return tables;
        }

        const currentRank = LEVEL_RANK[selectedLevel];
        
        return tables.filter(img => {
            const imgLevel = img.level;
            const isRangeLevel = imgLevel.indexOf('-') !== -1;
            
            if (isRangeLevel) {
                // Уровень задан диапазоном (например, "a1-b1")
                const [startLevel, endLevel] = imgLevel.split('-').map(level => level.toLowerCase());
                const startRank = LEVEL_RANK[startLevel];
                const endRank = LEVEL_RANK[endLevel];
                
                if (startRank !== undefined && endRank !== undefined) {
                    return currentRank >= startRank && currentRank <= endRank;
                }
            } else {
                // Одиночный уровень (показываем все <= выбранного)
                const imgRank = LEVEL_RANK[imgLevel.toLowerCase()];
                if (imgRank !== undefined) {
                    return imgRank <= currentRank;
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
        } else {
            // Сбрасываем ширину обёрток при переходе в вертикальный режим
            const wrappers = document.querySelectorAll('.gallery-wrapper');
            wrappers.forEach(wrapper => {
                wrapper.style.width = '';
            });
        }
    }, [cols, viewMode, filteredGroups]);

    // Обновление индикатора страниц
    const updatePageIndicator = useCallback(() => {
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
    }, [viewMode]);

    // Расчёт ширины обёрток галерей для горизонтального режима
    const calculateGalleryWrapperWidths = useCallback(() => {
        if (viewMode !== 'horizontal') return;
        
        const wrappers = document.querySelectorAll('.galleries.horizontal-mode .gallery-wrapper');
        
        // Сбрасываем ширину всех обёрток для корректного измерения
        wrappers.forEach(wrapper => {
            wrapper.style.width = '';
        });
        
        // Даём браузеру время пересчитать layout после сброса ширины
        requestAnimationFrame(() => {
            wrappers.forEach(wrapper => {
                const gallery = wrapper.querySelector('.gallery');
                const visibleWidth = document.body.clientWidth;
                const galleryWidth = gallery.clientWidth;

                console.log('📏 visibleWidth:', visibleWidth, 'galleryWidth:', galleryWidth);

                // Рассчитываем количество страниц и устанавливаем ширину
                const totalPages = Math.ceil((galleryWidth + 12) / (visibleWidth - 13));
                const calculatedWidth = (visibleWidth - 26) + (totalPages - 1) * (visibleWidth - 13);
                wrapper.style.width = calculatedWidth + 'px';
            });
            
            updatePageIndicator();
        });
    }, [viewMode, updatePageIndicator]);

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
            
            // Скроллим на ширину экрана
            const newScrollPosition = delta > 0 
                ? currentScroll + visibleWidth  // Вправо
                : currentScroll - visibleWidth; // Влево
            
            container.scrollTo({ left: newScrollPosition });
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                updatePageIndicator();
            }, 1); // не трогайте этот таймаут бот
        };
        
        const container = document.querySelector('.galleries');
        if (!container) return;
        
        container.addEventListener('wheel', handleWheelScroll, { passive: false });
        container.addEventListener('scroll', updatePageIndicator);
        
        return () => {
            container.removeEventListener('wheel', handleWheelScroll);
            container.removeEventListener('scroll', updatePageIndicator);
        };
    }, [viewMode, updatePageIndicator]);

    // Обработка resize окна для горизонтального режима (debounce 100ms)
    useEffect(() => {
        if (viewMode !== 'horizontal') return;
        
        let resizeTimeout = null;
        
        const handleResize = () => {
            console.log('🔄 Resize event triggered');
            
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            // Пересчитываем через 100ms после последнего resize
            resizeTimeout = setTimeout(() => {
                console.log('✅ Recalculating gallery widths...');
                calculateGalleryWrapperWidths();
            }, 100);
        };
        
        window.addEventListener('resize', handleResize);
        console.log('📐 Resize listener added');
        
        return () => {
            console.log('🗑️ Resize listener removed');
            window.removeEventListener('resize', handleResize);
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
        };
    }, [viewMode, calculateGalleryWrapperWidths]);

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

    // Получить CSS-класс для уровня (берём первую часть если диапазон)
    const getLevelClass = (level) => {
        const baseLevel = level.indexOf('-') !== -1 ? level.split('-')[0] : level;
        const validLevels = ['a1', 'a2', 'b1', 'b2'];
        return validLevels.includes(baseLevel) ? baseLevel : 'a1';
    };

    // Получить отображаемую метку уровня
    const getLevelLabel = (level, description) => {
        if (description) {
            return description;
        }
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
                                width={image.width}
                                height={image.height}
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