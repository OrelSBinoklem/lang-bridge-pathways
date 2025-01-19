import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
let {SpokenTextChecker} = require('./SpokenTextChecker.js');

const TrainingWords = ({ modeRecognition, text }) => {
	const [progressText, setProgressText] = useState('');
	const [check, setCheck] = useState(null);

	useEffect(() => {
		(async () => {
			let checker = new SpokenTextChecker(text, 'lv', modeRecognition, (recognizedText) => {
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

export default TrainingWords;