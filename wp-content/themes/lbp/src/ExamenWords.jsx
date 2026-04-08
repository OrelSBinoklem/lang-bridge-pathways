import env from "./env";
import axios from "axios";

const { render, useEffect, useState, useRef } = wp.element;
import useDictionary from './hooks/useDictionary';
import CategoryTree from "./EducationWords/CategoryTree";
import Examen from "./ExamenWords/Examen";

// Найти категорию по id в дереве и вернуть узел и родителя (для хлебных крошек)
const findCategoryInTree = (tree, categoryId, parent = null) => {
	if (!tree || !Array.isArray(tree)) return null;
	const cid = parseInt(categoryId, 10);
	for (const node of tree) {
		if (parseInt(node.id, 10) === cid) return { node, parent };
		if (Array.isArray(node.children) && node.children.length > 0) {
			const found = findCategoryInTree(node.children, categoryId, node);
			if (found) return found;
		}
	}
	return null;
};

const CATEGORY_URL_PARAM = 'category';

/** ID категории из query (?category=) — без перезагрузки страницы */
const readCategoryFromUrl = () => {
	const v = new URLSearchParams(window.location.search).get(CATEGORY_URL_PARAM);
	if (v == null || v === '') return 0;
	const n = parseInt(v, 10);
	return Number.isFinite(n) && n > 0 ? n : 0;
};

const buildUrlWithCategory = (categoryId) => {
	const u = new URL(window.location.href);
	const id = parseInt(categoryId, 10);
	if (Number.isFinite(id) && id > 0) {
		u.searchParams.set(CATEGORY_URL_PARAM, String(id));
	} else {
		u.searchParams.delete(CATEGORY_URL_PARAM);
	}
	return `${u.pathname}${u.search}${u.hash}`;
};

const ExamenWords = ({ dictionaryId, userWordsData = {}, loadingUserData, onRefreshUserData, dictionaryWords = [], loadingDictionaryWords, onRefreshDictionaryWords, categories = [], loadingCategories, onExamenCategoryChange }) => {

	const { dictionary, loading, error } = useDictionary(dictionaryId);

	const [categoryId, setCategoryId] = useState(0);
	const [showExamen, setShowExamen] = useState(false);
	const showExamenRef = useRef(false); // Для доступа к актуальному значению в обработчике popstate
	const categoryIdRef = useRef(0); // Сохраняем categoryId для использования в обработчике popstate
	const initialUrlSyncedRef = useRef(false);

	const stripCategoryFromUrl = () => {
		const next = buildUrlWithCategory(0);
		const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		if (cur !== next) {
			window.history.replaceState({ examenActive: false }, '', next);
		}
	};

	const openExamenWithCategory = (catId) => {
		const id = parseInt(catId, 10);
		categoryIdRef.current = id;
		setCategoryId(id);
		showExamenRef.current = true;
		setShowExamen(true);
		const nextUrl = buildUrlWithCategory(id);
		window.history.pushState({ examenActive: true, categoryId: id }, '', nextUrl);
	};

	const closeExamenToCategories = () => {
		showExamenRef.current = false;
		setShowExamen(false);
		categoryIdRef.current = 0;
		setCategoryId(0);
		stripCategoryFromUrl();
	};

	const handleCategoryClick = (cat) => {
		openExamenWithCategory(cat.id);
	};

	// Синхронизация с URL при «Назад» / «Вперёд» (без location.reload)
	useEffect(() => {
		const handlePopState = () => {
			const cid = readCategoryFromUrl();
			if (cid > 0) {
				categoryIdRef.current = cid;
				showExamenRef.current = true;
				setCategoryId(cid);
				setShowExamen(true);
			} else if (showExamenRef.current || categoryIdRef.current !== 0) {
				categoryIdRef.current = 0;
				showExamenRef.current = false;
				setCategoryId(0);
				setShowExamen(false);
			}
		};

		window.addEventListener('popstate', handlePopState);

		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, []);

	// Первый заход по ссылке с ?category= — открыть тренировку после загрузки дерева
	useEffect(() => {
		if (initialUrlSyncedRef.current) return;
		if (loadingCategories) return;

		const cid = readCategoryFromUrl();
		if (cid <= 0) {
			initialUrlSyncedRef.current = true;
			return;
		}
		if (!categories || categories.length === 0) return;

		const found = findCategoryInTree(categories, cid);
		if (!found) {
			window.history.replaceState({}, '', buildUrlWithCategory(0));
			initialUrlSyncedRef.current = true;
			return;
		}

		initialUrlSyncedRef.current = true;
		categoryIdRef.current = cid;
		showExamenRef.current = true;
		setCategoryId(cid);
		setShowExamen(true);
		window.history.replaceState({ examenActive: true, categoryId: cid }, '', window.location.href);
	}, [categories, loadingCategories]);

	// Клик по заголовку словаря
	useEffect(() => {
		const handleReturnToCategories = () => {
			closeExamenToCategories();
		};

		window.addEventListener('returnToCategories', handleReturnToCategories);

		return () => {
			window.removeEventListener('returnToCategories', handleReturnToCategories);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Синхронизируем refs с state
	useEffect(() => {
		showExamenRef.current = showExamen;
	}, [showExamen]);

	useEffect(() => {
		categoryIdRef.current = categoryId;
	}, [categoryId]);

	// Хлебные крошки категории для заголовка словаря (уровень 1 и текущий уровень 2)
	useEffect(() => {
		if (!onExamenCategoryChange) return;
		if (!showExamen || !categoryId || categoryId === 0) {
			onExamenCategoryChange({ level1Name: '', level2Name: '' });
			return;
		}
		const found = findCategoryInTree(categories, categoryId);
		if (!found) {
			onExamenCategoryChange({ level1Name: '', level2Name: '' });
			return;
		}
		const level1Name = found.parent ? (found.parent.name || '') : '';
		const level2Name = found.node ? (found.node.name || '') : '';
		onExamenCategoryChange({ level1Name, level2Name });
	}, [showExamen, categoryId, categories, onExamenCategoryChange]);

	// Управляем видимостью кнопки в header через класс на body
	useEffect(() => {
		if (showExamen) {
			document.body.classList.add('dictionary-examen-active');
		} else {
			document.body.classList.remove('dictionary-examen-active');
		}
		
		return () => {
			document.body.classList.remove('dictionary-examen-active');
		};
	}, [showExamen]);


	return (
		<div className={'training-words'}>
		{!showExamen && (
			<>
				<CategoryTree
						dictionaryId={dictionaryId} 
						onCategoryClick={handleCategoryClick}
						categories={categories}
						loadingCategories={loadingCategories}
						dictionaryWords={dictionaryWords}
						userWordsData={userWordsData}
					/>
				</>
			)}

	{showExamen && categoryId !== 0 && (
		<div className="training-words-examen-wrapper">
			<Examen 
				dictionary={dictionary} 
				categories={categories}
				categoryId={categoryId}
				dictionaryId={dictionaryId}
				userWordsData={userWordsData}
				onRefreshUserData={onRefreshUserData}
				dictionaryWords={dictionaryWords}
				onRefreshDictionaryWords={onRefreshDictionaryWords}
			/>
		</div>
	)}
		</div>
	);
};

export default ExamenWords;