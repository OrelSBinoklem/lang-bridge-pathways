import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import CategoryTree from "./EducationWords/CategoryTree";
import Education from "./EducationWords/Education";

const EducationWords = ({ dictionaryId, mode, onChangeMode }) => {
	const [categoryId, setCategoryId] = useState(0);

	useEffect(() => {

	}, []);

	return (
		<div>
			<h3 style={{ display: mode === null ? "block" : "none" }}>Выбери категорию</h3>
			<div style={{ display: mode === null ? "block" : "none" }}>
				<CategoryTree dictionaryId={dictionaryId} onCategoryClick={(cat) => {onChangeMode('education'); setCategoryId(cat.id);}} />
			</div>

			<h2 style={{ display: mode === 'education' ? "block" : "none" }}>Учим слова</h2>
			{
				mode === 'education'&&
				<Education categoryId={categoryId} />
			}
			<button onClick={() => onChangeMode(null)} type={"button"} className={'words-education-window__close'} style={{ display: mode === 'education' ? "block" : "none" }}>×</button>
		</div>
	);
};

export default EducationWords;