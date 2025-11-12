import React, { useState, useEffect } from 'react';
import GrammarTablesHeaderPortal from './components/GrammarTablesHeaderPortal';
import GrammarTablesMobileMenu from './components/GrammarTablesMobileMenu';
import GrammarTablesGrid from './components/GrammarTablesGrid';
import GrammarTablesModal from './components/GrammarTablesModal';
import VerbModal from '../shared/components/VerbModal';
import { superTables, superGroups as PRESET_SUPER_GROUPS } from './data/tablesData';
import './styles/grammar-tables-gallery.css';

const normalizeLatvian = (text = '') => {
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

// Утилиты для работы с localStorage
const isBrowser = typeof window !== 'undefined';

const setStorage = (name, value) => {
    if (!isBrowser) return;
    localStorage.setItem(name, value);
};

const getStorage = (name, defaultValue) => {
    if (!isBrowser) return defaultValue;
    return localStorage.getItem(name) ?? defaultValue;
};

const setStorageJSON = (name, value) => {
    if (!isBrowser) return;
    try {
        localStorage.setItem(name, JSON.stringify(value));
    } catch (err) {
        console.warn(`Не удалось сохранить "${name}" в localStorage:`, err);
    }
};

const getStorageJSON = (name, defaultValue) => {
    if (!isBrowser) return defaultValue;
    const stored = localStorage.getItem(name);
    if (!stored) return defaultValue;
    try {
        return JSON.parse(stored);
    } catch (err) {
        console.warn(`Не удалось прочитать "${name}" из localStorage:`, err);
        return defaultValue;
    }
};

const SUPER_TABLES = superTables;
const DEFAULT_SUPER_GROUPS = Array.isArray(PRESET_SUPER_GROUPS) ? PRESET_SUPER_GROUPS : [];

const SUPER_STATE_KEY = 'grammar-super-state';
const DEFAULT_SUPER_ORDER = SUPER_TABLES.map(table => table.id);

const appendMissingIds = (primary = [], reference = []) => {
    const result = Array.isArray(primary) ? primary.slice() : [];
    const seen = new Set(result);
    reference.forEach((id) => {
        if (!seen.has(id)) {
            result.push(id);
            seen.add(id);
        }
    });
    return result;
};

const buildDefaultSuperGroups = () => {
    const validIds = new Set(SUPER_TABLES.map(table => table.id));
    const seenGroupIds = new Set();
    const usedTableIds = new Set();

    const groups = DEFAULT_SUPER_GROUPS.map((group, index) => {
        const rawId = group && group.id ? String(group.id).trim() : '';
        let groupId = rawId || `super-group-${index + 1}`;
        while (seenGroupIds.has(groupId)) {
            groupId = `${groupId}-${index + 1}`;
        }
        seenGroupIds.add(groupId);

        const title = group && group.title
            ? String(group.title).trim() || `Группа ${index + 1}`
            : `Группа ${index + 1}`;

        const itemIds = Array.isArray(group?.itemIds)
            ? group.itemIds
                .map(id => String(id).trim())
                .filter(id => validIds.has(id))
            : [];

        itemIds.forEach(id => usedTableIds.add(id));

        return {
            id: groupId,
            title,
            itemIds: Array.from(new Set(itemIds))
        };
    });

    const remaining = SUPER_TABLES
        .map(table => table.id)
        .filter(id => !usedTableIds.has(id));

    if (groups.length === 0) {
        return [{
            id: 'super-group-1',
            title: 'Группа 1',
            itemIds: remaining.length ? remaining.slice() : SUPER_TABLES.map(table => table.id)
        }];
    }

    if (remaining.length) {
        const firstGroup = groups[0];
        const merged = appendMissingIds(firstGroup.itemIds, remaining);
        groups[0] = {
            ...firstGroup,
            itemIds: merged
        };
    }

    return groups;
};

const normalizeSuperGroups = (value) => {
    const defaultGroups = buildDefaultSuperGroups();
    const validIds = new Set(SUPER_TABLES.map(table => table.id));

    if (!Array.isArray(value) || value.length === 0) {
        return defaultGroups;
    }

    const seenGroupIds = new Set();
    const usedTableIds = new Set();

    const normalized = value
        .map((group, index) => {
            if (!group || typeof group !== 'object') return null;

            let groupId = group.id ? String(group.id).trim() : '';
            if (!groupId) {
                groupId = `super-group-${index + 1}`;
            }
            while (seenGroupIds.has(groupId)) {
                groupId = `${groupId}-${index + 1}`;
            }
            seenGroupIds.add(groupId);

            const title = group.title
                ? String(group.title).trim() || `Группа ${index + 1}`
                : `Группа ${index + 1}`;

            const itemIds = Array.isArray(group.itemIds)
                ? group.itemIds
                    .map(id => String(id).trim())
                    .filter(id => validIds.has(id))
                : [];

            itemIds.forEach(id => usedTableIds.add(id));

            return {
                id: groupId,
                title,
                itemIds: Array.from(new Set(itemIds))
            };
        })
        .filter(Boolean);

    if (normalized.length === 0) {
        return defaultGroups;
    }

    const remaining = SUPER_TABLES
        .map(table => table.id)
        .filter(id => !usedTableIds.has(id));

    if (remaining.length) {
        const firstGroup = normalized[0];
        normalized[0] = {
            ...firstGroup,
            itemIds: appendMissingIds(firstGroup.itemIds, remaining)
        };
    }

    return normalized;
};

const buildDefaultSuperState = () => {
    const groups = buildDefaultSuperGroups();
    const orderFromGroups = groups.flatMap(group => group.itemIds);
    const order = orderFromGroups.length ? orderFromGroups : DEFAULT_SUPER_ORDER.slice();

    return {
        order,
        active: order.slice(),
        showHidden: false,
        groups
    };
};

const normalizeStoredSuperState = (value) => {
    const defaultState = buildDefaultSuperState();
    if (!value || typeof value !== 'object') {
        return defaultState;
    }

    const validIds = new Set(SUPER_TABLES.map(table => table.id));
    const rawOrder = Array.isArray(value.order)
        ? value.order.map(id => String(id).trim()).filter(id => validIds.has(id))
        : [];

    const groups = normalizeSuperGroups(value.groups);
    let order = groups.flatMap(group => group.itemIds);
    if (!order.length) {
        order = rawOrder.length
            ? appendMissingIds(rawOrder, DEFAULT_SUPER_ORDER)
            : defaultState.order.slice();
    }

    const rawActive = Array.isArray(value.active)
        ? value.active.map(id => String(id).trim()).filter(id => validIds.has(id))
        : [];

    const activeSet = rawActive.length ? new Set(rawActive) : new Set(order);
    const active = order.filter(id => activeSet.has(id));

    return {
        order,
        active: active.length ? active : order.slice(),
        showHidden: Boolean(value.showHidden),
        groups
    };
};

const GrammarTablesGallery = () => {
    const [cols, setCols] = useState(() => parseInt(getStorage('gallery-columns', '3'), 10) || 3);
    const [selectedLevel, setSelectedLevel] = useState(() => getStorage('gallery-level', 'a1'));
    const [viewMode, setViewMode] = useState(() => getStorage('view-mode', 'horizontal')); // horizontal или vertical
    const [modalData, setModalData] = useState(null);
    const [verbModalData, setVerbModalData] = useState(null);
    const [verbSearchTerm, setVerbSearchTerm] = useState('');
    const [verbSuggestions, setVerbSuggestions] = useState([]);
    const [showVerbSuggestions, setShowVerbSuggestions] = useState(false);
    const [verbData, setVerbData] = useState(null);
    const [referenceVerbTables, setReferenceVerbTables] = useState({ list: [], byNumber: {} });
    const [verbTableLookup, setVerbTableLookup] = useState({ byLemma: {}, byNormalized: {} });
    const [verbTranslations, setVerbTranslations] = useState([]);
    const [verbFormsLookup, setVerbFormsLookup] = useState({ byLemma: {}, byNormalized: {} });
    const [hintModalData, setHintModalData] = useState(null);
    const [superState, setSuperState] = useState(() => normalizeStoredSuperState(getStorageJSON(SUPER_STATE_KEY, null)));
    const [currentSuperGroupId, setCurrentSuperGroupId] = useState(() => {
        const groups = Array.isArray(superState.groups) && superState.groups.length
            ? superState.groups
            : buildDefaultSuperGroups();
        return groups.length ? groups[0].id : null;
    });
    const [showSuperManager, setShowSuperManager] = useState(false);

    useEffect(() => {
        setStorage('gallery-columns', cols.toString());
    }, [cols]);

    useEffect(() => {
        setStorage('gallery-level', selectedLevel);
    }, [selectedLevel]);

    useEffect(() => {
        setStorage('view-mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        setStorageJSON(SUPER_STATE_KEY, superState);
    }, [superState]);

    useEffect(() => {
        const groups = Array.isArray(superState.groups) && superState.groups.length
            ? superState.groups
            : buildDefaultSuperGroups();

        if (!groups.length) {
            if (currentSuperGroupId !== null) {
                setCurrentSuperGroupId(null);
            }
            return;
        }

        const exists = groups.some(group => group.id === currentSuperGroupId);
        if (!exists) {
            setCurrentSuperGroupId(groups[0].id);
        }
    }, [superState.groups, currentSuperGroupId]);

    // Загружаем данные глаголов
    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/verbs.15cells.tr_gpt5.json')
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setVerbData(data);
                    const byLemma = {};
                    const byNormalized = {};
                    data.forEach(item => {
                        if (!item || !item.lemma) return;
                        const lemmaLower = String(item.lemma).trim().toLowerCase();
                        if (!lemmaLower) return;
                        byLemma[lemmaLower] = item;
                        const normalized = normalizeLatvian(lemmaLower);
                        if (normalized) {
                            if (!byNormalized[normalized]) {
                                byNormalized[normalized] = item;
                            }
                        }
                    });
                    setVerbFormsLookup({ byLemma, byNormalized });
                    console.log('Загружено глаголов:', data.length);
                } else {
                    console.warn('Глаголы загружены в неизвестном формате', data);
                    setVerbData([]);
                    setVerbFormsLookup({ byLemma: {}, byNormalized: {} });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки данных глаголов:', error);
                setVerbData([]);
                setVerbFormsLookup({ byLemma: {}, byNormalized: {} });
            });
    }, []);

    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/latvian_verb_tables_15forms.json')
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const byNumber = {};
                    data.forEach(item => {
                        if (!item) return;
                        const key = item.table_number ?? item.tableNumber;
                        if (key === undefined || key === null) return;
                        const keyStr = String(key);
                        if (keyStr) {
                            byNumber[keyStr] = item;
                        }
                    });
                    setReferenceVerbTables({ list: data, byNumber });
                } else {
                    console.warn('latvian_verb_tables_15forms.json загружен в неизвестном формате', data);
                    setReferenceVerbTables({ list: [], byNumber: {} });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки latvian_verb_tables_15forms.json:', error);
                setReferenceVerbTables({ list: [], byNumber: {} });
            });
    }, []);

    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/darbs.json')
            .then(response => response.json())
            .then(data => {
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    const byLemma = {};
                    const byNormalized = {};
                    const addToLookup = (container, key, value) => {
                        if (!key) return;
                        if (!container[key]) {
                            container[key] = [value];
                            return;
                        }
                        if (!container[key].includes(value)) {
                            container[key].push(value);
                        }
                    };

                    Object.entries(data).forEach(([tableId, verbs]) => {
                        const tableNumber = parseInt(tableId, 10);
                        if (!Number.isFinite(tableNumber)) return;
                        if (!Array.isArray(verbs)) return;

                        verbs.forEach((verbName) => {
                            if (!verbName) return;
                            const lower = String(verbName).trim().toLowerCase();
                            if (!lower) return;
                            addToLookup(byLemma, lower, tableNumber);
                            const normalizedKey = normalizeLatvian(lower);
                            addToLookup(byNormalized, normalizedKey, tableNumber);
                        });
                    });

                    setVerbTableLookup({ byLemma, byNormalized });
                } else {
                    console.warn('darbs.json загружен в неизвестном формате', data);
                    setVerbTableLookup({ byLemma: {}, byNormalized: {} });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки darbs.json:', error);
                setVerbTableLookup({ byLemma: {}, byNormalized: {} });
            });
    }, []);

    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/darbs_translate.json')
            .then(response => response.json())
            .then(data => {
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    const grouped = new Map();

                    Object.entries(data).forEach(([tableId, list]) => {
                        const tableNumber = parseInt(tableId, 10);
                        if (!Array.isArray(list) || !Number.isFinite(tableNumber)) return;

                        list.forEach(item => {
                            if (!Array.isArray(item) || item.length === 0) return;
                            const [lemmaRaw, ru = '', uk = ''] = item;
                            if (!lemmaRaw) return;
                            const lemma = String(lemmaRaw).trim();
                            if (!lemma) return;

                            const lemmaLower = lemma.toLowerCase();
                            const normalizedLemma = normalizeLatvian(lemmaLower);
                            const translationRu = String(ru || '');
                            const translationUk = String(uk || '');

                            if (grouped.has(lemmaLower)) {
                                const existing = grouped.get(lemmaLower);
                                if (!existing.tableNumbers.includes(tableNumber)) {
                                    existing.tableNumbers.push(tableNumber);
                                }
                                if (!existing.translationRu && translationRu) {
                                    existing.translationRu = translationRu;
                                }
                                if (!existing.translationUk && translationUk) {
                                    existing.translationUk = translationUk;
                                }
                            } else {
                                grouped.set(lemmaLower, {
                                    lemma,
                                    lemmaLower,
                                    normalizedLemma,
                                    translationRu,
                                    translationUk,
                                    tableNumbers: [tableNumber]
                                });
                            }
                        });
                    });

                    setVerbTranslations(Array.from(grouped.values()));
                } else {
                    console.warn('darbs_translate.json загружен в неизвестном формате', data);
                    setVerbTranslations([]);
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки darbs_translate.json:', error);
                setVerbTranslations([]);
            });
    }, []);

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
        if (!Array.isArray(verbTranslations) || verbTranslations.length === 0) {
            setVerbSuggestions([{ text: 'Данные загружаются или отсутствуют' }]);
            setShowVerbSuggestions(true);
            return;
        }

        const rawTerm = term.toLowerCase();
        const normalizedTerm = normalizeLatvian(rawTerm);
        const foundVerbs = [];

        verbTranslations.forEach(entry => {
            const lemmaLower = entry.lemmaLower;
            const normalizedLemma = entry.normalizedLemma;
            const ruLower = entry.translationRu.toLowerCase();
            const ukLower = entry.translationUk.toLowerCase();

            const matchLemma = lemmaLower.includes(rawTerm) || normalizedLemma.includes(normalizedTerm);
            const matchRussian = ruLower.includes(rawTerm);
            const matchUkrainian = ukLower.includes(rawTerm);

            if (!matchLemma && !matchRussian && !matchUkrainian) {
                return;
            }

            const diffs = [];
            if (normalizedLemma) diffs.push(Math.abs(normalizedLemma.length - normalizedTerm.length));
            if (ruLower) diffs.push(Math.abs(ruLower.length - rawTerm.length));
            if (ukLower) diffs.push(Math.abs(ukLower.length - rawTerm.length));

            const minDiff = diffs.length ? Math.min(...diffs) : Number.MAX_SAFE_INTEGER;
            const exactMatch = (
                lemmaLower === rawTerm ||
                normalizedLemma === normalizedTerm ||
                ruLower === rawTerm ||
                ukLower === rawTerm
            );

            foundVerbs.push({
                lemma: entry.lemma,
                translationRu: entry.translationRu,
                translationUk: entry.translationUk,
                tableNumbers: entry.tableNumbers.slice(),
                diff: minDiff,
                exactMatch
            });
        });

        if (foundVerbs.length === 0) {
            setVerbSuggestions([{ text: 'Глагол не найден' }]);
            setShowVerbSuggestions(true);
            return;
        }

        foundVerbs.sort((a, b) => {
            if (a.exactMatch && !b.exactMatch) return -1;
            if (!a.exactMatch && b.exactMatch) return 1;
            return a.diff - b.diff;
        });

        if (foundVerbs.length === 1) {
            openVerbDetails(foundVerbs[0]);
            return;
        }

        setVerbSuggestions(foundVerbs.slice(0, 10));
        setShowVerbSuggestions(true);
    };

    const openVerbDetails = (verbSuggestion) => {
        if (!verbSuggestion) return;

        const lemmaText = verbSuggestion.lemma || '';
        const lemmaLower = lemmaText.trim().toLowerCase();
        let formsSource = null;

        if (lemmaLower) {
            formsSource = verbFormsLookup.byLemma?.[lemmaLower];
            if (!formsSource) {
                const normalizedLemma = normalizeLatvian(lemmaLower);
                if (normalizedLemma) {
                    formsSource = verbFormsLookup.byNormalized?.[normalizedLemma] || null;
                }
            }
        }

        const generatedForms = Array.isArray(formsSource?.forms) ? formsSource.forms.slice(0, 15) : [];
        const generatedFormsAvailable = generatedForms.length >= 15;
        const modalPayload = {
            lemma: lemmaText,
            translation: {
                ru: verbSuggestion.translationRu || '',
                uk: verbSuggestion.translationUk || ''
            },
            className: formsSource?.class || '',
            forms: generatedFormsAvailable ? generatedForms : [],
            generatedFormsAvailable
        };

        const matchedTableSet = new Set();

        if (lemmaLower) {
            const directMatches = verbTableLookup.byLemma?.[lemmaLower] || [];
            directMatches.forEach(number => {
                if (Number.isFinite(number)) {
                    matchedTableSet.add(number);
                }
            });

            const normalizedLemma = normalizeLatvian(lemmaLower);
            if (normalizedLemma) {
                const normalizedMatches = verbTableLookup.byNormalized?.[normalizedLemma] || [];
                normalizedMatches.forEach(number => {
                    if (Number.isFinite(number)) {
                        matchedTableSet.add(number);
                    }
                });
            }
        }

        if (Array.isArray(verbSuggestion.tableNumbers)) {
            verbSuggestion.tableNumbers.forEach(number => {
                if (Number.isFinite(number)) {
                    matchedTableSet.add(number);
                }
            });
        }

        const matchedTableNumbers = Array.from(matchedTableSet).sort((a, b) => a - b);

        let referenceTable = null;
        if (matchedTableNumbers.length && referenceVerbTables?.byNumber) {
            for (const tableNumber of matchedTableNumbers) {
                const tableEntry = referenceVerbTables.byNumber[String(tableNumber)];
                if (tableEntry) {
                    referenceTable = {
                        tableNumber,
                        source: tableEntry
                    };
                    break;
                }
            }
        }

        modalPayload.matchedTableNumbers = matchedTableNumbers;
        modalPayload.referenceTable = referenceTable;

        console.log('GrammarTablesGallery: openVerbDetails', modalPayload);

        setVerbSearchTerm(modalPayload.lemma);
        setShowVerbSuggestions(false);
        setVerbModalData(modalPayload);
    };

    const handleVerbSuggestionClick = (suggestion) => {
        openVerbDetails(suggestion);
    };

    const handleCloseVerbModal = () => {
        setVerbModalData(null);
    };

    const handleHintClick = (imageId) => {
        if (!imageId) return;
        const idString = String(imageId);
        const isSuper = idString.startsWith('super-');
        const cleanId = isSuper ? idString.replace('super-', '') : idString;
        const hintPath = isSuper
            ? `/wp-content/themes/lbp/assets/hints-super-tables/${cleanId}.html`
            : `/wp-content/themes/lbp/assets/hints/${cleanId}.html`;
        setHintModalData({
            id: cleanId,
            hintPath
        });
    };

    const handleCloseHint = () => {
        setHintModalData(null);
    };

    const superGroups = Array.isArray(superState.groups) && superState.groups.length
        ? superState.groups
        : buildDefaultSuperGroups();

    const superGroupMap = superGroups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
    }, {});

    const groupedOrder = superGroups.flatMap(group => Array.isArray(group.itemIds) ? group.itemIds : []);
    const superOrder = groupedOrder.length
        ? appendMissingIds(groupedOrder, DEFAULT_SUPER_ORDER)
        : appendMissingIds(superState.order, DEFAULT_SUPER_ORDER);

    const rawActiveSuperIds = Array.isArray(superState.active) ? superState.active : [];
    const filteredActiveSuperIds = rawActiveSuperIds.filter(id => superOrder.includes(id));
    const activeSuperIds = filteredActiveSuperIds.length ? filteredActiveSuperIds : superOrder.slice();
    const showHiddenSuper = superState.showHidden;

    const tableIdToGroupId = {};
    superGroups.forEach(group => {
        (group.itemIds || []).forEach(id => {
            if (!tableIdToGroupId[id]) {
                tableIdToGroupId[id] = group.id;
            }
        });
    });

    const activeSuperSet = new Set(activeSuperIds);
    const globalActiveOrderIds = superOrder.filter(id => activeSuperSet.has(id));

    const currentSuperGroup = currentSuperGroupId
        ? superGroups.find(group => group.id === currentSuperGroupId)
        : superGroups[0] || null;

    const currentGroupOrder = currentSuperGroup
        ? currentSuperGroup.itemIds
        : superOrder;

    const selectedSuperTables = currentGroupOrder
        .map(id => SUPER_TABLES.find(table => table.id === id))
        .filter(table => table && activeSuperSet.has(table.id));

    const superGroupsDetailed = superGroups.map(group => {
        const tables = (group.itemIds || [])
            .map(id => {
                const table = SUPER_TABLES.find(item => item.id === id);
                if (!table) return null;
                const isActive = activeSuperSet.has(id);
                if (!showHiddenSuper && !isActive) {
                    return null;
                }
                return {
                    ...table,
                    isActive,
                    groupId: group.id
                };
            })
            .filter(Boolean);

        return {
            id: group.id,
            title: group.title,
            tables
        };
    }).filter(group => group.tables.length > 0 || showHiddenSuper);

    const toggleSuperTable = (tableId) => {
        setSuperState(prev => {
            const normalizedOrder = appendMissingIds(prev.order, DEFAULT_SUPER_ORDER);
            const activeSet = new Set(prev.active);
            if (activeSet.has(tableId)) {
                activeSet.delete(tableId);
            } else {
                activeSet.add(tableId);
            }

            const nextActive = normalizedOrder.filter(id => activeSet.has(id));

            return {
                ...prev,
                order: normalizedOrder,
                active: nextActive.length ? nextActive : normalizedOrder.slice()
            };
        });
    };

    const moveSuperTable = (tableId, direction) => {
        setSuperState(prev => {
            const activeSet = new Set(prev.active);
            if (!activeSet.has(tableId)) {
                return prev;
            }

            const groups = Array.isArray(prev.groups) && prev.groups.length
                ? prev.groups.map(group => ({
                    ...group,
                    itemIds: Array.isArray(group.itemIds) ? group.itemIds.slice() : []
                }))
                : buildDefaultSuperGroups();

            if (!groups.length) {
                return prev;
            }

            let currentGroupIndex = groups.findIndex(group => group.itemIds.includes(tableId));
            if (currentGroupIndex === -1) {
                groups[0].itemIds = appendMissingIds(groups[0].itemIds, [tableId]);
                currentGroupIndex = 0;
            }

            const currentGroup = {
                ...groups[currentGroupIndex],
                itemIds: (groups[currentGroupIndex].itemIds || []).slice()
            };
            const position = currentGroup.itemIds.indexOf(tableId);
            if (position === -1) {
                return prev;
            }

            if (direction === 'up') {
                if (position > 0) {
                    const swapId = currentGroup.itemIds[position - 1];
                    currentGroup.itemIds[position - 1] = tableId;
                    currentGroup.itemIds[position] = swapId;
                } else if (currentGroupIndex > 0) {
                    const previousGroup = {
                        ...groups[currentGroupIndex - 1],
                        itemIds: (groups[currentGroupIndex - 1].itemIds || []).slice()
                    };
                    currentGroup.itemIds.splice(position, 1);
                    previousGroup.itemIds.push(tableId);
                    groups[currentGroupIndex - 1] = previousGroup;
                } else {
                    return prev;
                }
            } else if (direction === 'down') {
                if (position < currentGroup.itemIds.length - 1) {
                    const swapId = currentGroup.itemIds[position + 1];
                    currentGroup.itemIds[position + 1] = tableId;
                    currentGroup.itemIds[position] = swapId;
                } else if (currentGroupIndex < groups.length - 1) {
                    const nextGroup = {
                        ...groups[currentGroupIndex + 1],
                        itemIds: (groups[currentGroupIndex + 1].itemIds || []).slice()
                    };
                    currentGroup.itemIds.splice(position, 1);
                    nextGroup.itemIds.unshift(tableId);
                    groups[currentGroupIndex + 1] = nextGroup;
                } else {
                    return prev;
                }
            } else {
                return prev;
            }

            groups[currentGroupIndex] = currentGroup;

            const nextOrder = groups.flatMap(group => group.itemIds);
            const nextActive = nextOrder.filter(id => activeSet.has(id));

            return {
                ...prev,
                order: nextOrder,
                active: nextActive.length ? nextActive : nextOrder.slice(),
                groups
            };
        });
    };

    const resetSuperOrder = () => {
        const defaultState = buildDefaultSuperState();
        setSuperState(prev => ({
            ...prev,
            order: defaultState.order,
            active: defaultState.active,
            groups: defaultState.groups
        }));
        setCurrentSuperGroupId(defaultState.groups.length ? defaultState.groups[0].id : null);
    };

    const toggleShowHidden = () => {
        setSuperState(prev => ({
            ...prev,
            showHidden: !prev.showHidden
        }));
    };

    const handleSuperGroupSelectChange = (groupId) => {
        setCurrentSuperGroupId(groupId || null);
    };

    const addSuperGroup = () => {
        let createdGroupId = null;
        setSuperState(prev => {
            const baseGroups = Array.isArray(prev.groups) && prev.groups.length
                ? prev.groups.map(group => ({
                    ...group,
                    itemIds: Array.isArray(group.itemIds) ? group.itemIds.slice() : []
                }))
                : buildDefaultSuperGroups();

            const existingIds = new Set(baseGroups.map(group => group.id));
            let index = baseGroups.length + 1;
            let candidateId = `super-group-${index}`;
            while (existingIds.has(candidateId)) {
                candidateId = `super-group-${index}-${existingIds.size}`;
            }

            createdGroupId = candidateId;
            const newGroup = {
                id: candidateId,
                title: `Группа ${index}`,
                itemIds: []
            };

            return {
                ...prev,
                groups: [...baseGroups, newGroup]
            };
        });

        if (createdGroupId) {
            setCurrentSuperGroupId(createdGroupId);
        }
    };

    const renameSuperGroup = (groupId, nextTitle) => {
        const title = typeof nextTitle === 'string' ? nextTitle.trim() : '';
        if (!groupId || !title) return;

        setSuperState(prev => {
            if (!Array.isArray(prev.groups)) {
                return prev;
            }

            const nextGroups = prev.groups.map(group => {
                if (group.id !== groupId) return group;
                return {
                    ...group,
                    title
                };
            });

            return {
                ...prev,
                groups: nextGroups
            };
        });
    };

    const promptRenameCurrentSuperGroup = () => {
        if (!currentSuperGroupId) return;
        const currentGroup = superGroupMap[currentSuperGroupId];
        if (!currentGroup) return;

        const nextTitle = isBrowser
            ? window.prompt('Название группы', currentGroup.title || '')
            : null;

        if (nextTitle === null) return;
        renameSuperGroup(currentSuperGroupId, nextTitle);
    };

    const removeSuperGroup = (groupId) => {
        if (!groupId) return;
        let fallbackGroupId = null;

        setSuperState(prev => {
            const baseGroups = Array.isArray(prev.groups) ? prev.groups.map(group => ({
                ...group,
                itemIds: Array.isArray(group.itemIds) ? group.itemIds.slice() : []
            })) : [];

            if (baseGroups.length <= 1) {
                return prev;
            }

            const removeIndex = baseGroups.findIndex(group => group.id === groupId);
            if (removeIndex === -1) {
                return prev;
            }

            const removed = baseGroups.splice(removeIndex, 1)[0];
            const targetIndex = removeIndex > 0 ? removeIndex - 1 : 0;
            if (baseGroups[targetIndex]) {
                baseGroups[targetIndex] = {
                    ...baseGroups[targetIndex],
                    itemIds: appendMissingIds(baseGroups[targetIndex].itemIds, removed.itemIds)
                };
                fallbackGroupId = baseGroups[targetIndex].id;
            }

            const nextOrder = baseGroups.flatMap(group => group.itemIds);
            const activeSet = new Set(prev.active);
            const nextActive = nextOrder.filter(id => activeSet.has(id));

            return {
                ...prev,
                order: nextOrder,
                active: nextActive.length ? nextActive : nextOrder.slice(),
                groups: baseGroups
            };
        });

        if (fallbackGroupId) {
            setCurrentSuperGroupId(fallbackGroupId);
        } else if (superGroups.length > 1) {
            const nextGroup = superGroups.find(group => group.id !== groupId);
            setCurrentSuperGroupId(nextGroup ? nextGroup.id : null);
        }
    };

    const handleSuperTableGroupChange = (tableId, targetGroupId) => {
        if (!tableId || !targetGroupId) return;
        if (tableIdToGroupId[tableId] === targetGroupId) return;

        setSuperState(prev => {
            const baseGroups = Array.isArray(prev.groups) && prev.groups.length
                ? prev.groups.map(group => ({
                    ...group,
                    itemIds: Array.isArray(group.itemIds) ? group.itemIds.slice() : []
                }))
                : buildDefaultSuperGroups();

            const targetIndex = baseGroups.findIndex(group => group.id === targetGroupId);
            if (targetIndex === -1) {
                return prev;
            }

            let modified = false;
            const updatedGroups = baseGroups.map(group => {
                if (!Array.isArray(group.itemIds)) {
                    return {
                        ...group,
                        itemIds: []
                    };
                }
                if (!group.itemIds.includes(tableId)) {
                    return group;
                }
                modified = true;
                return {
                    ...group,
                    itemIds: group.itemIds.filter(id => id !== tableId)
                };
            });

            const targetGroup = {
                ...updatedGroups[targetIndex],
                itemIds: appendMissingIds(updatedGroups[targetIndex].itemIds, [tableId])
            };
            updatedGroups[targetIndex] = targetGroup;

            if (!modified && !targetGroup.itemIds.includes(tableId)) {
                targetGroup.itemIds.push(tableId);
            }

            const nextOrder = updatedGroups.flatMap(group => group.itemIds);
            const activeSet = new Set(prev.active);
            const nextActive = nextOrder.filter(id => activeSet.has(id));

            return {
                ...prev,
                order: nextOrder,
                active: nextActive.length ? nextActive : nextOrder.slice(),
                groups: updatedGroups
            };
        });
    };

    const activeCount = activeSuperIds.length;

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
                onManageSuperTables={() => setShowSuperManager(true)}
                superSelectionCount={activeCount}
                showHiddenSuper={showHiddenSuper}
                onToggleShowHidden={toggleShowHidden}
            />
            
            {/* Мобильное меню */}
            <GrammarTablesMobileMenu
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
                onManageSuperTables={() => setShowSuperManager(true)}
                superSelectionCount={activeCount}
                showHiddenSuper={showHiddenSuper}
                onToggleShowHidden={toggleShowHidden}
            />
            
            <div className={`grammar-tables-gallery __view-${viewMode}`}>
                <GrammarTablesGrid
                    cols={cols}
                    selectedLevel={selectedLevel}
                    viewMode={viewMode}
                    onImageClick={handleImageClick}
                    onHintClick={handleHintClick}
                    superOrder={superOrder}
                    onToggleSuperTable={toggleSuperTable}
                    onMoveSuperTable={moveSuperTable}
                    activeIds={activeSuperIds}
                    showHidden={showHiddenSuper}
                    superGroups={superGroupsDetailed}
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

                {/* Индикатор страниц для галереи */}
                {viewMode === 'horizontal' && (
                    <div className="page-indicator">
                        <button
                            className="page-nav-btn page-nav-btn-prev"
                            onClick={() => {
                                const container = document.querySelector('.galleries.horizontal-mode');
                                if (!container) return;
                                const currentScroll = container.scrollLeft;
                                const visibleWidth = document.body.clientWidth - 13;
                                const newScrollPosition = currentScroll - visibleWidth;
                                container.scrollTo({ left: newScrollPosition });

                                // Обновляем индикатор (та же логика что в updatePageIndicator)
                                setTimeout(() => {
                                    const totalWidth = container.scrollWidth;
                                    const currentScroll = container.scrollLeft;
                                    const visibleWidth = document.body.clientWidth;

                                    const totalPages = Math.ceil((totalWidth + 12 - 26) / (visibleWidth - 13));
                                    const currentPage = Math.floor((currentScroll + 10) / (visibleWidth - 13)) + 1;

                                    const currentPageEl = document.getElementById('currentPage');
                                    const totalPagesEl = document.getElementById('totalPages');
                                    if (currentPageEl) currentPageEl.textContent = currentPage;
                                    if (totalPagesEl) totalPagesEl.textContent = totalPages;
                                }, 10);
                            }}
                            aria-label="Предыдущая страница"
                        >
                            ←
                        </button>
                        <span id="currentPage">1</span> / <span id="totalPages">1</span>
                        <button
                            className="page-nav-btn page-nav-btn-next"
                            onClick={() => {
                                const container = document.querySelector('.galleries.horizontal-mode');
                                if (!container) return;
                                const currentScroll = container.scrollLeft;
                                const visibleWidth = document.body.clientWidth - 13;
                                const newScrollPosition = currentScroll + visibleWidth;
                                container.scrollTo({ left: newScrollPosition });

                                // Обновляем индикатор (та же логика что в updatePageIndicator)
                                setTimeout(() => {
                                    const totalWidth = container.scrollWidth;
                                    const currentScroll = container.scrollLeft;
                                    const visibleWidth = document.body.clientWidth;

                                    const totalPages = Math.ceil((totalWidth + 12 - 26) / (visibleWidth - 13));
                                    const currentPage = Math.floor((currentScroll + 10) / (visibleWidth - 13)) + 1;

                                    const currentPageEl = document.getElementById('currentPage');
                                    const totalPagesEl = document.getElementById('totalPages');
                                    if (currentPageEl) currentPageEl.textContent = currentPage;
                                    if (totalPagesEl) totalPagesEl.textContent = totalPages;
                                }, 10);
                            }}
                            aria-label="Следующая страница"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>

            {/* Модальное окно управления супер-таблицами */}
            {showSuperManager && (
                <div className="super-manager-overlay" onClick={() => setShowSuperManager(false)}>
                    <div
                        className="super-manager-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="super-manager-header">
                            <div className="super-manager-header-left">
                                <h3>Супер таблицы</h3>
                                <div className="super-groups-controls">
                                    <label htmlFor="super-group-select">Группа:</label>
                                    <select
                                        id="super-group-select"
                                        value={currentSuperGroupId || ''}
                                        onChange={(event) => handleSuperGroupSelectChange(event.target.value)}
                                        className="form-select form-select-sm"
                                    >
                                        {superGroups.length === 0 ? (
                                            <option value="">Нет групп</option>
                                        ) : (
                                            superGroups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {group.title}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-outline-light btn-sm"
                                        onClick={addSuperGroup}
                                    >
                                        + Группа
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-light btn-sm"
                                        onClick={promptRenameCurrentSuperGroup}
                                        disabled={!currentSuperGroupId}
                                    >
                                        Переименовать
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-light btn-sm"
                                        onClick={() => removeSuperGroup(currentSuperGroupId)}
                                        disabled={!currentSuperGroupId || superGroups.length <= 1}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-light btn-sm"
                                onClick={() => setShowSuperManager(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="super-manager-columns">
                            <div className="super-list available">
                                <h4>Доступные таблицы</h4>
                                <ul>
                                    {superOrder.map(tableId => {
                                        const table = SUPER_TABLES.find(item => item.id === tableId);
                                        if (!table) return null;
                                        const isSelected = activeSuperSet.has(table.id);
                                        const groupId = tableIdToGroupId[table.id];
                                        const groupTitle = groupId ? (superGroupMap[groupId]?.title || '') : '';
                                        return (
                                            <li key={table.id}>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSuperTable(table.id)}
                                                    />
                                                    <span>{table.title}</span>
                                                </label>
                                                <span className="group-badge">
                                                    {groupTitle || '—'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="super-list selected">
                                <h4>Порядок отображения</h4>
                                {selectedSuperTables.length === 0 ? (
                                    <p className="empty-placeholder">Выберите таблицы слева, чтобы добавить их.</p>
                                ) : (
                                    <ul>
                                        {selectedSuperTables.map((table) => {
                                            const tableGroupId = superGroups.length
                                                ? (tableIdToGroupId[table.id] || superGroups[0].id)
                                                : '';
                                            const globalIndex = globalActiveOrderIds.indexOf(table.id);
                                            const isFirstActive = globalIndex <= 0;
                                            const isLastActive = globalIndex === globalActiveOrderIds.length - 1;

                                            return (
                                                <li key={table.id}>
                                                    <span className="title">{table.title}</span>
                                                    {superGroups.length > 0 && (
                                                        <div className="group-select">
                                                            <select
                                                                value={tableGroupId}
                                                                onChange={(event) => handleSuperTableGroupChange(table.id, event.target.value)}
                                                                className="form-select form-select-sm"
                                                            >
                                                                {superGroups.map(group => (
                                                                    <option key={group.id} value={group.id}>
                                                                        {group.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div className="actions">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-light btn-sm"
                                                            onClick={() => moveSuperTable(table.id, 'up')}
                                                            disabled={isFirstActive}
                                                            title="Вверх"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-light btn-sm"
                                                            onClick={() => moveSuperTable(table.id, 'down')}
                                                            disabled={isLastActive}
                                                            title="Вниз"
                                                        >
                                                            ↓
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-light btn-sm"
                                                            onClick={() => toggleSuperTable(table.id)}
                                                            title="Убрать из активных"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="super-manager-footer">
                            <button
                                type="button"
                                className="btn btn-outline-light btn-sm"
                                onClick={resetSuperOrder}
                            >
                                Сбросить порядок
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowSuperManager(false)}
                            >
                                Готово
                            </button>
                        </div>
                    </div>
                </div>
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

export default GrammarTablesGallery;