import React, { useState } from 'react';
import CategoryLayout from '../layouts/CategoryLayout';
import useGroupCheck from '../hooks/useGroupCheck';
import { WordProvider } from '../contexts/WordContext';
import useGroupWords from '../hooks/useGroupWords';
import { createGroupCheckHandlers, startLearningForGroup } from '../utils/groupHandlers';
import WordInput from '../components/WordInput';

/**
 * КАТЕГОРИЯ: Таблица спряжений глаголов
 * 
 * Отображает спряжение глаголов в виде таблицы с колонками:
 * - Местоимение
 * - PAGĀTNE (Прошедшее время)
 * - TAGADNE (Настоящее время)
 * - NĀKOTNE (Будущее время)
 * 
 * Для использования:
 * 1. Зарегистрируйте в customComponents.js: 'category_id': VerbConjugationCategory
 * 2. Добавьте все формы спряжения через админку (см. CSV файлы)
 */
const VerbConjugationCategory = (props) => {
  // Одна группа для всей таблицы
  const groupCheck = useGroupCheck();
  const groupWords = useGroupWords();
  
  // Состояние для значений полей ввода
  const [inputValues, setInputValues] = useState({});
  // Состояние для отслеживания, начато ли обучение для каждого глагола
  const [learningStarted, setLearningStarted] = useState({});
  
  return (
    <CategoryLayout {...props}>
      {({ 
        getWordPropsByText, 
        stats, 
        checkGroupWords, 
        getWordIdByText, 
        getWordProps, 
        getWord,
        words,
        dictionaryWordsById,
        userWordsData,
        displayStatuses,
        dictionaryId,
        editingWordId,
        onToggleEdit,
        onRefreshDictionaryWords,
        onRefreshUserData,
        formatTime,
        currentTime
      }) => {
        // isRevert: false = прямой перевод (lat→rus), true = обратный (rus→lat)
        // Для WordInput пользователь вводит латышское слово, поэтому нужно проверять само слово (isRevert: true)
        const handlers = createGroupCheckHandlers(groupWords, groupCheck, checkGroupWords, getWordIdByText, true);
        
        // Проверяем, находится ли слово в начальном состоянии (без попыток)
        const isWordInInitialState = (wordId) => {
          const userData = userWordsData[wordId];
          if (!userData) return true; // Если нет данных - считается начальным состоянием
          
          return (
            userData.mode_education === 0 &&
            userData.mode_education_revert === 0 &&
            userData.attempts === 0 &&
            userData.attempts_revert === 0 &&
            userData.correct_attempts === 0 &&
            userData.correct_attempts_revert === 0 &&
            (!userData.last_shown || userData.last_shown === '' || userData.last_shown === '0000-00-00 00:00:00') &&
            (!userData.last_shown_revert || userData.last_shown_revert === '' || userData.last_shown_revert === '0000-00-00 00:00:00')
          );
        };
        
        // Получаем все ID слов из массива слов
        const getWordIdsFromWords = (words) => {
          const wordIds = [];
          words.forEach(wordText => {
            const wordId = getWordIdByText(wordText);
            if (wordId) wordIds.push(wordId);
          });
          return wordIds;
        };
        
        // Проверяем, есть ли хотя бы одно слово с попытками
        const hasWordsWithAttempts = (words) => {
          const wordIds = getWordIdsFromWords(words);
          return wordIds.some(wordId => !isWordInInitialState(wordId));
        };
        
        // Функция для начала обучения
        const handleStartLearning = async (words, verbKey) => {
          const wordIds = getWordIdsFromWords(words);
          
          if (wordIds.length === 0) {
            console.warn('⚠️ Нет слов для начала обучения');
            return;
          }
          
          const success = await startLearningForGroup(wordIds, onRefreshUserData);
          if (success) {
            setLearningStarted(prev => ({ ...prev, [verbKey]: true }));
          }
        };
        
        // Получаем статистику для группы слов
        const getVerbStats = (words) => {
          const wordIds = getWordIdsFromWords(words);
          const total = wordIds.length;
          const learned = wordIds.filter(wordId => {
            const displayStatus = displayStatuses[wordId];
            return displayStatus && displayStatus.fullyLearned;
          }).length;
          return { total, learned };
        };
        
        
        // Обработчик изменения значения поля ввода
        const handleInputChange = (wordId, value) => {
          setInputValues(prev => ({ ...prev, [wordId]: value }));
          // Регистрируем слово в группе (groupWords.addWord принимает wordText)
          const word = dictionaryWordsById[wordId];
          if (word && word.word && !groupWords.words.includes(word.word)) {
            groupWords.addWord(word.word);
          }
          // Сохраняем ответ (используем wordId для groupCheck)
          groupCheck.setAnswer(wordId, value);
        };
        
        // Функция для получения пропсов слова для WordInput
        const getWordInputProps = (wordText) => {
          const wordId = getWordIdByText(wordText);
          if (!wordId) return null;
          
          const word = dictionaryWordsById[wordId];
          const userData = userWordsData[wordId];
          const displayStatus = displayStatuses[wordId];
          
          if (!word) return null;
          
          return {
            word,
            userData,
            displayStatus,
            formatTime,
            dictionaryId,
            editingWordId,
            onToggleEdit,
            onRefreshDictionaryWords,
            value: inputValues[wordId] || '',
            onChange: handleInputChange,
            highlightCorrect: groupCheck.results[wordId] === true,
            highlightIncorrect: groupCheck.results[wordId] === false,
          };
        };
        
        // Объект с глаголами и их спряжениями
        // Каждое спряжение - отдельный ключ. Удалите ненужные ключи, ячейка останется пустой
        const verbs = {
          'būt': {
            name: 'būt - быть',
            'es_past': 'biju',
            'es_present': 'esmu',
            'es_future': 'būšu',
            'tu_past': 'biji',
            'tu_present': 'esi',
            'tu_future': 'būsi',
            '3pers_past': 'bija',
            '3pers_present': 'ir',
            '3pers_future': 'būs',
            'we_past': 'bijām',
            'we_present': 'esam',
            'we_future': 'būsim',
            'you_pl_past': 'bijāt',
            'you_pl_present': 'esat',
            'you_pl_future': 'būsiet',
          },
          'iet': {
            name: 'iet - идти',
            'es_past': 'gāju',
            'es_present': 'eju',
            'es_future': 'iešu',
            'tu_past': 'gāji',
            'tu_present': 'ej',
            'tu_future': 'iesi',
            '3pers_past': 'gāja',
            '3pers_present': 'iet',
            '3pers_future': 'ies',
            'we_past': 'gājām',
            'we_present': 'ejam',
            'we_future': 'iesim',
            'you_pl_past': 'gājāt',
            'you_pl_present': 'ejat',
            'you_pl_future': 'iesiet',
          },
          'patikt': {
            name: 'patikt - нравиться',
            'es_past': 'patiku',
            'es_present': 'patīku',
            'es_future': 'patikšu',
            'tu_past': 'patiki',
            'tu_present': 'patīc',
            'tu_future': 'patiksi',
            '3pers_past': 'patika',
            '3pers_present': 'patīk',
            '3pers_future': 'patiks',
            'we_past': 'patikām',
            'we_present': 'patīkam',
            'we_future': 'patiksim',
            'you_pl_past': 'patikāt',
            'you_pl_present': 'patīkat',
            'you_pl_future': 'patiksiet',
          },
          'pirkt': {
            name: 'pirkt - покупать',
            'es_past': 'pirku',
            'es_present': 'pērku',
            'es_future': 'pirkšu',
            'tu_past': 'pirki',
            'tu_present': 'pērc',
            'tu_future': 'pirksi',
            '3pers_past': 'pirka',
            '3pers_present': 'pērk',
            '3pers_future': 'pirks',
            'we_past': 'pirkām',
            'we_present': 'pērkam',
            'we_future': 'pirksim',
            'you_pl_past': 'pirkāt',
            'you_pl_present': 'pērkat',
            'you_pl_future': 'pirksiet',
          },
          'pārdot': {
            name: 'pārdot - продать',
            'es_past': 'pārdevu',
            'es_present': 'pārdodu',
            'es_future': 'pārdošu',
            'tu_past': 'pārdevi',
            'tu_present': 'pārdod',
            'tu_future': 'pārdosi',
            '3pers_past': 'pārdeva',
            '3pers_present': 'pārdod',
            '3pers_future': 'pārdos',
            'we_past': 'pārdevām',
            'we_present': 'pārdodam',
            'we_future': 'pārdosim',
            'you_pl_past': 'pārdevāt',
            'you_pl_present': 'pārdodat',
            'you_pl_future': 'pārdosiet',
          },
          'braukt': {
            name: 'braukt - ехать',
            'es_past': 'braucu',
            'es_present': 'braucu',
            'es_future': 'braukšu',
            'tu_past': 'brauci',
            'tu_present': 'brauc',
            'tu_future': 'brauksi',
            '3pers_past': 'brauca',
            '3pers_present': 'brauc',
            '3pers_future': 'brauks',
            'we_past': 'braucām',
            'we_present': 'braucam',
            'we_future': 'brauksim',
            'you_pl_past': 'braucāt',
            'you_pl_present': 'braucat',
            'you_pl_future': 'brauksiet',
          },
          'ēst': {
            name: 'ēst - кушать',
            'es_past': 'ēdu',
            'es_present': 'ēdu',
            'es_future': 'ēdīšu',
            'tu_past': 'ēdi',
            'tu_present': 'ēd',
            'tu_future': 'ēdīsi',
            '3pers_past': 'ēda',
            '3pers_present': 'ēd',
            '3pers_future': 'ēdīs',
            'we_past': 'ēdām',
            'we_present': 'ēdam',
            'we_future': 'ēdīsim',
            'you_pl_past': 'ēdāt',
            'you_pl_present': 'ēdat',
            'you_pl_future': 'ēdīsiet',
          },
          'dzert': {
            name: 'dzert - пить',
            'es_past': 'dzēru',
            'es_present': 'dzeru',
            'es_future': 'dzeršu',
            'tu_past': 'dzēri',
            'tu_present': 'dzer',
            'tu_future': 'dzersi',
            '3pers_past': 'dzēra',
            '3pers_present': 'dzer',
            '3pers_future': 'dzers',
            'we_past': 'dzērām',
            'we_present': 'dzeram',
            'we_future': 'dzersim',
            'you_pl_past': 'dzērāt',
            'you_pl_present': 'dzerat',
            'you_pl_future': 'dzersiet',
          },
          'atrast': {
            name: 'atrast - находить',
            'es_past': 'atradu',
            'es_present': 'atrodu',
            'es_future': 'atradīšu',
            'tu_past': 'atradi',
            'tu_present': 'atrodi',
            'tu_future': 'atradīsi',
            '3pers_past': 'atrada',
            '3pers_present': 'atrod',
            '3pers_future': 'atradīs',
            'we_past': 'atradām',
            'we_present': 'atrodam',
            'we_future': 'atradīsim',
            'you_pl_past': 'atradāt',
            'you_pl_present': 'atrodat',
            'you_pl_future': 'atradīsiet',
          },
          'skriet': {
            name: 'skriet - бежать',
            'es_past': 'skrēju',
            'es_present': 'skrienu',
            'es_future': 'skriešu',
            'tu_past': 'skrēji',
            'tu_present': 'skrien',
            'tu_future': 'skriesi',
            '3pers_past': 'skrēja',
            '3pers_present': 'skrien',
            '3pers_future': 'skries',
            'we_past': 'skrējām',
            'we_present': 'skrienam',
            'we_future': 'skriesim',
            'you_pl_past': 'skrējāt',
            'you_pl_present': 'skrienat',
            'you_pl_future': 'skriesiet',
          },


          /*A2*/


          'satikt': {
            name: 'satikt - встретить',
            'es_past': 'satiku',
            'es_present': 'satieku',
            'es_future': 'satikšu',
            'tu_past': 'satiki',
            'tu_present': 'satiec',
            'tu_future': 'satiksi',
            '3pers_past': 'satika',
            '3pers_present': 'satiek',
            '3pers_future': 'satiks',
            'we_past': 'satikām',
            'we_present': 'satiekam',
            'we_future': 'satiksim',
            'you_pl_past': 'satikāt',
            'you_pl_present': 'satiekat',
            'you_pl_future': 'satiksiet',
          },
          'nākt': {
            name: 'nākt - приходить',
            'es_past': 'nācu',
            'es_present': 'nāku',
            'es_future': 'nākšu',
            'tu_past': 'nāci',
            'tu_present': 'nāc',
            'tu_future': 'nāksi',
            '3pers_past': 'nāca',
            '3pers_present': 'nāk',
            '3pers_future': 'nāks',
            'we_past': 'nācām',
            'we_present': 'nākam',
            'we_future': 'nāksim',
            'you_pl_past': 'nācāt',
            'you_pl_present': 'nākat',
            'you_pl_future': 'nāksiet',
          },
          'ņemt': {
            name: 'ņemt - брать',
            'es_past': 'ņēmu',
            'es_present': 'nemu',
            'es_future': 'ņemšu',
            'tu_past': 'ņēmi',
            'tu_present': 'nem',
            'tu_future': 'ņemsi',
            '3pers_past': 'ņēma',
            '3pers_present': 'nem',
            '3pers_future': 'ņems',
            'we_past': 'ņēmām',
            'we_present': 'nemam',
            'we_future': 'ņemsim',
            'you_pl_past': 'ņēmāt',
            'you_pl_present': 'nemat',
            'you_pl_future': 'ņemsiet',
          },

          'prast': {
            name: 'prast - уметь',
            'es_past': 'pratu',
            'es_present': 'protu',
            'es_future': 'pratīšu',
            'tu_past': 'prati',
            'tu_present': 'proti',
            'tu_future': 'pratīsi',
            '3pers_past': 'prata',
            '3pers_present': 'prot',
            '3pers_future': 'pratīs',
            'we_past': 'pratām',
            'we_present': 'protam',
            'we_future': 'pratīsim',
            'you_pl_past': 'pratāt',
            'you_pl_present': 'protat',
            'you_pl_future': 'pratīsiet',
          },
          'doties': {
            name: 'doties - направляться',
            'es_past': 'devos',
            'es_present': 'dodos',
            'es_future': 'došos',
            'tu_past': 'devies',
            'tu_present': 'dodies',
            'tu_future': 'dosies',
            '3pers_past': 'devās',
            '3pers_present': 'dodas',
            '3pers_future': 'dosies',
            'we_past': 'devāmies',
            'we_present': 'dodamies',
            'we_future': 'dosimies',
            'you_pl_past': 'devāties',
            'you_pl_present': 'dodaties',
            'you_pl_future': 'dosieties',
          },
          'beigties': {
            name: 'beigties - (за)кончиться',
            'es_past': 'beidzos',
            'es_present': 'beidzos',
            'es_future': 'beigsos',
            'tu_past': 'beidzies',
            'tu_present': 'beidzies',
            'tu_future': 'beigsies',
            '3pers_past': 'beidzās',
            '3pers_present': 'beidzas',
            '3pers_future': 'beigsies',
            'we_past': 'beidzāmies',
            'we_present': 'beidzamies',
            'we_future': 'beigsimies',
            'you_pl_past': 'beidzāties',
            'you_pl_present': 'beidzaties',
            'you_pl_future': 'beigsieties',
          },
          'sākties': {
            name: 'sākties - начаться',
            'es_past': 'sākos',
            'es_present': 'sākos',
            'es_future': 'sākšos',
            'tu_past': 'sākies',
            'tu_present': 'sācies',
            'tu_future': 'sāksies',
            '3pers_past': 'sākās',
            '3pers_present': 'sākas',
            '3pers_future': 'sāksies',
            'we_past': 'sākāmies',
            'we_present': 'sākamies',
            'we_future': 'sākšimies',
            'you_pl_past': 'sākāties',
            'you_pl_present': 'sākaties',
            'you_pl_future': 'sāksieties',
          },
          'lūgt': {
            name: 'lūgt - просить (пригласить)',
            'es_past': 'lūdzu',
            'es_present': 'lūdzu',
            'es_future': 'lūgšu',
            'tu_past': 'lūdzi',
            'tu_present': 'lūdz',
            'tu_future': 'lūgsi',
            '3pers_past': 'lūdza',
            '3pers_present': 'lūdz',
            '3pers_future': 'lūgs',
            'we_past': 'lūdzām',
            'we_present': 'lūdzam',
            'we_future': 'lūgsim',
            'you_pl_past': 'lūdzāt',
            'you_pl_present': 'lūdzat',
            'you_pl_future': 'lūgsiet',
          },
          'atrasties': {
            name: 'atrasties - находиться',
            'es_past': 'atrados',
            'es_present': 'atrodos',
            'es_future': 'atradīšos',
            'tu_past': 'atradies',
            'tu_present': 'atrodies',
            'tu_future': 'atradīsies',
            '3pers_past': 'atradās',
            '3pers_present': 'atrodas',
            '3pers_future': 'atradīsies',
            'we_past': 'atradāmies',
            'we_present': 'atrodamies',
            'we_future': 'atradīsimies',
            'you_pl_past': 'atradāties',
            'you_pl_present': 'atrodaties',
            'you_pl_future': 'atradīsieties',
          },
          'dot': {
            name: 'dot - давать',
            'es_past': 'devu',
            'es_present': 'dodu',
            'es_future': 'došu',
            'tu_past': 'devi',
            'tu_present': 'dod',
            'tu_future': 'dosi',
            '3pers_past': 'deva',
            '3pers_present': 'dod',
            '3pers_future': 'dos',
            'we_past': 'devām',
            'we_present': 'dodam',
            'we_future': 'dosim',
            'you_pl_past': 'devāt',
            'you_pl_present': 'dodat',
            'you_pl_future': 'dosiet',
          },
          'likt': {
            name: 'likt - класть, ставить',
            'es_past': 'liku',
            'es_present': 'lieku',
            'es_future': 'likšu',
            'tu_past': 'liki',
            'tu_present': 'liec',
            'tu_future': 'liksi',
            '3pers_past': 'lika',
            '3pers_present': 'liek',
            '3pers_future': 'liks',
            'we_past': 'likām',
            'we_present': 'liekam',
            'we_future': 'liksim',
            'you_pl_past': 'likāt',
            'you_pl_present': 'liekat',
            'you_pl_future': 'liksiet',
          },
          'tikt': {
            name: 'tikt - попасть, стать',
            'es_past': 'tiku',
            'es_present': 'tieku',
            'es_future': 'tikšu',
            'tu_past': 'tiki',
            'tu_present': 'tiec',
            'tu_future': 'tiksi',
            '3pers_past': 'tika',
            '3pers_present': 'tiek',
            '3pers_future': 'tiks',
            'we_past': 'tikām',
            'we_present': 'tiekam',
            'we_future': 'tiksim',
            'you_pl_past': 'tikāt',
            'you_pl_present': 'tiekat',
            'you_pl_future': 'tiksiet',
          },
          // ✅ saukt по Letonika
          'saukt': {
            name: 'saukt - звать, называть',
            'es_past': 'saucu',
            'es_present': 'saucu',
            'es_future': 'saukšu',
            'tu_past': 'sauci',
            'tu_present': 'sauc',
            'tu_future': 'sauksi',
            '3pers_past': 'sauca',
            '3pers_present': 'sauc',
            '3pers_future': 'sauks',
            'we_past': 'saucām',
            'we_present': 'saucam',
            'we_future': 'sauksim',
            'you_pl_past': 'saucāt',
            'you_pl_present': 'saucat',
            'you_pl_future': 'sauksiet',
          },
          // teikt – с чередованием k→c и teikš- в будущем
          'teikt': {
            name: 'teikt - говорить, сказать',
            'es_past': 'teicu',
            'es_present': 'teicu',
            'es_future': 'teikšu',
            'tu_past': 'teici',
            'tu_present': 'teic',
            'tu_future': 'teiksi',
            '3pers_past': 'teica',
            '3pers_present': 'teic',
            '3pers_future': 'teiks',
            'we_past': 'teicām',
            'we_present': 'teicam',
            'we_future': 'teiksim',
            'you_pl_past': 'teicāt',
            'you_pl_present': 'teicat',
            'you_pl_future': 'teiksiet',
          },
          'vilkt': {
            name: 'vilkt - тянуть, носить',
            'es_past': 'vilku',
            'es_present': 'velku',
            'es_future': 'vilkšu',
            'tu_past': 'vilki',
            'tu_present': 'velc',
            'tu_future': 'vilksi',
            '3pers_past': 'vilka',
            '3pers_present': 'velk',
            '3pers_future': 'vilks',
            'we_past': 'vilkām',
            'we_present': 'velkam',
            'we_future': 'vilksim',
            'you_pl_past': 'vilkāt',
            'you_pl_present': 'velkat',
            'you_pl_future': 'vilksiet',
          },
          "nest": {
            name: "nest - нести",
            "es_past": "nesu",
            "es_present": "nesu",
            "es_future": "nesīšu",
            "tu_past": "nesi",
            "tu_present": "nes",
            "tu_future": "nesīsi",
            "3pers_past": "nesa",
            "3pers_present": "nes",
            "3pers_future": "nesīs",
            "we_past": "nesām",
            "we_present": "nesam",
            "we_future": "nesīsim",
            "you_pl_past": "nesāt",
            "you_pl_present": "nesat",
            "you_pl_future": "nesīsiet"
          },
          "sniegt": {
            name: "sniegt - подавать",
            "es_past": "sniedzu",
            "es_present": "sniedzu",
            "es_future": "sniegšu",
            "tu_past": "sniedzi",
            "tu_present": "sniedz",
            "tu_future": "sniegsi",
            "3pers_past": "sniedza",
            "3pers_present": "sniedz",
            "3pers_future": "sniegs",
            "we_past": "sniedzām",
            "we_present": "sniedzam",
            "we_future": "sniegsim",
            "you_pl_past": "sniedzāt",
            "you_pl_present": "sniedzat",
            "you_pl_future": "sniegsiet"
          },

          //B1
          'celt': {
            name: 'celt - поднимать',
            'es_past': 'cēlu',
            'es_present': 'ceļu',
            'es_future': 'celšu',
            'tu_past': 'cēli',
            'tu_present': 'ceļ',
            'tu_future': 'celsi',
            '3pers_past': 'cēla',
            '3pers_present': 'ceļ',
            '3pers_future': 'cels',
            'we_past': 'cēlām',
            'we_present': 'ceļam',
            'we_future': 'celsim',
            'you_pl_past': 'cēlāt',
            'you_pl_present': 'ceļat',
            'you_pl_future': 'celsiet',
          },
          'gūt': {
            name: 'gūt - получать, обрести',
            'es_past': 'guvu',
            'es_present': 'gūstu',
            'es_future': 'gūšu',
            'tu_past': 'guvi',
            'tu_present': 'gūsti',
            'tu_future': 'gūsi',
            '3pers_past': 'guva',
            '3pers_present': 'gūst',
            '3pers_future': 'gūs',
            'we_past': 'guvām',
            'we_present': 'gūstam',
            'we_future': 'gūsim',
            'you_pl_past': 'guvāt',
            'you_pl_present': 'gūstat',
            'you_pl_future': 'gūsiet',
          },
          'kļūt': {
            name: 'kļūt - становиться',
            'es_past': 'kļuvu',
            'es_present': 'kļūstu',
            'es_future': 'kļūšu',
            'tu_past': 'kļuvi',
            'tu_present': 'kļūsti',
            'tu_future': 'kļūsi',
            '3pers_past': 'kļuva',
            '3pers_present': 'kļūst',
            '3pers_future': 'kļūs',
            'we_past': 'kļuvām',
            'we_present': 'kļūstam',
            'we_future': 'kļūsim',
            'you_pl_past': 'kļuvāt',
            'you_pl_present': 'kļūstat',
            'you_pl_future': 'kļūsiet',
          },
          'just': {
            name: 'just - чувствовать',
            'es_past': 'jutu',
            'es_present': 'jūtu',
            'es_future': 'jutīšu',
            'tu_past': 'juti',
            'tu_present': 'jūti',
            'tu_future': 'jutīsi',
            '3pers_past': 'juta',
            '3pers_present': 'jūt',
            '3pers_future': 'jutīs',
            'we_past': 'jutām',
            'we_present': 'jūtam',
            'we_future': 'jutīsim',
            'you_pl_past': 'jutāt',
            'you_pl_present': 'jūtat',
            'you_pl_future': 'jutīsiet',
          },

          "vest": {
            name: "vest - везти",
            "es_past": "vedu",
            "es_present": "vedu",
            "es_future": "vedīšu",
            "tu_past": "vedi",
            "tu_present": "ved",
            "tu_future": "vedīsi",
            "3pers_past": "veda",
            "3pers_present": "ved",
            "3pers_future": "vedīs",
            "we_past": "vedām",
            "we_present": "vedam",
            "we_future": "vedīsim",
            "you_pl_past": "vedāt",
            "you_pl_present": "vedat",
            "you_pl_future": "vedīsiet"
          },

          "mest": {
            name: "mest - бросать",
            "es_past": "metu",
            "es_present": "metu",
            "es_future": "metīšu",
            "tu_past": "meti",
            "tu_present": "met",
            "tu_future": "metīsi",
            "3pers_past": "meta",
            "3pers_present": "met",
            "3pers_future": "metīs",
            "we_past": "metām",
            "we_present": "metam",
            "we_future": "metīsim",
            "you_pl_past": "metāt",
            "you_pl_present": "metat",
            "you_pl_future": "metīsiet"
          },

          "zust": {
            name: "zust - исчезать",
            "es_past": "-",
            "es_present": "-",
            "es_future": "-",
            "tu_past": "-",
            "tu_present": "-",
            "tu_future": "-",
            "3pers_past": "zuda",
            "3pers_present": "zūd",
            "3pers_future": "zudīs",
            "we_past": "-",
            "we_present": "-",
            "we_future": "-",
            "you_pl_past": "-",
            "you_pl_present": "-",
            "you_pl_future": "-"
          },

          //B2

          'zagt': {
            name: 'zagt - воровать',
            'es_past': 'zagu',
            'es_present': 'zogu',
            'es_future': 'zagšu',
            'tu_past': 'zagi',
            'tu_present': 'zodz',
            'tu_future': 'zagsi',
            '3pers_past': 'zaga',
            '3pers_present': 'zog',
            '3pers_future': 'zags',
            'we_past': 'zagām',
            'we_present': 'zogam',
            'we_future': 'zagsim',
            'you_pl_past': 'zagāt',
            'you_pl_present': 'zogat',
            'you_pl_future': 'zagsiet',
          },


          'krist': {
            name: 'krist - падать',
            'es_past': 'kritu',
            'es_present': 'krītu',
            'es_future': 'kritīšu',
            'tu_past': 'kriti',
            'tu_present': 'krīti',
            'tu_future': 'kritīsi',
            '3pers_past': 'krita',
            '3pers_present': 'krīt',
            '3pers_future': 'kritīs',
            'we_past': 'kritām',
            'we_present': 'krītam',
            'we_future': 'kritīsim',
            'you_pl_past': 'kritāt',
            'you_pl_present': 'krītat',
            'you_pl_future': 'kritīsiet',
          },





          // ✅ laist по Letonika
          'laist': {
            name: 'laist - пускать, отпускать',
            'es_past': 'laidu',
            'es_present': 'laižu',
            'es_future': 'laidīšu',
            'tu_past': 'laidi',
            'tu_present': 'laid',
            'tu_future': 'laidīsi',
            '3pers_past': 'laida',
            '3pers_present': 'laiž',
            '3pers_future': 'laidīs',
            'we_past': 'laidām',
            'we_present': 'laižam',
            'we_future': 'laidīsim',
            'you_pl_past': 'laidāt',
            'you_pl_present': 'laižat',
            'you_pl_future': 'laidīsiet',
          },

          // ✅ kliegt по Letonika
          'kliegt': {
            name: 'kliegt - кричать',
            'es_past': 'kliedzu',
            'es_present': 'kliedzu',
            'es_future': 'kliegšu',
            'tu_past': 'kliedzi',
            'tu_present': 'kliedz',
            'tu_future': 'kliegsi',
            '3pers_past': 'kliedza',
            '3pers_present': 'kliedz',
            '3pers_future': 'kliegs',
            'we_past': 'kliedzām',
            'we_present': 'kliedzam',
            'we_future': 'kliegsim',
            'you_pl_past': 'kliedzāt',
            'you_pl_present': 'kliedzat',
            'you_pl_future': 'kliegsiet',
          },




          'sēdēt': {
            name: 'sēdēt - сидеть',
            'es_past': 'sēdēju',
            'es_present': 'sēžu',
            'es_future': 'sēdēšu',
            'tu_past': 'sēdēji',
            'tu_present': 'sēdi',
            'tu_future': 'sēdēsi',
            '3pers_past': 'sēdēja',
            '3pers_present': 'sēž',
            '3pers_future': 'sēdēs',
            'we_past': 'sēdējām',
            'we_present': 'sēžam',
            'we_future': 'sēdēsim',
            'you_pl_past': 'sēdējāt',
            'you_pl_present': 'sēžat',
            'you_pl_future': 'sēdēsiet',
          },



          'dzīt': {
            name: 'dzīt - гнать',
            'es_past': 'dzinu',
            'es_present': 'dzenu',
            'es_future': 'dzīšu',
            'tu_past': 'dzini',
            'tu_present': 'dzen',
            'tu_future': 'dzīsi',
            '3pers_past': 'dzina',
            '3pers_present': 'dzen',
            '3pers_future': 'dzīs',
            'we_past': 'dzinām',
            'we_present': 'dzenam',
            'we_future': 'dzīsim',
            'you_pl_past': 'dzināt',
            'you_pl_present': 'dzenat',
            'you_pl_future': 'dzīsiet',
          },



          

          "kost": {
            name: "kost - кусать",
            "es_past": "kodu",
            "es_present": "kožu",
            "es_future": "košu",
            "tu_past": "kodi",
            "tu_present": "kož",
            "tu_future": "kosi",
            "3pers_past": "koda",
            "3pers_present": "kož",
            "3pers_future": "kos",
            "we_past": "kodām",
            "we_present": "kožam",
            "we_future": "kosim",
            "you_pl_past": "kodāt",
            "you_pl_present": "kožat",
            "you_pl_future": "kosiet"
          },

          "raut": {
            name: "raut - рвать, дёргать",
            "es_past": "rāvu",
            "es_present": "rauju",
            "es_future": "raušu",
            "tu_past": "rāvi",
            "tu_present": "rauj",
            "tu_future": "rausi",
            "3pers_past": "rāva",
            "3pers_present": "rauj",
            "3pers_future": "raus",
            "we_past": "rāvām",
            "we_present": "raujam",
            "we_future": "rausim",
            "you_pl_past": "rāvāt",
            "you_pl_present": "raujat",
            "you_pl_future": "rausiet"
          },







          "plest": {
            name: "plest - раскрывать, рвать",
            "es_past": "plēsu",
            "es_present": "plešu",
            "es_future": "plēsīšu",
            "tu_past": "plēsi",
            "tu_present": "plēs",
            "tu_future": "plēsīsi",
            "3pers_past": "plēsa",
            "3pers_present": "plēs",
            "3pers_future": "plēsīs",
            "we_past": "plēsām",
            "we_present": "plešam",
            "we_future": "plēsīsim",
            "you_pl_past": "plēsāt",
            "you_pl_present": "plešat",
            "you_pl_future": "plēsīsiet"
          },

          "liegt": {
            name: "liegt - запрещать",
            "es_past": "liedzu",
            "es_present": "liedzu",
            "es_future": "liegšu",
            "tu_past": "liedzi",
            "tu_present": "liedz",
            "tu_future": "liegsi",
            "3pers_past": "liedza",
            "3pers_present": "liedz",
            "3pers_future": "liegs",
            "we_past": "liedzām",
            "we_present": "liedzam",
            "we_future": "liegsim",
            "you_pl_past": "liedzāt",
            "you_pl_present": "liedzat",
            "you_pl_future": "liegsiet"
          },



          "spiest": {
            name: "spiest - нажимать",
            "es_past": "spiedu",
            "es_present": "spiežu",
            "es_future": "spiedīšu",
            "tu_past": "spiedi",
            "tu_present": "spiedz",
            "tu_future": "spiedīsi",
            "3pers_past": "spieda",
            "3pers_present": "spiež",
            "3pers_future": "spiedīs",
            "we_past": "spiedām",
            "we_present": "spiežam",
            "we_future": "spiedīsim",
            "you_pl_past": "spiedāt",
            "you_pl_present": "spiežat",
            "you_pl_future": "spiedīsiet"
          },

          "snigt": {
            "name": "snigt - идти (о снеге)",
            "es_past": "snigu",
            "es_present": "sniegu",
            "es_future": "snigšu",

            "tu_past": "snigi",
            "tu_present": "snieg",
            "tu_future": "snigsi",

            "3pers_past": "sniga",
            "3pers_present": "snieg",
            "3pers_future": "snigs",

            "we_past": "snigām",
            "we_present": "sniegam",
            "we_future": "snigsim",

            "you_pl_past": "snigāt",
            "you_pl_present": "sniegat",
            "you_pl_future": "snigsit",

            "they_past": "sniga",
            "they_present": "snieg",
            "they_future": "snigs"
          },

          "rasties": {
            "name": "rasties - возникать",
            "es_past": "rados",
            "es_present": "rodos",
            "es_future": "radīšos",

            "tu_past": "radies",
            "tu_present": "rodies",
            "tu_future": "radīsies",

            "3pers_past": "radās",
            "3pers_present": "rodas",
            "3pers_future": "radīsies",

            "we_past": "radāmies",
            "we_present": "radāmies",
            "we_future": "radīsimies",

            "you_pl_past": "radāties",
            "you_pl_present": "radāties",
            "you_pl_future": "radīsieties",

            "they_past": "radās",
            "they_present": "rodas",
            "they_future": "radīsies"
          }


        };
        
        // Шаблон строк таблицы
        const pronouns = [
          { key: 'es', label: 'Es' },
          { key: 'tu', label: 'Tu' },
          { key: '3pers', label: '3 pers.' },
          { key: 'we', label: 'Mēs' },
          { key: 'you_pl', label: 'Jūs' },
        ];
        const tenses = ['past', 'present', 'future'];
        
        return (
          <WordProvider 
            getWordPropsByText={getWordPropsByText} 
            getWordIdByText={getWordIdByText}
            getWordProps={getWordProps}
            getWord={getWord}
          >
            <div className="verb-conjugation-category">
              {/* Заголовок */}
              <div className="category-header" style={{ marginBottom: '20px' }}>
                <h2>📚 {props.category.category_name}</h2>
                <div className="stats">
                  📚 Всего: <strong>{stats.total}</strong>
                  {' • '}
                  ✅ Изучено: <strong>{stats.learned}</strong>
                </div>
              </div>

              {/* Глаголы - удаляйте ненужные ключи из объекта verbs, ячейки останутся пустыми */}
              {Object.entries(verbs).map(([verbKey, verbData]) => {
                // Собираем все слова из объекта для статистики и кнопок
                const allWords = Object.values(verbData).filter(val => val !== verbData.name && val);
                const shouldShowStartLearning = !learningStarted[verbKey] && !hasWordsWithAttempts(allWords);
                
                return (
                  <div key={verbKey} className="verb-container">
                    <div className="verb-header">
                      <div className="verb-title">
                        <div className="verb-name">{verbData.name}</div>
                      </div>
                      <div className="verb-controls">
                        {shouldShowStartLearning ? (
                          <button onClick={() => handleStartLearning(allWords, verbKey)} className="btn-start-learning">📚 Начать обучение</button>
                        ) : (
                          <>
                            <button onClick={handlers.handleCheck} className="btn-check-group">✓ Проверить</button>
                            <button onClick={() => setInputValues({})} className="btn-reset-group">🔄 Очистить поля</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="verb-rows">
                      {pronouns.map((pronoun, pronounIndex) => (
                        <div key={pronoun.key} className={pronounIndex % 2 === 0 ? 'verb-row' : 'verb-row verb-row-even'}>
                          <span className="verb-pronoun">{pronoun.label}</span>
                          <div className="verb-words">
                            {tenses.map(tense => {
                              const key = `${pronoun.key}_${tense}`;
                              const wordText = verbData[key];
                              if (!wordText) {
                                // Если спряжение отсутствует, не показываем ячейку
                                return null;
                              }
                              const inputProps = getWordInputProps(wordText);
                              return inputProps ? <WordInput key={key} {...inputProps} /> : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </WordProvider>
        );
      }}
    </CategoryLayout>
  );
};

export default VerbConjugationCategory;
