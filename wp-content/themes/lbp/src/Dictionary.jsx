import env from "./env";
import axios from "axios";

const { render, useEffect, useState, useRef } = wp.element;
import ExamenWords from "./ExamenWords";
import WordsMatrix from "./WordsMatrix";
import DictionaryCategoryManagement from "./custom/components/DictionaryCategoryManagement";
import ShuffleDictionaryTool from "./components/ShuffleDictionaryTool";

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
		
		const initialLoadDone = useRef(false); // Флаг первой загрузки

		// Функция генерации фейковых категорий по 50 слов
		const generateFakeCategories = (words) => {
			const wordsPerCategory = 50;
			const fakeCategories = [];
			
			// Создаём копию массива слов чтобы не мутировать оригинал
			const wordsWithCategories = [...words];
			
			for (let i = 0; i < wordsWithCategories.length; i += wordsPerCategory) {
				const startNum = i + 1;
				const endNum = Math.min(i + wordsPerCategory, wordsWithCategories.length);
				const categoryId = -(Math.floor(i / wordsPerCategory) + 1); // Отрицательные ID для фейковых категорий
				
				fakeCategories.push({
					id: categoryId,
					name: `${startNum}-${endNum}`,
					parent_id: 0,
					children: []
				});
				
				// Добавляем category_id к словам
				for (let j = i; j < endNum; j++) {
					wordsWithCategories[j] = {
						...wordsWithCategories[j],
						category_id: categoryId
					};
				}
			}
			
			// Обновляем состояние слов с присвоенными категориями
			setDictionaryWords(wordsWithCategories);
			
			// Оборачиваем в корневую категорию
			return [{
				id: 0,
				name: "Категории",
				parent_id: null,
				children: fakeCategories
			}];
		};

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
					
					// Если категорий нет - генерируем фейковые
					if (!processedCategories || processedCategories.length === 0) {
						console.log('⚠️ Категории не найдены при обновлении, генерируем автоматически');
						processedCategories = generateFakeCategories(dictionaryWords);
					} else {
						// Обычная обработка
						if (!processedCategories.some(item => Array.isArray(item.children) && item.children.length > 0)) {
							processedCategories = [{
								"id": 0,
								"name": "Категории",
								"parent_id": null,
								children: processedCategories
							}];
						}
					}
					setCategories(processedCategories);
				} else {
					console.error('Ошибка обновления категорий:', response.data.message);
					// Генерируем фейковые при ошибке
					const fakeCategories = generateFakeCategories(dictionaryWords);
					setCategories(fakeCategories);
				}
			} catch (error) {
				console.error('Ошибка при обновлении категорий:', error);
				// Генерируем фейковые при исключении
				const fakeCategories = generateFakeCategories(dictionaryWords);
				setCategories(fakeCategories);
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
					
					// Если категорий нет или пустой массив - нужно сгенерировать фейковые
					if (!processedCategories || processedCategories.length === 0) {
						console.log('⚠️ Категории не найдены, нужно сгенерировать автоматически');
						// Проверяем загружены ли слова
						if (dictionaryWords.length === 0) {
							console.log('⏳ Слова ещё не загружены, оставляем пустые категории (будут сгенерированы после загрузки слов)');
							setCategories([]);
						} else {
							processedCategories = generateFakeCategories(dictionaryWords);
							setCategories(processedCategories);
						}
					} else {
						// Обычная обработка категорий
						if (!processedCategories.some(item => Array.isArray(item.children) && item.children.length > 0)) {
							processedCategories = [{
								"id": 0,
								"name": "Категории",
								"parent_id": null,
								children: processedCategories
							}];
						}
						setCategories(processedCategories);
					}
				} else {
					// Если ошибка от сервера - генерируем фейковые если слова загружены
					console.error('Ошибка загрузки категорий:', response.data.message);
					if (dictionaryWords.length > 0) {
						console.log('⚠️ Генерируем фейковые категории из-за ошибки');
						const fakeCategories = generateFakeCategories(dictionaryWords);
						setCategories(fakeCategories);
					} else {
						console.log('⏳ Слова ещё не загружены, ждём');
						setCategories([]);
					}
				}
			} catch (error) {
				console.error('Ошибка при загрузке категорий:', error);
				// При любой ошибке - генерируем фейковые если слова загружены
				if (dictionaryWords.length > 0) {
					console.log('⚠️ Генерируем фейковые категории из-за исключения');
					const fakeCategories = generateFakeCategories(dictionaryWords);
					setCategories(fakeCategories);
				} else {
					console.log('⏳ Слова ещё не загружены, ждём');
					setCategories([]);
				}
			} finally {
				setLoadingCategories(false);
			}
		}

		// Загружаем все данные при монтировании компонента (только один раз)
		useEffect(() => {
			if (!initialLoadDone.current) {
				initialLoadDone.current = true;
				fetchDictionaryInfo();
				fetchDictionaryWords();
				fetchCategories();
				fetchUserWordsData();
			}
		}, []);

		// Генерируем фейковые категории после загрузки слов, если категории пустые
		useEffect(() => {
			if (dictionaryWords.length > 0 && categories.length === 0 && !loadingCategories && !loadingDictionaryWords) {
				console.log('✅ Слова загружены, категории пустые - генерируем фейковые категории');
				const fakeCategories = generateFakeCategories(dictionaryWords);
				setCategories(fakeCategories);
			}
		}, [dictionaryWords, categories, loadingCategories, loadingDictionaryWords]);

	// Обработчик клика по заголовку - возврат к категориям
	const handleTitleClick = (e) => {
		e.preventDefault();
		// Отправляем событие для сброса состояния тренировки
		window.dispatchEvent(new CustomEvent('returnToCategories'));
	};

	// Проверяем активна ли тренировка (examen)
	const [isExamenActive, setIsExamenActive] = useState(false);
	
	useEffect(() => {
		const checkExamenStatus = () => {
			setIsExamenActive(document.body.classList.contains('dictionary-examen-active'));
		};
		
		// Проверяем сразу и потом следим за изменениями
		checkExamenStatus();
		
		// Наблюдаем за изменениями класса на body
		const observer = new MutationObserver(checkExamenStatus);
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class']
		});
		
		return () => observer.disconnect();
	}, []);

	return (
		<div>
			{/* Заголовок словаря */}
			{dictionaryInfo && (
				<div className="dictionary-info">
					<h1 className="dictionary-title">
					{isExamenActive ? (
						<a 
							href={`${window.location.pathname}?refresh=${Date.now()}`}
							onClick={handleTitleClick}
							title="Вернуться к категориям"
							style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
						>
							{dictionaryInfo.name || 'Словарь'}
							<span className="words-count"> ({dictionaryInfo.words} слов)</span>
						</a>
					) : (
							<>
								{dictionaryInfo.name || 'Словарь'}
								<span className="words-count"> ({dictionaryInfo.words} слов)</span>
							</>
						)}
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
		
		{/* Кнопки для админов */}
		{window.myajax && window.myajax.is_admin && (
			<div className="mode-buttons-container">
				<button 
					onClick={() => setShowCategoryManagement(!showCategoryManagement)} 
					className={'mode-button admin'}
				>
					{showCategoryManagement ? 'Скрыть управление' : 'Управление категориями'}
				</button>
				<ShuffleDictionaryTool 
					dictionaryId={dictionaryId}
					onComplete={refreshDictionaryWords}
				/>
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