import React, { useState, useEffect, useRef } from 'react';

// Утилита для нормализации латышских символов
const normalizeLatvian = (str) => {
    const map = {
        'ā': 'a', 'č': 'c', 'ē': 'e', 'ģ': 'g',
        'ī': 'i', 'ķ': 'k', 'ļ': 'l', 'ņ': 'n',
        'š': 's', 'ū': 'u', 'ž': 'z'
    };
    return str.replace(/[āčēģīķļņšūž]/g, letter => map[letter] || letter);
};

const VerbSearch = ({ onVerbSelect }) => {
    const [verbData, setVerbData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    // Загружаем данные глаголов
    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/darbs_translate.json')
            .then(response => response.json())
            .then(data => {
                setVerbData(data);
                console.log('VerbSearch: Загружено глаголов:', Object.keys(data).length);
            })
            .catch(error => {
                console.error('VerbSearch: Ошибка загрузки данных глаголов:', error);
            });
    }, []);

    // Закрываем подсказки при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchVerbs = (term) => {
        if (!verbData) {
            setSuggestions([{ text: 'Данные загружаются...' }]);
            setShowSuggestions(true);
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
                    
                    foundVerbs.push({
                        index: index,
                        latvian: verbArray[0],
                        russian: verbArray[1],
                        ukrainian: verbArray[2],
                        imagePath: `/wp-content/themes/lbp/assets/images/verbs/${index}.png`,
                        diff: minDiff
                    });
                }
            });
        });

        foundVerbs.sort((a, b) => a.diff - b.diff);
        
        console.log('VerbSearch: Найдено глаголов:', foundVerbs.length);
        console.log('VerbSearch: Первые 3 найденных глагола:', foundVerbs.slice(0, 3));
        
        if (foundVerbs.length === 0) {
            setSuggestions([{ text: 'Ничего не найдено' }]);
        } else {
            setSuggestions(foundVerbs.slice(0, 10));
        }
        
        setShowSuggestions(true);
    };

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        
        console.log('VerbSearch: handleSearchChange вызван с term:', term);
        
        if (term.length < 2) {
            console.log('VerbSearch: Термин слишком короткий, скрываем предложения');
            setShowSuggestions(false);
            return;
        }
        
        console.log('VerbSearch: Вызываем searchVerbs с term:', term);
        searchVerbs(term);
    };

    const handleSuggestionClick = (verb) => {
        console.log('VerbSearch: handleSuggestionClick вызван с:', verb);
        if (verb.text) return; // Ignore "loading" or "not found" messages
        
        console.log('VerbSearch: Выбран глагол:', verb);
        
        setSearchTerm(verb.latvian);
        setShowSuggestions(false);
        
        if (onVerbSelect) {
            console.log('VerbSearch: Вызываем onVerbSelect с данными:', verb);
            onVerbSelect(verb);
        } else {
            console.warn('VerbSearch: onVerbSelect не передан!');
        }
    };

    const handleInputFocus = (e) => {
        setTimeout(() => e.target.select(), 0);
    };

    console.log('VerbSearch: Рендерим компонент, searchTerm:', searchTerm);
    console.log('VerbSearch: Привязываем onFocus:', !!handleInputFocus);
    
    return (
        <div className="verb-search-wrapper" ref={searchRef}>
            <div className="verb-search-container">
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Поиск глагола..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleInputFocus}
                    style={{ width: '200px' }}
                    autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div className="verb-suggestions">
                        {suggestions.map((suggestion, index) => {
                            if (suggestion.text) {
                                return (
                                    <div key={index} className="verb-suggestion-item disabled">
                                        {suggestion.text}
                                    </div>
                                );
                            }
                            return (
                                <div
                                    key={index}
                                    className="verb-suggestion-item"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    <strong>{suggestion.latvian}</strong>
                                    <small>{suggestion.russian} / {suggestion.ukrainian}</small>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerbSearch;

