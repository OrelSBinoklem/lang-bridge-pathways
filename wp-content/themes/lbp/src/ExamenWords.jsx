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

const ExamenWords = ({ dictionaryId, userWordsData = {}, loadingUserData, onRefreshUserData, dictionaryWords = [], loadingDictionaryWords, onRefreshDictionaryWords, categories = [], loadingCategories, onExamenCategoryChange }) => {

	const { dictionary, loading, error } = useDictionary(dictionaryId);

	const [categoryId, setCategoryId] = useState(0);
	const [showExamen, setShowExamen] = useState(false);
	const showExamenRef = useRef(false); // Для доступа к актуальному значению в обработчике popstate
	const categoryIdRef = useRef(0); // Сохраняем categoryId для использования в обработчике popstate

	const handleCategoryClick = (cat) => {
		categoryIdRef.current = cat.id;
		setCategoryId(cat.id);
		showExamenRef.current = true;
		setShowExamen(true);
		// Добавляем запись в историю браузера при начале тренировки
		window.history.pushState({ examenActive: true, categoryId: cat.id }, '', window.location.href);
	};

	const handleBackToCategories = () => {
		showExamenRef.current = false;
		setShowExamen(false);
		categoryIdRef.current = 0;
		setCategoryId(0);
	};

	// Обработка кнопки "Назад" и "Вперед" браузера
	useEffect(() => {
		const handlePopState = (event) => {
			if (event.state && event.state.examenActive) {
				// Возвращаемся вперед к тренировке
				const savedCategoryId = event.state.categoryId || 0;
				categoryIdRef.current = savedCategoryId;
				showExamenRef.current = true;
				setCategoryId(savedCategoryId);
				setShowExamen(true);
			} else {
				// Возвращаемся назад к категориям
				// Используем ref для проверки актуального состояния
				if (showExamenRef.current || categoryIdRef.current !== 0) {
					categoryIdRef.current = 0;
					showExamenRef.current = false;
					setCategoryId(0);
					setShowExamen(false);
				}
			}
		};

		window.addEventListener('popstate', handlePopState);
		
		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, []); // Пустой массив зависимостей, используем refs

	// Обработка клика по заголовку - возврат к категориям
	useEffect(() => {
		const handleReturnToCategories = () => {
			// Сбрасываем состояние тренировки
			showExamenRef.current = false;
			setShowExamen(false);
			categoryIdRef.current = 0;
			setCategoryId(0);
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