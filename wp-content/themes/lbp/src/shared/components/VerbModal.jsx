import React from 'react';

const VerbModal = ({ verbData, onClose }) => {
    console.log('VerbModal: Рендер с данными:', verbData);
    
    if (!verbData) {
        console.log('VerbModal: verbData пустые, не рендерим');
        return null;
    }

    const lemma = verbData.lemma || verbData.latvian || verbData.verb || '';
    const translationRu = verbData.translation?.ru || verbData.russian || '';
    const translationUk = verbData.translation?.uk || verbData.ukrainian || '';
    const className = verbData.className || verbData.class || '';
    const forms = Array.isArray(verbData.forms) ? verbData.forms : [];
    const generatedFormsAvailableFlag = typeof verbData.generatedFormsAvailable === 'boolean'
        ? verbData.generatedFormsAvailable
        : null;
    const hasFullParadigm = forms.length >= 15;
    const shouldShowGeneratedTable = generatedFormsAvailableFlag === null
        ? hasFullParadigm
        : (generatedFormsAvailableFlag && hasFullParadigm);
    const hasPartialForms = !shouldShowGeneratedTable && forms.length > 0;
    const showGeneratedContent = shouldShowGeneratedTable || hasPartialForms;
    const matchedTableNumbers = Array.isArray(verbData.matchedTableNumbers) ? verbData.matchedTableNumbers : [];
    const referenceTable = verbData.referenceTable || null;
    const referenceSource = referenceTable?.source || null;
    const pronouns = ['es', 'tu', '3. pers.', 'mēs', 'jūs'];

    const normalizeClassName = (value) => {
        if (!value) return '';
        if (String(value).toLowerCase() === 'irregular') {
            return 'Izņēmums / Исключение';
        }
        return value;
    };

    const classDisplay = normalizeClassName(className);

    const collapseTenseToRow = (tenseData = {}) => {
        const firstSing = tenseData['1sg'] || '';
        const secondSing = tenseData['2sg'] || '';
        const thirdSing = tenseData['3sg'] || '';
        const firstPl = tenseData['1pl'] || '';
        const secondPl = tenseData['2pl'] || '';
        const thirdPl = tenseData['3pl'] || '';

        let thirdCombined = '';

        if (thirdSing && thirdPl) {
            thirdCombined = thirdSing === thirdPl ? thirdSing : `${thirdSing} / ${thirdPl}`;
        } else if (thirdSing || thirdPl) {
            thirdCombined = thirdSing || thirdPl;
        }

        return [
            firstSing || '—',
            secondSing || '—',
            thirdCombined || '—',
            firstPl || '—',
            secondPl || '—'
        ];
    };

    const tenses = hasFullParadigm
        ? [
            {
                key: 'past',
                label: 'Pagātne',
                values: forms.slice(5, 10)
            },
            {
                key: 'present',
                label: 'Tagadne',
                values: forms.slice(0, 5)
            },
            {
                key: 'future',
                label: 'Nākotne',
                values: forms.slice(10, 15)
            }
        ]
        : [];

    const referenceTenses = referenceSource?.forms
        ? [
            {
                key: 'past',
                label: 'Pagātne',
                values: collapseTenseToRow(referenceSource.forms.past || {})
            },
            {
                key: 'present',
                label: 'Tagadne',
                values: collapseTenseToRow(referenceSource.forms.present || {})
            },
            {
                key: 'future',
                label: 'Nākotne',
                values: collapseTenseToRow(referenceSource.forms.future || {})
            }
        ]
        : [];

    const hasReferenceTable = referenceTenses.some(tense => tense.values.some(value => value && value !== '—'));
    const showReferencePlaceholder = !hasReferenceTable && matchedTableNumbers.length > 0;

    return (
        <div className="verb-image-overlay" onClick={onClose}>
            <div className="verb-image-content" onClick={(e) => e.stopPropagation()}>
                <button className="verb-close-btn" onClick={onClose}>
                    &times;
                </button>

                <div className="verb-modal-header">
                    <div className="verb-info-line">
                        <span className="verb-lemma-text">{lemma || '—'}</span>
                        {classDisplay && (
                            <span className="verb-class-chip">
                                {classDisplay}
                            </span>
                        )}
                        <span className="verb-translation-inline">
                            <span className="verb-trans-label">RU:</span>
                            <span className="verb-trans-value">{translationRu || '—'}</span>
                        </span>
                        <span className="verb-translation-inline">
                            <span className="verb-trans-label">UK:</span>
                            <span className="verb-trans-value">{translationUk || '—'}</span>
                        </span>
                    </div>
                </div>

                <div className={`verb-modal-body ${(hasReferenceTable || showReferencePlaceholder) && showGeneratedContent ? 'with-reference' : ''}`}>
                    {showGeneratedContent && (
                        <div className="verb-table-wrapper">
                            <div className="verb-table-title">Спряжения глагола (робот)</div>
                            {shouldShowGeneratedTable ? (
                                <table className="verb-forms-table">
                                    <thead>
                                        <tr>
                                            <th>Personas</th>
                                            {tenses.map(tense => (
                                                <th key={tense.key}>{tense.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pronouns.map((pronoun, rowIndex) => (
                                            <tr key={pronoun}>
                                                <td className="verb-form-pronoun">{pronoun}</td>
                                                {tenses.map(tense => (
                                                    <td key={`${tense.key}-${rowIndex}`} className="verb-form-value">
                                                        {tense.values[rowIndex] || '—'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="verb-forms-grid">
                                    {forms.map((form, index) => (
                                        <div key={index} className="verb-form-cell">
                                            <span className="verb-form-index">{index + 1}.</span>
                                            <span className="verb-form-text">{form}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {hasReferenceTable && (
                        <div className="verb-table-wrapper reference">
                            <div className="verb-table-title">
                                Общая таблица соответствующая глаголу {referenceSource?.infinitive ? <strong>"{referenceSource.infinitive}"</strong> : ''} (справочник)
                                {/*Etalona tabula{referenceTable?.tableNumber ? ` Nr. ${referenceTable.tableNumber}` : ''}*/}
                            </div>
                            <table className="verb-forms-table">
                                <thead>
                                    <tr>
                                        <th>Personas</th>
                                        {referenceTenses.map(tense => (
                                            <th key={`ref-${tense.key}`}>{tense.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pronouns.map((pronoun, rowIndex) => (
                                        <tr key={`ref-${pronoun}`}>
                                            <td className="verb-form-pronoun">{pronoun}</td>
                                            {referenceTenses.map(tense => (
                                                <td key={`ref-${tense.key}-${rowIndex}`} className="verb-form-value">
                                                    {tense.values[rowIndex] || '—'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showReferencePlaceholder && !hasReferenceTable && (
                        <div className="verb-table-wrapper reference">
                            <div className="verb-table-title">
                                Etalona tabula
                            </div>
                            <div className="verb-reference-missing">
                                Dati tabulai Nr. {matchedTableNumbers.join(', ')} nav atrasti failā latvian_verb_tables_15forms.json.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerbModal;

