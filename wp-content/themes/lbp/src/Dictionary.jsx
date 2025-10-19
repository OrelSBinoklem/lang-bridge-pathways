import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import EducationWords from "./EducationWords";
import ExamenWords from "./ExamenWords";
import WordsMatrix from "./WordsMatrix";
import CategoryTree from "./EducationWords/CategoryTree";
import DictionaryCategoryManagement from "./custom/components/DictionaryCategoryManagement";

if(document.getElementById('react-app-dictionary')) {
	let dictionaryId = document.getElementById('react-app-dictionary').dataset.id;
	console.log('Dictionary ID:', dictionaryId);
	const Dictionary = () => {
		const [mode, setMode] = useState(null);
		const [modeEducation, setModeEducation] = useState(null);
		const [modeTraining, setModeTraining] = useState(null);
		const [userWordsData, setUserWordsData] = useState({});
		const [loadingUserData, setLoadingUserData] = useState(false);
		const [dictionaryWords, setDictionaryWords] = useState([]);
		const [loadingDictionaryWords, setLoadingDictionaryWords] = useState(false);
		const [categories, setCategories] = useState([]);
		const [loadingCategories, setLoadingCategories] = useState(false);
		const [showCategoryManagement, setShowCategoryManagement] = useState(false);
		const [dictionaryInfo, setDictionaryInfo] = useState(null);
		const [loadingDictionaryInfo, setLoadingDictionaryInfo] = useState(false);

		const onChangeModeEducation = (mode) => {
			setModeEducation(mode);
		}
		const onChangeModeTraining = (mode) => {
			setModeTraining(mode);
		}

		// Функция для загрузки данных пользователя из user_dict_words
		const fetchUserWordsData = async () => {
			if (!window.myajax || !window.myajax.is_logged_in) {
				return; // Не загружаем данные для неавторизованных пользователей
			}

			try {
				setLoadingUserData(true);
				const formData = new FormData();
				formData.append("action", "get_user_dict_words");
				formData.append("dictionary_id", dictionaryId);

				const response = await axios.post(window.myajax.url, formData);

				if (response.data.success) {
					setUserWordsData(response.data.data);
				} else {
					console.error('Ошибка загрузки данных пользователя:', response.data.message);
				}
			} catch (error) {
				console.error('Ошибка при загрузке данных пользователя:', error);
			} finally {
				setLoadingUserData(false);
			}
		}

		// Функция для загрузки информации о словаре
		const fetchDictionaryInfo = async () => {
			try {
				setLoadingDictionaryInfo(true);
				const formData = new FormData();
				formData.append("action", "get_dictionary");
				formData.append("dictionary_id", dictionaryId);

				const response = await axios.post(window.myajax.url, formData);

				if (response.data.success) {
					console.log('Dictionary info loaded:', response.data.data);
					setDictionaryInfo(response.data.data);
				} else {
					console.error('Ошибка загрузки информации о словаре:', response.data.message);
				}
			} catch (error) {
				console.error('Ошибка при загрузке информации о словаре:', error);
			} finally {
				setLoadingDictionaryInfo(false);
			}
		}

		// Функция для загрузки слов словаря
		const fetchDictionaryWords = async () => {
			try {
				setLoadingDictionaryWords(true);
				const formData = new FormData();
				formData.append("action", "get_dictionary_words");
				formData.append("dictionary_id", dictionaryId);

				const response = await axios.post(window.myajax.url, formData);

				if (response.data.success) {
					setDictionaryWords(response.data.data);
				} else {
					console.error('Ошибка загрузки слов словаря:', response.data.message);
				}
			} catch (error) {
				console.error('Ошибка при загрузке слов словаря:', error);
			} finally {
				setLoadingDictionaryWords(false);
			}
		}

		// Функция для обновления слов словаря (аналог fetchDictionaryWords, но без setLoading)
		const refreshDictionaryWords = async () => {
			try {
				const formData = new FormData();
				formData.append("action", "get_dictionary_words");
				formData.append("dictionary_id", dictionaryId);

				const response = await axios.post(window.myajax.url, formData);

				if (response.data.success) {
					setDictionaryWords(response.data.data);
				} else {
					console.error('Ошибка обновления слов словаря:', response.data.message);
				}
			} catch (error) {
				console.error('Ошибка при обновлении слов словаря:', error);
			}
		}

		// Функция для обновления категорий после изменений
		const refreshCategories = async () => {
			try {
				const formData = new FormData();
				formData.append("action", "get_category_tree");
				formData.append("dictionary_id", dictionaryId);

				const response = await axios.post(window.myajax.url, formData);

				if (response.data.success) {
					let processedCategories = response.data.data;
					if (!processedCategories.some(item => Array.isArray(item.children) && item.children.length > 0)) {
						processedCategories = [{
							"id": 0,
							"name": "Категории",
							"parent_id": null,
							children: processedCategories
						}];
					}
					setCategories(processedCategories);
				} else {
					console.error('Ошибка обновления категорий:', response.data.message);
				}
			} catch (error) {
				console.error('Ошибка при обновлении категорий:', error);
			}
		}

		// Функция для загрузки категорий
		const fetchCategories = async () => {
			try {
				setLoadingCategories(true);
				const formData = new FormData();
				formData.append("action", "get_category_tree");
				formData.append("dictionary_id", dictionaryId);

				const response = await axios.post(window.myajax.url, formData);

				if (response.data.success) {
					let processedCategories = response.data.data;
					if (!processedCategories.some(item => Array.isArray(item.children) && item.children.length > 0)) {
						processedCategories = [{
							"id": 0,
							"name": "Категории",
							"parent_id": null,
							children: processedCategories
						}];
					}
					setCategories(processedCategories);
				} else {
					console.error('Ошибка загрузки категорий:', response.data.message);
				}
			} catch (error) {
				console.error('Ошибка при загрузке категорий:', error);
			} finally {
				setLoadingCategories(false);
			}
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

		// Загружаем все данные при монтировании компонента
		useEffect(() => {
			fetchDictionaryInfo();
			fetchDictionaryWords();
			fetchCategories();
			fetchUserWordsData();
		}, [dictionaryId]);

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
				{/* Заголовок словаря */}
				{dictionaryInfo && (
					<div className="dictionary-info">
						<h1 className="dictionary-title">
							{dictionaryInfo.name || 'Словарь'}
							<span className="words-count"> ({dictionaryInfo.words} слов)</span>
						</h1>
					</div>
				)}
				
				{mode === null && (
					<div className="mode-buttons-container">
						<button onClick={() => setMode('education-words')} className={'mode-button'}>Изучение</button>
						<button onClick={() => setMode('training-words')} className={'mode-button green'}>Экзамен</button>
					{window.myajax && window.myajax.is_admin && (
						<button 
							onClick={() => setShowCategoryManagement(!showCategoryManagement)} 
							className={'mode-button admin'}
						>
							{showCategoryManagement ? 'Скрыть управление' : 'Управление категориями'}
						</button>
					)}
					</div>
				)}
				
				{showCategoryManagement && (
					<div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
						<DictionaryCategoryManagement 
							dictionaryId={dictionaryId}
							onCategoriesChange={refreshCategories}
						/>
					</div>
				)}
				{mode !== null&&
					<div className={'words-education-window'}>
						{
							mode === 'education-words'&&
							<EducationWords 
								dictionaryId={dictionaryId} 
								mode={modeEducation} 
								onChangeMode={onChangeModeEducation}
								userWordsData={userWordsData}
								loadingUserData={loadingUserData}
								onRefreshUserData={fetchUserWordsData}
								dictionaryWords={dictionaryWords}
								loadingDictionaryWords={loadingDictionaryWords}
								onRefreshDictionaryWords={refreshDictionaryWords}
								categories={categories}
								loadingCategories={loadingCategories}
							/>
						}
						{
							mode === 'training-words'&&
							<ExamenWords 
								dictionaryId={dictionaryId} 
								mode={modeTraining} 
								onChangeMode={onChangeModeTraining}
								userWordsData={userWordsData}
								loadingUserData={loadingUserData}
								onRefreshUserData={fetchUserWordsData}
								dictionaryWords={dictionaryWords}
								loadingDictionaryWords={loadingDictionaryWords}
								onRefreshDictionaryWords={refreshDictionaryWords}
								categories={categories}
								loadingCategories={loadingCategories}
							/>
						}
						<button onClick={onCloseCurrentWindow} type={"button"} className={'words-education-window__close'}>×</button>
					</div>
				}

				<div style={{ visibility: mode === null ? "visible" : "hidden", position: mode === null ? "static" : "absolute", top: mode === null ? "auto" : "-9999px" }}>
					<h2 className="words-matrix-title">Матрица слов (декорация)</h2>
					<WordsMatrix 
						dictionaryId={dictionaryId} 
						userWordsData={userWordsData}
						loadingUserData={loadingUserData}
						dictionaryWords={dictionaryWords}
						loadingDictionaryWords={loadingDictionaryWords}
					/>
				</div>
			</div>
		);
	};
	render(<Dictionary />, document.getElementById(`react-app-dictionary`));
}