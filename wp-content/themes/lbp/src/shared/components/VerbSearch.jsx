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
        fetch('/wp-content/themes/lbp/assets/verbs.15cells.tr_gpt5.json')
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setVerbData(data);
                    console.log('VerbSearch: Загружено глаголов:', data.length);
                } else {
                    console.warn('VerbSearch: Некорректный формат данных глаголов', data);
                    setVerbData([]);
                }
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

        if (!Array.isArray(verbData) || verbData.length === 0) {
            setSuggestions([{ text: 'Нет данных для поиска' }]);
            setShowSuggestions(true);
            return;
        }

        const normalizedTerm = normalizeLatvian(term.toLowerCase());
        const rawTerm = term.toLowerCase();
        const foundVerbs = [];

        verbData.forEach((verb, index) => {
            const lemma = (verb.lemma || '').toLowerCase();
            const normalizedLemma = normalizeLatvian(lemma);
            const russian = (verb.translation?.ru || '').toLowerCase();
            const ukrainian = (verb.translation?.uk || '').toLowerCase();
            const forms = Array.isArray(verb.forms) ? verb.forms : [];

            const matchLemma = lemma.includes(rawTerm) || normalizedLemma.includes(normalizedTerm);
            const matchRussian = russian.includes(rawTerm);
            const matchUkrainian = ukrainian.includes(rawTerm);
            const matchForms = forms.some(form => {
                const lowerForm = form.toLowerCase();
                return lowerForm.includes(rawTerm) || normalizeLatvian(lowerForm).includes(normalizedTerm);
            });

            if (matchLemma || matchRussian || matchUkrainian || matchForms) {
                const diffs = [];
                if (normalizedLemma) diffs.push(Math.abs(normalizedLemma.length - normalizedTerm.length));
                if (russian) diffs.push(Math.abs(russian.length - rawTerm.length));
                if (ukrainian) diffs.push(Math.abs(ukrainian.length - rawTerm.length));
                forms.forEach(form => {
                    const lower = form.toLowerCase();
                    diffs.push(Math.abs(lower.length - rawTerm.length));
                });

                const minDiff = diffs.length ? Math.min(...diffs) : Number.MAX_SAFE_INTEGER;
                const exactMatch = (
                    lemma === rawTerm ||
                    normalizedLemma === normalizedTerm ||
                    russian === rawTerm ||
                    ukrainian === rawTerm ||
                    forms.some(form => form.toLowerCase() === rawTerm)
                );

                foundVerbs.push({
                    index,
                    latvian: verb.lemma || '',
                    russian: verb.translation?.ru || '',
                    ukrainian: verb.translation?.uk || '',
                    className: verb.class || '',
                    forms: forms.slice(),
                    diff: minDiff,
                    exactMatch,
                    raw: verb
                });
            }
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
        
        setSearchTerm(verb.latvian || '');
        setShowSuggestions(false);
        
        if (onVerbSelect) {
            const payload = verb.raw ? {
                ...verb.raw,
                latvian: verb.latvian,
                russian: verb.russian,
                ukrainian: verb.ukrainian,
                className: verb.className
            } : verb;

            console.log('VerbSearch: Вызываем onVerbSelect с данными:', payload);
            onVerbSelect(payload);
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
                                    <small>
                                        {suggestion.russian || '—'}
                                        {suggestion.ukrainian ? ` / ${suggestion.ukrainian}` : ''}
                                    </small>
                                    {suggestion.className && (
                                        <span className="verb-suggestion-class">
                                            Класс: {suggestion.className}
                                        </span>
                                    )}
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

