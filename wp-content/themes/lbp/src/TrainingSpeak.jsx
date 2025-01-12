import env from "./env";
import axios from "axios";

import WordsMatrix from "./WordsMatrix";

const { render, useEffect, useState } = wp.element;
let {SpokenTextChecker} = require('./SpokenTextChecker.js');

let mode = 'google';
let text = 'chicken yellow';

if(document.getElementById('react-app-dictionary')) {

	let dictionaryId = document.getElementById('react-app-dictionary').dataset.id;
	const TrainingSpeak = () => {
		const [progressText, setProgressText] = useState('');
		const [check, setCheck] = useState(null);

		useEffect(async () => {
			let checker = new SpokenTextChecker(text, 'lv', mode, (recognizedText) => {
				setProgressText(recognizedText);
			});

			setCheck(await checker.checkRun());
		}, []);

		return (
			<div>
				<h3>{progressText}</h3>
				{check === null && <h2>ожидание!</h2>}
				{check === false && <h2>ошибка!</h2>}
				{check === true && <h2>правильно!</h2>}

				<h2>Матрица слов (декорация)</h2>

				<WordsMatrix dictionaryId={dictionaryId} />

			</div>
		);
	};
	render(<TrainingSpeak />, document.getElementById(`react-app-dictionary`));
}
