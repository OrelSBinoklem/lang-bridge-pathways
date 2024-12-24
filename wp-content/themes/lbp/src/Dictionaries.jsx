import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
require('./SpokenTextChecker');

let mode = 'google';
let text = 'yes my friend';

if(document.getElementById('react-app-lang')) {
	const TrainingSpeak = () => {
		const [progressText, setProgressText] = useState('');

		useEffect(() => {

		}, []);

		return (
			<div>
				<h3>{progressText}</h3>
				{/* <Votes /> */}
			</div>
		);
	};
	render(<TrainingSpeak />, document.getElementById(`react-app-dictionary`));
}