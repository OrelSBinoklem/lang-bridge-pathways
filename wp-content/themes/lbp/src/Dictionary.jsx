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

		const handlePopState = (event) => {
			let { mode = null, modeEducation = null, modeTraining = null } = event.state || {};
			setMode(mode);
			setModeEducation(modeEducation);
			setModeTraining(modeTraining);
		};

		useEffect(() => {
			window.addEventListener('popstate', handlePopState);
			// Очистка: удаляем обработчик и возвращаем историю в исходное состояние
			return () => {
				window.removeEventListener('popstate', handlePopState);
			};
		}, []);

		useEffect(() => {
			let state = window.history.state || {};
			if (mode !== (state?.mode??null) || modeEducation !== (state?.modeEducation??null) || modeTraining !== (state?.modeTraining??null)) {
				window.history.pushState({ mode, modeEducation, modeTraining }, '');
			}
		}, [mode, modeEducation, modeTraining]);

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
						<button onClick={() => setMode('education-words')} className={'mode-button'}>Изучение</button>
						<button onClick={() => setMode('training-words')} className={'mode-button green'}>Экзамен</button>
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