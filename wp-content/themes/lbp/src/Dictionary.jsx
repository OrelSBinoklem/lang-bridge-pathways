import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
import ExamenWords from "./ExamenWords";
import WordsMatrix from "./WordsMatrix";
import DictionaryCategoryManagement from "./custom/components/DictionaryCategoryManagement";

if(document.getElementById('react-app-dictionary')) {
	let dictionaryId = document.getElementById('react-app-dictionary').dataset.id;
	console.log('Dictionary ID:', dictionaryId);
	const Dictionary = () => {
		const [userWordsData, setUserWordsData] = useState({});
		const [loadingUserData, setLoadingUserData] = useState(false);
		const [dictionaryWords, setDictionaryWords] = useState([]);
		const [loadingDictionaryWords, setLoadingDictionaryWords] = useState(false);
		const [categories, setCategories] = useState([]);
		const [loadingCategories, setLoadingCategories] = useState(false);
		const [showCategoryManagement, setShowCategoryManagement] = useState(false);
		const [dictionaryInfo, setDictionaryInfo] = useState(null);
		const [loadingDictionaryInfo, setLoadingDictionaryInfo] = useState(false);

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

		// Загружаем все данные при монтировании компонента
		useEffect(() => {
			fetchDictionaryInfo();
			fetchDictionaryWords();
			fetchCategories();
			fetchUserWordsData();
		}, [dictionaryId]);

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
		
		{/* Показываем ExamenWords напрямую */}
		<ExamenWords 
			dictionaryId={dictionaryId}
			userWordsData={userWordsData}
			loadingUserData={loadingUserData}
			onRefreshUserData={fetchUserWordsData}
			dictionaryWords={dictionaryWords}
			loadingDictionaryWords={loadingDictionaryWords}
			onRefreshDictionaryWords={refreshDictionaryWords}
			categories={categories}
			loadingCategories={loadingCategories}
		/>
		
		{/* Кнопка управления категориями (только для админов) */}
		{window.myajax && window.myajax.is_admin && (
			<div className="mode-buttons-container">
				<button 
					onClick={() => setShowCategoryManagement(!showCategoryManagement)} 
					className={'mode-button admin'}
				>
					{showCategoryManagement ? 'Скрыть управление' : 'Управление категориями'}
				</button>
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

			<div style={{ visibility: "hidden", position: "absolute", top: "-9999px" }}>
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