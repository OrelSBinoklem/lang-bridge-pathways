const fs = require('fs');
const path = require('path');

// Читаем файл
const filePath = path.join(__dirname, 'src/custom/categories/VerbConjugationCategory.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Собираем уникальные слова с переводами
const wordMap = new Map(); // word -> Set of translations

// Находим все глаголы и их переводы
// Паттерн: name: 'verb - translation' или name: "verb - translation"
const namePattern = /name:\s*['"]([^'"]+)\s*-\s*([^'"]+)['"]/g;

// Сначала собираем все глаголы с их переводами
const verbTranslations = new Map();
let match;

while ((match = namePattern.exec(content)) !== null) {
  const verbKey = match[1].trim();
  const translation = match[2].trim();
  verbTranslations.set(verbKey, translation);
}

// Теперь находим все спряжения
// Паттерн для поиска всех пар ключ-значение внутри объекта verbs
// Ищем блок от "const verbs = {" до "};"
const verbsStart = content.indexOf('const verbs = {');
if (verbsStart === -1) {
  console.error('Не найден объект verbs');
  process.exit(1);
}

// Находим конец объекта verbs
let braceCount = 0;
let inVerbs = false;
let verbsEnd = -1;

for (let i = verbsStart; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    inVerbs = true;
  } else if (content[i] === '}') {
    braceCount--;
    if (inVerbs && braceCount === 0) {
      verbsEnd = i + 1;
      break;
    }
  }
}

if (verbsEnd === -1) {
  console.error('Не удалось найти конец объекта verbs');
  process.exit(1);
}

// Извлекаем блок с глаголами
const verbsBlock = content.substring(verbsStart, verbsEnd);

// Только глаголы из строк 787-1072
const allowedVerbs = ['zagt', 'krist', 'laist', 'kliegt', 'sēdēt', 'dzīt', 'kost', 'raut', 'plest', 'liegt', 'spiest', 'snigt', 'rasties'];

// Теперь находим все глаголы и их спряжения
// Паттерн для поиска блока глагола: 'verbKey': { ... }
const verbBlockPattern = /['"]([^'"]+)['"]:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;

while ((match = verbBlockPattern.exec(verbsBlock)) !== null) {
  const verbKey = match[1];
  
  // Пропускаем глаголы, которые не в списке разрешенных
  if (!allowedVerbs.includes(verbKey)) {
    continue;
  }
  
  const verbBlock = match[2];
  
  // Получаем перевод для этого глагола
  const translation = verbTranslations.get(verbKey) || '';
  
  // Находим все спряжения в блоке глагола
  // Паттерн: 'key': 'value' или "key": "value"
  const conjugationPattern = /['"]([^'"]+)['"]:\s*['"]([^'"]+)['"]/g;
  
  let conjugationMatch;
  while ((conjugationMatch = conjugationPattern.exec(verbBlock)) !== null) {
    const key = conjugationMatch[1];
    const value = conjugationMatch[2].trim();
    
    // Пропускаем name и пустые значения
    if (key === 'name' || !value || value === '-' || value.trim() === '') {
      continue;
    }
    
    const word = value.trim();
    
    // Добавляем слово в Map
    if (!wordMap.has(word)) {
      wordMap.set(word, new Set());
    }
    
    // Добавляем перевод к слову
    if (translation) {
      wordMap.get(word).add(translation);
    }
  }
}

// Сортируем слова по алфавиту
const sortedWords = Array.from(wordMap.entries()).sort((a, b) => {
  return a[0].localeCompare(b[0], 'lv'); // Сортировка по латышскому алфавиту
});

// Создаем CSV
let csv = 'word,translation\n';
for (const [word, translations] of sortedWords) {
  // Объединяем все переводы через запятую
  const translationStr = Array.from(translations).join(', ');
  // Экранируем кавычки в CSV
  const escapedWord = word.includes(',') || word.includes('"') ? `"${word.replace(/"/g, '""')}"` : word;
  const escapedTranslation = translationStr.includes(',') || translationStr.includes('"') ? `"${translationStr.replace(/"/g, '""')}"` : translationStr;
  csv += `${escapedWord},${escapedTranslation}\n`;
}

// Сохраняем CSV
const outputPath = path.join(__dirname, 'verbs_unique_conjugations_787_1072.csv');
fs.writeFileSync(outputPath, csv, 'utf8');

console.log(`✅ Создан файл: ${outputPath}`);
console.log(`📊 Всего уникальных слов: ${sortedWords.length}`);
