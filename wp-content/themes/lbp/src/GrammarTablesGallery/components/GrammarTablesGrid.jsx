import React, { useState, useEffect, useCallback, useMemo } from 'react';
import tablesData from '../data/tablesData';

const GrammarTablesGrid = ({
    cols,
    selectedLevel,
    viewMode,
    onImageClick,
    onHintClick,
    superTables = [],
    superOrder = [],
    onToggleSuperTable,
    onMoveSuperTable,
    activeIds = [],
    showHidden = false
}) => {
    const [filteredGroups, setFilteredGroups] = useState({ group1: [], group2: [], group3: [], super: [] });

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
        const activeSet = new Set(activeIds);

        const orderedSuper = superOrder
            .map(id => {
                const table = superTables.find(table => table.id === id);
                if (!table) {
                    return null;
                }
                return {
                    ...table,
                    isActive: activeSet.has(id)
                };
            })
            .filter(Boolean);

        const visibleSuper = showHidden
            ? orderedSuper
            : orderedSuper.filter(entry => entry.isActive);

        if (selectedLevel === 'super') {
            setFilteredGroups({
                group1: [],
                group2: [],
                group3: [],
                super: visibleSuper
            });
            return;
        }

        setFilteredGroups({
            group1: filterTables(tablesData.group1),
            group2: filterTables(tablesData.group2),
            group3: filterTables(tablesData.group3),
            super: []
        });
    }, [selectedLevel, superOrder, superTables, activeIds, showHidden]);

    // Установка CSS переменной для реальной ширины viewport (без скроллбара)
    useEffect(() => {
        const updateViewportWidth = () => {
            // Реальная ширина viewport без скроллбара
            const realWidth = document.documentElement.clientWidth || window.innerWidth;
            document.documentElement.style.setProperty('--real-vw', `${realWidth}px`);
        };
        
        updateViewportWidth();
        window.addEventListener('resize', updateViewportWidth);
        
        return () => {
            window.removeEventListener('resize', updateViewportWidth);
        };
    }, []);

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
    }, [viewMode, selectedLevel]);

    // Расчёт ширины обёрток галерей для горизонтального режима
    const calculateGalleryWrapperWidths = useCallback(() => {
        if (viewMode !== 'horizontal') return;
        
        const wrappers = document.querySelectorAll('.galleries.horizontal-mode .gallery-wrapper');
        
        // Сначала сбрасываем ширину всех обёрток для корректного измерения
        wrappers.forEach(wrapper => {
            wrapper.style.width = '';
        });
        
        // Даём браузеру время пересчитать layout
        requestAnimationFrame(() => {
            // Теперь измеряем и устанавливаем новую ширину
            wrappers.forEach(wrapper => {
                const gallery = wrapper.querySelector('.gallery');
                const visibleCards = Array.from(gallery.querySelectorAll('.table-img')).filter(card => {
                    return !card.classList.contains('d-none');
                });
                
                const visibleWidth = document.body.clientWidth;
                const galleryWidth = gallery.clientWidth;

                console.log('📏 visibleWidth:', visibleWidth, 'galleryWidth:', galleryWidth);

                const totalPages = Math.ceil((galleryWidth + 12) / (visibleWidth - 13));
                wrapper.style.width = ((visibleWidth - 13 - 13) + (totalPages - 1) * (visibleWidth - 13)) + 'px';
            });
            
            updatePageIndicator();
        });
    }, [viewMode, selectedLevel, updatePageIndicator]);

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
    }, [viewMode, selectedLevel, updatePageIndicator]);

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
    }, [viewMode, selectedLevel, calculateGalleryWrapperWidths]);

    // Получить CSS-класс для уровня (берём первую часть если диапазон)
    const getLevelClass = (level) => {
        const baseLevel = level.indexOf('-') !== -1 ? level.split('-')[0] : level;
        const validLevels = ['a1', 'a2', 'b1', 'b2', 'super'];
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

    const activeOrder = useMemo(() => {
        if (!activeIds || activeIds.length === 0) {
            return [];
        }
        const activeSet = new Set(activeIds);
        return superOrder.filter(id => activeSet.has(id));
    }, [superOrder, activeIds]);

    const activeIndexMap = useMemo(() => {
        const map = {};
        activeOrder.forEach((id, index) => {
            map[id] = index;
        });
        return map;
    }, [activeOrder]);

    const activeCount = activeOrder.length;

    const renderHintIcon = (image) => {
        const hintId = image.level === 'super'
            ? (image.hintId || String(image.id).replace('super-', ''))
            : image.id;

        const hintPayload = image.level === 'super'
            ? `super-${hintId}`
            : image.id;

        return (
            <span 
                className="hint-icon"
                data-hint-id={hintId}
                title={`Показать подсказку (ID: ${hintId})`}
                onClick={(e) => {
                    e.stopPropagation();
                    onHintClick(hintPayload);
                }}
            >
                ?
            </span>
        );
    };

    const renderSuperControls = (image) => {
        if (image.level !== 'super') return null;

        const isActive = Boolean(image.isActive);
        const activeIndex = isActive ? activeIndexMap[image.id] ?? -1 : -1;
        const isFirst = activeIndex <= 0;
        const isLast = activeIndex === activeCount - 1;

        return (
            <div className="super-controls">
                {isActive && (
                    <>
                        <button
                            type="button"
                            className="super-control-btn move"
                            title="Переместить выше"
                            disabled={isFirst}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveSuperTable?.(image.id, 'up');
                            }}
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className="super-control-btn move"
                            title="Переместить ниже"
                            disabled={isLast}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveSuperTable?.(image.id, 'down');
                            }}
                        >
                            ↓
                        </button>
                    </>
                )}
                <button
                    type="button"
                    className="super-control-btn toggle"
                    title={isActive ? 'Скрыть из активных' : 'Добавить в активные'}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSuperTable?.(image.id);
                    }}
                >
                    {isActive ? '✕' : '＋'}
                </button>
            </div>
        );
    };

    const renderGalleryGroup = (tables, groupKey) => {
        if (tables.length === 0) return null;
        
        return (
            <div className="gallery-wrapper" key={`group-${groupKey}`}>
                <div className="gallery" data-cols={cols}>
                    {tables.map(image => (
                        <div 
                            key={image.id} 
                            className={`table-img ${image.level === 'super' ? (image.isActive ? '__super-active' : '__super-inactive') : ''}`}
                            data-id={image.id}
                            data-level={image.level}
                            onClick={() => {
                                const hintPath = image.level === 'super'
                                    ? `/wp-content/themes/lbp/assets/hints-super-tables/${image.hintId || String(image.id).replace('super-', '')}.html`
                                    : `/wp-content/themes/lbp/assets/hints/${image.id}.html`;
                                onImageClick({
                                    ...image,
                                    hintPath
                                });
                            }}
                        >
                            <img 
                                src={image.src} 
                                alt={image.alt || image.title || `Таблица ${image.id}`}
                                width={image.width}
                                height={image.height}
                                loading="lazy" 
                                decoding="async" 
                            />
                            {image.level === 'super' ? (
                                <span className="level-badge super">
                                    {image.title || 'SUPER'}
                                </span>
                            ) : (
                                <span className={`level-badge ${getLevelClass(image.level)}`}>
                                    {getLevelLabel(image.level, image.description)}
                                </span>
                            )}
                            {renderHintIcon(image)}
                            {renderSuperControls(image)}
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
                {selectedLevel === 'super' ? renderGalleryGroup(filteredGroups.super, 'super') : null}
            </div>
        </footer>
    );
};

export default GrammarTablesGrid;