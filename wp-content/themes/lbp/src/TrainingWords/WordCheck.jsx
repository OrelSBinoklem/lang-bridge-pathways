import axios from "axios";

const { render, useEffect, useState } = wp.element;
let {SpokenTextChecker} = require('../SpokenTextChecker.js');

const WordCheck = ({ modeRecognition, openaiApiKey, text, lang }) => {
	const [checker, setChecker] = useState(null);
	const [progressText, setProgressText] = useState('');
	const [check, setCheck] = useState(null);

	useEffect(() => {
		(async () => {
			if(checker) {
				checker.stop();
			}

			let checkerLocal = new SpokenTextChecker(text, 'lv', modeRecognition, openaiApiKey, (recognizedText) => {
				setProgressText(recognizedText);
			});

			setChecker(checkerLocal)

			setCheck(await checker.checkRun());
		})();
	}, [modeRecognition, openaiApiKey, text]);

	return (
		<div>
			<h3>{progressText}</h3>
			{check === null && <h2>ожидание!</h2>}
			{check === false && <h2>ошибка!</h2>}
			{check === true && <h2>правильно!</h2>}
		</div>
	);
};

export default WordCheck;