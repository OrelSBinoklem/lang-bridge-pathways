import env from "./env";
import axios from "axios";

const { render, useEffect, useState, useRef } = wp.element;
import useDictionary from './hooks/useDictionary';
import CategoryTree from "./EducationWords/CategoryTree";
import Examen from "./ExamenWords/Examen";

const ExamenWords = ({ dictionaryId, userWordsData = {}, loadingUserData, onRefreshUserData, dictionaryWords = [], loadingDictionaryWords, onRefreshDictionaryWords, categories = [], loadingCategories }) => {

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

	// Синхронизируем refs с state
	useEffect(() => {
		showExamenRef.current = showExamen;
	}, [showExamen]);

	useEffect(() => {
		categoryIdRef.current = categoryId;
	}, [categoryId]);

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
					/>
				</>
			)}

	{showExamen && categoryId !== 0 && (
		<div className="training-words-examen-wrapper">
			<Examen 
				dictionary={dictionary} 
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