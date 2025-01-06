import env from "./env";
import axios from "axios";

import WordsMatrix from "./WordsMatrix";

const { render, useEffect, useState } = wp.element;
require('./SpokenTextChecker');

let mode = 'google';
let text = 'one two three';

if(document.getElementById('react-app-dictionary')) {

	let dictionaryId = document.getElementById('react-app-dictionary').dataset.id;
	const TrainingSpeak = () => {
		const [progressText, setProgressText] = useState('');

		/*useEffect(() => {
			let checker = new SpokenTextChecker(text, 'en-GB', mode, (recognizedText) => {
				setProgressText(recognizedText);
			});

			checker.checkRun()
		}, []);*/

		return (
			<div>
				<h3>{progressText}</h3>

				<h2>Матрица слов (декорация)</h2>

				<WordsMatrix dictionaryId={dictionaryId} />

			</div>
		);
	};
	render(<TrainingSpeak />, document.getElementById(`react-app-dictionary`));
}