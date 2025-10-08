import axios from "axios";
import WordCheck from "./WordCheck";

const { render, useEffect, useState } = wp.element;

const Training = ({ categoryId, dictionary }) => {
	const [words, setWords] = useState([]); // Храним дерево категорий
	const [loading, setLoading] = useState(true); // Состояние загрузки
	const [error, setError] = useState(null); // Состояние ошибки

	let modeRecognition = 'google';
	let text = 'laba diena';

	// Функция для запроса данных с бэкенда
	const fetchWords = async () => {
		try {
			setLoading(true);
			const formData = new FormData();
			formData.append("action", "get_words_by_category");
			formData.append("category_id", categoryId);

			const response = await axios.post(window.myajax.url, formData);

			if (response.data.success) {
				setError(null);
				setWords(response.data.data);
			} else {
				throw new Error(response.data.message || "Ошибка получения слов");
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Загружаем категории при монтировании компонента
	useEffect(() => {
		fetchWords();
	}, [categoryId]);

	const renderEducation = () => {
		return (
			<div>
				<ul className='words-education-list'>
					{words.map((word) => (
						<li key={word.id}>
							{word.is_learned ? (
								<>
									<span className="words-education-list__word">{word.word}</span>
									<span className="words-education-list__translation_1">&nbsp;&mdash; {word.translation_1}</span>
									{word.translation_2 && <span className="words-education-list__translation_2">{word.translation_2}</span>}
									{word.translation_3 && <span className="words-education-list__translation_3">{word.translation_3}</span>}
								</>
							) : (
								<>
									<span className="words-education-list__word" style={{color: '#ccc'}}>
										{word.word.split('').map((char, index) => 
											char === ' ' ? ' ' : '█ '
										).join('')}
									</span>
									<span className="words-education-list__translation_1" style={{color: '#ccc'}}>&nbsp;- {word.translation_1.split('').map((char, index) => char === ' ' ? ' ' : '█ ').join('')}</span>
									{word.translation_2 && <span className="words-education-list__translation_2" style={{color: '#ccc'}}>{word.translation_2.split('').map((char, index) => char === ' ' ? ' ' : '█ ').join('')}</span>}
									{word.translation_3 && <span className="words-education-list__translation_3" style={{color: '#ccc'}}>{word.translation_3.split('').map((char, index) => char === ' ' ? ' ' : '█ ').join('')}</span>}
								</>
							)}
						</li>
					))}
					{words.map((word) => (
						<li key={word.id}>
							<>
								<span className="words-education-list__word">{word.word}</span>
								<span className="words-education-list__translation_1">&nbsp;- {word.translation_1}</span>
								{word.translation_2 && <span className="words-education-list__translation_2">{word.translation_2}</span>}
								{word.translation_3 && <span className="words-education-list__translation_3">{word.translation_3}</span>}
							</>
						</li>
					))}
				</ul>


			</div>
		);
	};

	return (
		<div>
			{loading && <p>Загрузка слов...</p>}
			{error && <p style={{ color: "red" }}>Ошибка: {error}</p>}
			{!loading && !error && renderEducation(words)}
		</div>
	);
};

export default Training;