import React, { useState, useEffect } from 'react';
import VerbSearch from './VerbSearch';
import VerbModal from './VerbModal';

const normalizeLatvian = (text = '') =>
    String(text)
        .replace(/[āĀ]/g, 'a').replace(/[ēĒ]/g, 'e').replace(/[īĪ]/g, 'i').replace(/[ūŪ]/g, 'u')
        .replace(/[ļĻ]/g, 'l').replace(/[ņŅ]/g, 'n').replace(/[ģĢ]/g, 'g').replace(/[ķĶ]/g, 'k')
        .replace(/[šŠ]/g, 's').replace(/[čČ]/g, 'c').replace(/[žŽ]/g, 'z');

/**
 * Поиск глагола + модалка с деталями. Общий компонент для использования везде.
 */
const VerbSearchWithModal = () => {
    const [verbModalData, setVerbModalData] = useState(null);
    const [verbFormsLookup, setVerbFormsLookup] = useState({ byLemma: {}, byNormalized: {} });
    const [verbTableLookup, setVerbTableLookup] = useState({ byLemma: {}, byNormalized: {} });
    const [referenceVerbTables, setReferenceVerbTables] = useState({ list: [], byNumber: {} });

    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/verbs.15cells.tr_gpt5.json')
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                const byLemma = {};
                const byNormalized = {};
                data.forEach(item => {
                    if (!item?.lemma) return;
                    const lower = String(item.lemma).trim().toLowerCase();
                    if (!lower) return;
                    byLemma[lower] = item;
                    const norm = normalizeLatvian(lower);
                    if (norm && !byNormalized[norm]) byNormalized[norm] = item;
                });
                setVerbFormsLookup({ byLemma, byNormalized });
            })
            .catch(() => setVerbFormsLookup({ byLemma: {}, byNormalized: {} }));
    }, []);

    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/darbs.json')
            .then(r => r.json())
            .then(data => {
                if (!data || typeof data !== 'object' || Array.isArray(data)) return;
                const byLemma = {};
                const byNormalized = {};
                const add = (c, k, v) => {
                    if (!k) return;
                    if (!c[k]) c[k] = [v];
                    else if (!c[k].includes(v)) c[k].push(v);
                };
                Object.entries(data).forEach(([tableId, verbs]) => {
                    const tn = parseInt(tableId, 10);
                    if (!Number.isFinite(tn) || !Array.isArray(verbs)) return;
                    verbs.forEach(v => {
                        const lower = String(v || '').trim().toLowerCase();
                        if (!lower) return;
                        add(byLemma, lower, tn);
                        const norm = normalizeLatvian(lower);
                        if (norm) add(byNormalized, norm, tn);
                    });
                });
                setVerbTableLookup({ byLemma, byNormalized });
            })
            .catch(() => setVerbTableLookup({ byLemma: {}, byNormalized: {} }));
    }, []);

    useEffect(() => {
        fetch('/wp-content/themes/lbp/assets/images/latvian_verb_tables_15forms.json')
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                const byNumber = {};
                data.forEach(item => {
                    if (!item) return;
                    const k = item.table_number ?? item.tableNumber;
                    if (k != null) byNumber[String(k)] = item;
                });
                setReferenceVerbTables({ list: data, byNumber });
            })
            .catch(() => setReferenceVerbTables({ list: [], byNumber: {} }));
    }, []);

    const buildModalPayload = (suggestion) => {
        const lemma = (suggestion.lemma || suggestion.latvian || '').trim();
        const lemmaLower = lemma.toLowerCase();
        let formsSource = verbFormsLookup.byLemma?.[lemmaLower]
            || verbFormsLookup.byNormalized?.[normalizeLatvian(lemmaLower)];
        const forms = Array.isArray(formsSource?.forms) ? formsSource.forms.slice(0, 15) : [];
        const payload = {
            lemma,
            translation: {
                ru: suggestion.translationRu || suggestion.russian || '',
                uk: suggestion.translationUk || suggestion.ukrainian || ''
            },
            className: formsSource?.class || suggestion.className || '',
            forms,
            generatedFormsAvailable: forms.length >= 15
        };

        const matched = new Set();
        if (lemmaLower) {
            (verbTableLookup.byLemma?.[lemmaLower] || []).forEach(n => Number.isFinite(n) && matched.add(n));
            const norm = normalizeLatvian(lemmaLower);
            if (norm) (verbTableLookup.byNormalized?.[norm] || []).forEach(n => Number.isFinite(n) && matched.add(n));
        }
        (suggestion.tableNumbers || []).forEach(n => Number.isFinite(n) && matched.add(n));
        payload.matchedTableNumbers = [...matched].sort((a, b) => a - b);

        for (const tn of payload.matchedTableNumbers) {
            const entry = referenceVerbTables.byNumber?.[String(tn)];
            if (entry) {
                payload.referenceTable = { tableNumber: tn, source: entry };
                break;
            }
        }
        return payload;
    };

    const onVerbSelect = (p) => {
        if (!p?.lemma && !p?.latvian) return;
        const suggestion = {
            lemma: p.lemma || p.latvian,
            translationRu: p.translationRu || p.russian,
            translationUk: p.translationUk || p.ukrainian,
            tableNumbers: p.tableNumbers
        };
        setVerbModalData(buildModalPayload(suggestion));
    };

    return (
        <>
            <div className="grammar-tables-header-controls">
                <VerbSearch onVerbSelect={onVerbSelect} />
            </div>
            <VerbModal verbData={verbModalData} onClose={() => setVerbModalData(null)} />
        </>
    );
};

export default VerbSearchWithModal;
