import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import useDictionary from './hooks/useDictionary';
import CategoryTree from "./EducationWords/CategoryTree";
import Training from "./TrainingWords/Training";

const TrainingWords = ({ dictionaryId, mode, onChangeMode }) => {

	const { dictionary, loading, error } = useDictionary(dictionaryId);

	/*if (loading) return <p>Загрузка словаря...</p>;
	if (error) return <p style={{ color: 'red' }}>Ошибка: {error}</p>;*/

	const [categoryId, setCategoryId] = useState(0);

	useEffect(() => {

	}, []);

	return (
		<div>
			<p>{ dictionary?.lang ?? 'lang' }</p>
			<p>{ dictionary?.learn_lang ?? 'learn_lang' }</p>
			<h3 style={{ display: mode === null ? "block" : "none" }}>Выбери категорию</h3>
			<div style={{ display: mode === null ? "block" : "none" }}>
				<CategoryTree dictionaryId={dictionaryId} onCategoryClick={(cat) => {onChangeMode('training'); setCategoryId(cat.id);}} />
			</div>

			<h2 style={{ display: mode === 'training' ? "block" : "none" }}>Проверяем слова</h2>
			{
				mode === 'training'&&
				<Training dictionary={dictionary} categoryId={categoryId} />
			}
			<button onClick={() => onChangeMode(null)} type={"button"} className={'words-education-window__close'} style={{ display: mode === 'training' ? "block" : "none" }}>×</button>
		</div>
	);
};

export default TrainingWords;