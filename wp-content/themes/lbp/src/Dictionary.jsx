import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import EducationWords from "./EducationWords";
import TrainingWords from "./TrainingWords";
import WordsMatrix from "./WordsMatrix";
import CategoryTree from "./EducationWords/CategoryTree";

if(document.getElementById('react-app-dictionary')) {
	let dictionaryId = document.getElementById('react-app-dictionary').dataset.id;
	const Dictionary = () => {
		const [mode, setMode] = useState(null);
		const [modeEducation, setModeEducation] = useState(null);
		const [modeTraining, setModeTraining] = useState(null);

		const onChangeModeEducation = (mode) => {
			setModeEducation(mode);
		}
		const onChangeModeTraining = (mode) => {
			setModeTraining(mode);
		}

		useEffect(() => {

		}, []);

		const onCloseCurrentWindow = () => {
			if(modeTraining !== null) {
				setModeTraining(null);
			} else if(modeEducation !== null) {
				setModeEducation(null);
			} else {
				setMode(null);
			}
		}

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
							<EducationWords dictionaryId={dictionaryId} mode={modeEducation} onChangeMode={onChangeModeEducation} />
						}
						{
							mode === 'training-words'&&
							<TrainingWords dictionaryId={dictionaryId} mode={modeTraining} onChangeMode={onChangeModeTraining} />
						}
						<button onClick={onCloseCurrentWindow} type={"button"} className={'words-education-window__close'}>×</button>
					</div>
				}

				<div style={{ display: mode === null ? "block" : "none" }}>
					<h2>Матрица слов (декорация)</h2>
					<WordsMatrix dictionaryId={dictionaryId} />
				</div>
			</div>
		);
	};
	render(<Dictionary />, document.getElementById(`react-app-dictionary`));
}