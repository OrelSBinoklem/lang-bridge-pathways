import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import EducationWords from "./EducationWords";
import TrainingWords from "./TrainingWords";
import WordsMatrix from "./WordsMatrix";

let modeRecognition = 'google';
let text = 'chicken yellow';

if(document.getElementById('react-app-dictionary')) {
	let dictionaryId = document.getElementById('react-app-dictionary').dataset.id;
	const Dictionary = () => {
		const [mode, setMode] = useState(null);

		useEffect(() => {

		}, []);

		return (
			<div>
				{mode === null&& (
					<>
						<button onClick={() => setMode('education-words')} className={'mode-button'}>Education Words</button>
						<button onClick={() => setMode('training-words')} className={'mode-button green'}>Training Words</button>
					</>
				)}
				{mode !== null&&
					<div className={'words-education-window'}>
						{
							mode === 'education-words'&&
							<EducationWords />
						}
						{
							mode === 'training-words'&&
							<TrainingWords modeRecognition={modeRecognition} text={text} />
						}
						<button onClick={() => setMode(null)} type={"button"} className={'words-education-window__close'}>×</button>
					</div>
				}
				<h2>Матрица слов (декорация)</h2>
				<WordsMatrix dictionaryId={dictionaryId} />
			</div>
		);
	};
	render(<Dictionary />, document.getElementById(`react-app-dictionary`));
}