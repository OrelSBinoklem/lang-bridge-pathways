import axios from "axios";

const { render, useEffect, useState } = wp.element;
let {SpokenTextChecker} = require('../SpokenTextChecker.js');

const WordCheck = ({ modeRecognition, openaiApiKey, text }) => {
	const [progressText, setProgressText] = useState('');
	const [check, setCheck] = useState(null);

	//todo сделать чтобы двумя сервисами велассь проверка есл юзер введёт опенаитокен "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"
	useEffect(() => {
		(async () => {
			let checker = new SpokenTextChecker(text, 'lv', modeRecognition, openaiApiKey, (recognizedText) => {
				setProgressText(recognizedText);
			});

			setCheck(await checker.checkRun());
		})();
	}, []);

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