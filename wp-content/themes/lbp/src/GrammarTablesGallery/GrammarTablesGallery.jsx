import React, { useState, useEffect } from 'react';
import GrammarTablesHeaderPortal from './components/GrammarTablesHeaderPortal';
import GrammarTablesGrid from './components/GrammarTablesGrid';
import GrammarTablesModal from './components/GrammarTablesModal';
import VerbModal from '../shared/components/VerbModal';
import './styles/grammar-tables-gallery.css';

// Утилиты для работы с localStorage
const setStorage = (name, value) => {
    localStorage.setItem(name, value);
};

const getStorage = (name, defaultValue) => {
    return localStorage.getItem(name) || defaultValue;
};

const GrammarTablesGallery = () => {
    const [cols, setCols] = useState(() => parseInt(getStorage('gallery-columns', '3')));
    const [selectedLevel, setSelectedLevel] = useState(() => getStorage('gallery-level', 'a1'));
    const [viewMode, setViewMode] = useState(() => getStorage('view-mode', 'horizontal')); // horizontal или vertical
    const [modalData, setModalData] = useState(null);
    const [verbModalData, setVerbModalData] = useState(null);
    const [verbSearchTerm, setVerbSearchTerm] = useState('');
    const [verbSuggestions, setVerbSuggestions] = useState([]);
    const [showVerbSuggestions, setShowVerbSuggestions] = useState(false);
    const [verbData, setVerbData] = useState(null);
    const [hintModalData, setHintModalData] = useState(null);

    // Сохраняем настройки в localStorage при изменении
    useEffect(() => {
        setStorage('gallery-columns', cols.toString());
    }, [cols]);

    useEffect(() => {
        setStorage('gallery-level', selectedLevel);
    }, [selectedLevel]);

    useEffect(() => {
        setStorage('view-mode', viewMode);
    }, [viewMode]);

    // Загружаем данные глаголов
    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/darbs_translate.json')
            .then(response => response.json())
            .then(data => {
                setVerbData(data);
                console.log('Загружено глаголов:', Object.keys(data).length);
            })
            .catch(error => {
                console.error('Ошибка загрузки данных глаголов:', error);
            });
    }, []);

    // Обработчики изменения настроек
    const handleColsChange = (newCols) => {
        setCols(newCols);
    };

    const handleLevelChange = (level) => {
        setSelectedLevel(level);
    };

    const handleViewModeToggle = () => {
        setViewMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    };

    const handleImageClick = (imageData) => {
        setModalData(imageData);
    };

    const handleCloseModal = () => {
        setModalData(null);
    };

    const handleVerbSearchChange = (term) => {
        setVerbSearchTerm(term);
        if (term.length < 2) {
            setShowVerbSuggestions(false);
            return;
        }
        searchVerbs(term);
    };

    const searchVerbs = (term) => {
        if (!verbData) {
            setVerbSuggestions([{ text: 'Данные загружаются...' }]);
            setShowVerbSuggestions(true);
            return;
        }

        const normalizedTerm = normalizeLatvian(term.toLowerCase());
        const foundVerbs = [];

        Object.keys(verbData).forEach(index => {
            const verbs = verbData[index];
            verbs.forEach(verbArray => {
                const latvian = verbArray[0].toLowerCase();
                const russian = verbArray[1].toLowerCase();
                const ukrainian = verbArray[2].toLowerCase();
                
                const normalizedLatvian = normalizeLatvian(latvian);
                
                const matchLatvian = latvian.includes(term.toLowerCase()) || normalizedLatvian.includes(normalizedTerm);
                const matchRussian = russian.includes(term.toLowerCase());
                const matchUkrainian = ukrainian.includes(term.toLowerCase());
                
                if (matchLatvian || matchRussian || matchUkrainian) {
                    const minDiff = Math.min(
                        Math.abs(normalizedLatvian.length - normalizedTerm.length),
                        Math.abs(russian.length - term.length),
                        Math.abs(ukrainian.length - term.length)
                    );
                    
                    const exactMatch = (latvian === term.toLowerCase() || normalizedLatvian === normalizedTerm || 
                                     russian === term.toLowerCase() || ukrainian === term.toLowerCase());
                    
                    foundVerbs.push({
                        index,
                        verbArray,
                        diff: minDiff,
                        exactMatch
                    });
                }
            });
        });

        if (foundVerbs.length === 0) {
            setVerbSuggestions([{ text: 'Глагол не найден' }]);
            setShowVerbSuggestions(true);
            return;
        }

        // Сортируем: сначала точные совпадения, потом по разнице в длине
        foundVerbs.sort((a, b) => {
            if (a.exactMatch && !b.exactMatch) return -1;
            if (!a.exactMatch && b.exactMatch) return 1;
            return a.diff - b.diff;
        });

        // Если только один вариант - сразу показываем
        if (foundVerbs.length === 1) {
            showVerbImage(foundVerbs[0].index, foundVerbs[0].verbArray);
            return;
        }

        setVerbSuggestions(foundVerbs.slice(0, 10));
        setShowVerbSuggestions(true);
    };

    const normalizeLatvian = (text) => {
        return text
            .replace(/[āĀ]/g, 'a')
            .replace(/[ēĒ]/g, 'e')
            .replace(/[īĪ]/g, 'i')
            .replace(/[ūŪ]/g, 'u')
            .replace(/[ļĻ]/g, 'l')
            .replace(/[ņŅ]/g, 'n')
            .replace(/[ģĢ]/g, 'g')
            .replace(/[ķĶ]/g, 'k')
            .replace(/[šŠ]/g, 's')
            .replace(/[čČ]/g, 'c')
            .replace(/[žŽ]/g, 'z');
    };

    const showVerbImage = (index, verbArray) => {
        console.log('GrammarTablesGallery: showVerbImage вызван с:', index, verbArray);
        setVerbSearchTerm(verbArray[0]);
        setShowVerbSuggestions(false);
        const verbModalData = {
            index,
            verb: verbArray[0],
            translation: verbArray[1],
            transcription: verbArray[2],
            imageSrc: `/wp-content/themes/lbp/assets/images/verbs/${index}.png`
        };
        console.log('GrammarTablesGallery: Устанавливаем verbModalData:', verbModalData);
        setVerbModalData(verbModalData);
    };

    const handleVerbSuggestionClick = (suggestion) => {
        showVerbImage(suggestion.index, suggestion.verbArray);
    };

    const handleCloseVerbModal = () => {
        setVerbModalData(null);
    };

    const handleHintClick = (imageId) => {
        setHintModalData({
            id: imageId,
            hintPath: `/wp-content/themes/lbp/assets/hints/${imageId}.html`
        });
    };

    const handleCloseHint = () => {
        setHintModalData(null);
    };

    return (
        <>
            {/* Рендерим хедер через портал в основной header.php */}
            <GrammarTablesHeaderPortal
                cols={cols}
                selectedLevel={selectedLevel}
                verbSearchTerm={verbSearchTerm}
                verbSuggestions={verbSuggestions}
                showVerbSuggestions={showVerbSuggestions}
                viewMode={viewMode}
                onColsChange={handleColsChange}
                onLevelChange={handleLevelChange}
                onVerbSearchChange={handleVerbSearchChange}
                onVerbSuggestionClick={handleVerbSuggestionClick}
                onCloseVerbSuggestions={() => setShowVerbSuggestions(false)}
                onViewModeToggle={handleViewModeToggle}
            />
            
            <div className={`grammar-tables-gallery __view-${viewMode}`}>

                <GrammarTablesGrid
                    cols={cols}
                    selectedLevel={selectedLevel}
                    viewMode={viewMode}
                    onImageClick={handleImageClick}
                    onHintClick={handleHintClick}
                />

                {modalData && (
                    <GrammarTablesModal
                        data={modalData}
                        onClose={handleCloseModal}
                    />
                )}

                {verbModalData && (
                    <VerbModal
                        verbData={verbModalData}
                        onClose={handleCloseVerbModal}
                    />
                )}
            </div>
            
            {/* Индикатор страниц */}
            <div className="page-indicator">
                <span id="currentPage">1</span> / <span id="totalPages">1</span>
            </div>

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

export default GrammarTablesGallery;