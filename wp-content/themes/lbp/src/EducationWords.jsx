import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import CategoryTree from "./EducationWords/CategoryTree";
import Education from "./EducationWords/Education";

const EducationWords = ({ dictionaryId, mode, onChangeMode, userWordsData = {}, onRefreshUserData, dictionaryWords = [], loadingDictionaryWords, onRefreshDictionaryWords, categories = [], loadingCategories }) => {
	const [categoryId, setCategoryId] = useState(0);

	useEffect(() => {

	}, []);

	return (
		<div className={'training-words'}>
			<h3 style={{ display: mode === null ? "block" : "none" }}>Выбери категорию</h3>
			<div style={{ display: mode === null ? "block" : "none" }}>
				<CategoryTree 
					dictionaryId={dictionaryId} 
					onCategoryClick={(cat) => {onChangeMode('education'); setCategoryId(cat.id);}}
					categories={categories}
					loadingCategories={loadingCategories}
				/>
			</div>

			<h2 style={{ display: mode === 'education' ? "block" : "none" }}>Учим слова</h2>
			{
				mode === 'education'&&
				<Education 
					categoryId={categoryId} 
					dictionaryId={dictionaryId} 
					userWordsData={userWordsData}
					onRefreshUserData={onRefreshUserData}
					dictionaryWords={dictionaryWords}
					onRefreshDictionaryWords={onRefreshDictionaryWords}
				/>
			}
			<button onClick={() => onChangeMode(null)} type={"button"} className={'words-education-window__close'} style={{ display: mode === 'education' ? "block" : "none" }}>×</button>
		</div>
	);
};

export default EducationWords;