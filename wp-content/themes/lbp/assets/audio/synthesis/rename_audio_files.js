const fs = require('fs');
const path = require('path');

// Конфигурация
const JSON_FILE = './c2.json';
const AUDIO_DIR = './en';
const DRY_RUN = false; // Установите false для реального переименования

console.log('=== Audio Files Renamer ===\n');
console.log(`Режим: ${DRY_RUN ? 'ТЕСТОВЫЙ (без изменений)' : 'РЕАЛЬНОЕ ПЕРЕИМЕНОВАНИЕ'}\n`);

// Читаем JSON
let wordsData;
try {
  const jsonContent = fs.readFileSync(JSON_FILE, 'utf8');
  wordsData = JSON.parse(jsonContent);
  console.log(`✓ Загружено ${wordsData.length} записей из JSON\n`);
} catch (error) {
  console.error(`✗ Ошибка чтения JSON файла: ${error.message}`);
  process.exit(1);
}

// Создаём карту ID -> слово
const soundMap = new Map();
const duplicates = new Map(); // Для отслеживания дубликатов

wordsData.forEach((item, index) => {
  if (item.sound) {
    const soundId = item.sound.toString();
    const word = item.word.toLowerCase().replace(/\s+/g, '_');
    
    // Проверяем дубликаты
    if (soundMap.has(soundId)) {
      if (!duplicates.has(soundId)) {
        duplicates.set(soundId, [soundMap.get(soundId)]);
      }
      duplicates.get(soundId).push(word);
    }
    
    soundMap.set(soundId, word);
  }
});

console.log(`✓ Создана карта для ${soundMap.size} звуковых файлов\n`);

// Показываем дубликаты если есть
if (duplicates.size > 0) {
  console.warn(`⚠ Обнаружено ${duplicates.size} ID с дубликатами:`);
  let count = 0;
  for (const [id, words] of duplicates) {
    console.warn(`  ID ${id}: ${words.join(', ')}`);
    count++;
    if (count >= 10) {
      console.warn(`  ... и ещё ${duplicates.size - 10}`);
      break;
    }
  }
  console.log('');
}

// Читаем файлы в папке
let audioFiles;
try {
  audioFiles = fs.readdirSync(AUDIO_DIR).filter(file => file.endsWith('.mp3'));
  console.log(`✓ Найдено ${audioFiles.length} MP3 файлов в папке ${AUDIO_DIR}\n`);
} catch (error) {
  console.error(`✗ Ошибка чтения папки: ${error.message}`);
  process.exit(1);
}

// Статистика
const stats = {
  renamed: 0,
  skipped: 0,
  errors: 0,
  notFound: []
};

console.log('--- Начинаем переименование ---\n');

// Переименовываем файлы
audioFiles.forEach(filename => {
  const soundId = path.basename(filename, '.mp3');
  
  if (!soundMap.has(soundId)) {
    stats.notFound.push(soundId);
    stats.skipped++;
    console.log(`⊘ Пропущен: ${filename} (ID ${soundId} не найден в JSON)`);
    return;
  }
  
  const newWord = soundMap.get(soundId);
  const newFilename = `${newWord}.mp3`;
  const oldPath = path.join(AUDIO_DIR, filename);
  const newPath = path.join(AUDIO_DIR, newFilename);
  
  // Проверяем, не существует ли уже файл с таким именем
  if (fs.existsSync(newPath) && oldPath !== newPath) {
    console.log(`⚠ Пропущен: ${filename} → ${newFilename} (файл уже существует)`);
    stats.skipped++;
    return;
  }
  
  // Если имя не изменилось
  if (filename === newFilename) {
    console.log(`→ Без изменений: ${filename}`);
    stats.skipped++;
    return;
  }
  
  try {
    if (!DRY_RUN) {
      fs.renameSync(oldPath, newPath);
    }
    console.log(`✓ ${filename} → ${newFilename}`);
    stats.renamed++;
  } catch (error) {
    console.error(`✗ Ошибка: ${filename} → ${newFilename}: ${error.message}`);
    stats.errors++;
  }
});

// Итоговая статистика
console.log('\n=== ИТОГИ ===');
console.log(`Переименовано: ${stats.renamed}`);
console.log(`Пропущено: ${stats.skipped}`);
console.log(`Ошибок: ${stats.errors}`);

if (stats.notFound.length > 0) {
  console.log(`\nФайлы без соответствия в JSON (${stats.notFound.length}):`);
  stats.notFound.slice(0, 20).forEach(id => console.log(`  - ${id}.mp3`));
  if (stats.notFound.length > 20) {
    console.log(`  ... и ещё ${stats.notFound.length - 20}`);
  }
}

if (DRY_RUN) {
  console.log('\n⚠ Это был ТЕСТОВЫЙ запуск. Файлы не были изменены.');
  console.log('Для реального переименования установите DRY_RUN = false в скрипте.');
}

console.log('\n=== Готово ===');

