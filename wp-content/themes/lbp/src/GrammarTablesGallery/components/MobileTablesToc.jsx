import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { tableTitles, tableMenuLabels } from '../data/tablesData';
import defaultTablesData from '../data/tablesData';

/**
 * Кнопка-полукруг справа по центру вертикали и супер-меню с якорями на таблицы.
 * Только на мобильных (< 768px) при режиме «Вертикальный».
 */
const MobileTablesToc = ({
    viewMode,
    tablesData = defaultTablesData,
    tableTitlesMap = tableTitles,
    tableMenuLabelsMap = tableMenuLabels
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const show = isMobile && viewMode === 'vertical';
    const allTables = [].concat(
        tablesData.group1 || [],
        tablesData.group2 || [],
        tablesData.group3 || []
    );

    const handleLinkClick = (e, id) => {
        e.preventDefault();
        const el = document.getElementById(`table-${id}`);
        if (el) {
            const prevHtml = document.documentElement.style.scrollBehavior;
            const prevBody = document.body.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.scrollBehavior = 'auto';
            const y = el.getBoundingClientRect().top + (window.scrollY ?? window.pageYOffset);
            window.scrollTo(0, y);
            document.documentElement.style.scrollBehavior = prevHtml;
            document.body.style.scrollBehavior = prevBody;
        }
        setOpen(false);
    };

    if (!show) return null;

    const list = (
        <ul className="mobile-toc-list">
            {allTables.map((t) => {
                const id = String(t.id);
                const label = tableMenuLabelsMap[id] ?? tableTitlesMap[id] ?? t.title ?? t.alt ?? `Таблица ${id}`;
                return (
                    <li key={id}>
                        <a
                            href={`#table-${id}`}
                            className="mobile-toc-link"
                            onClick={(e) => handleLinkClick(e, id)}
                        >
                            {label}
                        </a>
                    </li>
                );
            })}
        </ul>
    );

    const overlay = open && createPortal(
        <div
            className="mobile-toc-overlay"
            onClick={() => setOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Закрыть меню"
        >
            <div
                className="mobile-toc-drawer"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mobile-toc-header">
                    <h3 className="mobile-toc-title">Таблицы</h3>
                    <button
                        type="button"
                        className="mobile-toc-close"
                        onClick={() => setOpen(false)}
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                </div>
                <div className="mobile-toc-body">
                    {list}
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <>
            <button
                type="button"
                className="mobile-toc-fab"
                onClick={() => setOpen(true)}
                aria-label="Открыть меню таблиц"
                title="Меню таблиц"
            >
                <span className="mobile-toc-fab-icon">≡</span>
            </button>
            {overlay}
        </>
    );
};

export default MobileTablesToc;
