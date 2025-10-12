require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const slugify = require("slugify");

// ✅ Настройки slugify
slugify.extend({
  "#": "-number-",
  "@": "-at-",
  "!": "-excl-",
  "?": "-q-",
  "&": "-and-",
  "%": "-percent-",
  "$": "-dollar-",
  "’": "-",
  "'": "-",
  "ā": "aa",
  "č": "ch",
  "ē": "ee",
  "ģ": "gj",
  "ī": "ii",
  "ķ": "kj",
  "ļ": "lj",
  "ņ": "nj",
  "š": "sh",
  "ū": "uu",
  "ž": "zh",
  "Ā": "Aa",
  "Č": "Ch",
  "Ē": "Ee",
  "Ģ": "Gj",
  "Ī": "Ii",
  "Ķ": "Kj",
  "Ļ": "Lj",
  "Ņ": "Nj",
  "Š": "Sh",
  "Ū": "Uu",
  "Ž": "Zh"
});

const AUDIO_DIR = path.join(__dirname, "lv/audio");
const JSON_FILE_PATH = path.join(__dirname, "lv/dictionary_9.json");
const LISTNR_API_URL = "https://bff.listnr.tech/api/tts/v1/convert-text";

// ✅ Параметры
const VOICE_ID = "lv-lv-Standard-A"; // Проверьте ID латышского голоса
const AUDIO_FORMAT = "mp3";

// 🔹 **Настройки диапазона обработки**
const START_INDEX = 6000; // Начать с этого индекса
const WORD_COUNT = 1000;  // Количество слов для обработки

// 📂 Создаём папку audio, если её нет
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// 📥 Загружаем JSON
const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, "utf8"));

// 🔥 **Удаление дублей** по `slugify`
const uniqueWords = new Map();

data.forEach((item) => {
  if (item.word) {
    let cleanWord = item.word.trim().replace(/[\?!\.]+$/, "").trim();
    let slugifiedWord = slugify(cleanWord, { lower: true, strict: true });

    if (!uniqueWords.has(slugifiedWord)) {
      uniqueWords.set(slugifiedWord, { ...item, word: cleanWord });
    }
  }
});

// 📌 Конвертируем обратно в массив
const uniqueData = Array.from(uniqueWords.values());

console.log(`🔍 Уникальных слов: ${uniqueData.length}`);

// ✂️ **Фильтруем слова по диапазону**
const wordsToProcess = uniqueData.slice(START_INDEX, START_INDEX + WORD_COUNT);
console.log(`🎯 Обрабатываем слова с ${START_INDEX} по ${START_INDEX + WORD_COUNT - 1}`);

// 🔹 **Функция для запроса в Listnr API**
async function synthesizeSpeech(word) {
  try {
    const response = await axios.post(
      LISTNR_API_URL,
      {
        voice: VOICE_ID,
        ssml: `<speak><prosody rate="slow"><p>${word}</p></prosody></speak>`,
        audioFormat: AUDIO_FORMAT,
		audioSampleRate: 48000
      },
      {
        headers: {
          "x-listnr-token": process.env.LISTNR_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

	//console.log("📦 Ответ от API:", response.data);

    return response.data.url; // Возвращает ссылку на MP3
  } catch (error) {
    console.error(`❌ Ошибка озвучки "${word}":`, error.response?.data || error.message);
    return null;
  }
}

// 🎵 **Функция для скачивания MP3-файла**
async function downloadAudio(url, filePath) {
  try {
    console.log(`🔗 Загружаем MP3: ${url}`);

    const response = await axios.get(url, { responseType: "stream" });

    if (response.status !== 200) {
      console.error(`❌ Ошибка загрузки MP3! Код: ${response.status}`);
      return;
    }

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`✅ Файл сохранён: ${filePath}`);
        resolve();
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`❌ Ошибка загрузки MP3:`, error.message);
  }
}


// 🚀 **Основной процесс**
(async () => {
  for (const item of wordsToProcess) {
    if (item.word) {
      console.log(`🎤 Озвучиваем: ${item.word}`);

      // 🔥 Получаем ссылку на MP3-файл
      const audioUrl = await synthesizeSpeech(item.word);
      if (!audioUrl) continue;

      // 🏷 **Генерируем имя файла**
      const fileName = slugify(item.word, { lower: true, strict: true }) + ".mp3";
      const filePath = path.join(AUDIO_DIR, fileName);

      // 📥 **Скачиваем и сохраняем MP3-файл**
	  //console.log(`🔗 Получен URL MP3: ${audioUrl}`);
	  //console.log(`📥 Скачиваем в: ${filePath}`);


      await downloadAudio(audioUrl, filePath);
      console.log(`✅ Файл сохранён: ${fileName}`);
    }
  }
})();
