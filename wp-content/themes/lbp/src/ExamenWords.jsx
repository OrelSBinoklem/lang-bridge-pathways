import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import useDictionary from './hooks/useDictionary';
import CategoryTree from "./EducationWords/CategoryTree";
import Examen from "./ExamenWords/Examen";

const ExamenWords = ({ dictionaryId, mode, onChangeMode, userWordsData = {}, loadingUserData, onRefreshUserData, dictionaryWords = [], loadingDictionaryWords, onRefreshDictionaryWords, categories = [], loadingCategories }) => {

	const { dictionary, loading, error } = useDictionary(dictionaryId);

	/*if (loading) return <p>Загрузка словаря...</p>;
	if (error) return <p style={{ color: 'red' }}>Ошибка: {error}</p>;*/

	const [categoryId, setCategoryId] = useState(0);

	useEffect(() => {

	}, []);

	return (
		<div className={'training-words'}>
			{/*<p>{ dictionary?.lang ?? 'lang' }</p>
			<p>{ dictionary?.learn_lang ?? 'learn_lang' }</p>*/}
			<h3 style={{ display: mode === null ? "block" : "none" }}>Выбери категорию</h3>
			<div style={{ display: mode === null ? "block" : "none" }}>
				<CategoryTree 
					dictionaryId={dictionaryId} 
					onCategoryClick={(cat) => {onChangeMode('training'); setCategoryId(cat.id);}}
					categories={categories}
					loadingCategories={loadingCategories}
				/>
			</div>

			<h2 style={{ display: mode === 'training' ? "block" : "none" }}>Проверяем слова</h2>
			{
				mode === 'training'&&
				<Examen 
					dictionary={dictionary} 
					categoryId={categoryId}
					dictionaryId={dictionaryId}
					userWordsData={userWordsData}
					onRefreshUserData={onRefreshUserData}
					dictionaryWords={dictionaryWords}
					onRefreshDictionaryWords={onRefreshDictionaryWords}
				/>
			}
			<button onClick={() => onChangeMode(null)} type={"button"} className={'words-education-window__close'} style={{ display: mode === 'training' ? "block" : "none" }}>×</button>
		</div>
	);
};

export default ExamenWords;