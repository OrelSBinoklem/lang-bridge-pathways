import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import useDictionary from './hooks/useDictionary';
import CategoryTree from "./EducationWords/CategoryTree";
import Examen from "./ExamenWords/Examen";

const ExamenWords = ({ dictionaryId, userWordsData = {}, loadingUserData, onRefreshUserData, dictionaryWords = [], loadingDictionaryWords, onRefreshDictionaryWords, categories = [], loadingCategories }) => {

	const { dictionary, loading, error } = useDictionary(dictionaryId);

	const [categoryId, setCategoryId] = useState(0);
	const [showExamen, setShowExamen] = useState(false);

	const handleCategoryClick = (cat) => {
		setCategoryId(cat.id);
		setShowExamen(true);
	};

	const handleBackToCategories = () => {
		setShowExamen(false);
		setCategoryId(0);
	};

	return (
		<div className={'training-words'}>
			{!showExamen && (
				<>
					<h3>Выбери категорию</h3>
					<CategoryTree 
						dictionaryId={dictionaryId} 
						onCategoryClick={handleCategoryClick}
						categories={categories}
						loadingCategories={loadingCategories}
					/>
				</>
			)}

		{showExamen && categoryId > 0 && (
			<>
				<Examen 
					dictionary={dictionary} 
					categoryId={categoryId}
					dictionaryId={dictionaryId}
					userWordsData={userWordsData}
					onRefreshUserData={onRefreshUserData}
					dictionaryWords={dictionaryWords}
					onRefreshDictionaryWords={onRefreshDictionaryWords}
				/>
				<button onClick={handleBackToCategories} type={"button"} className={'words-education-window__close'}>×</button>
			</>
		)}
		</div>
	);
};

export default ExamenWords;