const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const FFMPEG_PATH = 'C:\\ospanel2\\addons\\FFMpeg-7.1\\ffmpeg.exe';
const BITRATE = '48k';
const AUDIO_DIRS = [
  './en/audio'
  // './lv/audio'  // закомментировано
];
const DRY_RUN = false; // true = только показать, что будет сделано
const BACKUP_DIR = './originals'; // Папка для оригиналов

console.log('=== Audio Compression Tool ===\n');
console.log(`Режим: ${DRY_RUN ? 'ТЕСТОВЫЙ (без изменений)' : 'РЕАЛЬНОЕ СЖАТИЕ'}`);
console.log(`Битрейт: ${BITRATE}`);
console.log(`Папки: ${AUDIO_DIRS.join(', ')}`);
console.log(`Бэкапы: ${BACKUP_DIR}\n`);

// Проверка ffmpeg
if (!fs.existsSync(FFMPEG_PATH)) {
  console.error(`✗ ffmpeg не найден по пути: ${FFMPEG_PATH}`);
  process.exit(1);
}
console.log(`✓ ffmpeg найден: ${FFMPEG_PATH}`);

// Создание папки для оригиналов
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✓ Создана папка для оригиналов: ${BACKUP_DIR}\n`);
} else {
  console.log(`✓ Папка для оригиналов существует: ${BACKUP_DIR}\n`);
}

let totalFiles = 0;
let processedFiles = 0;
let errorFiles = 0;
let totalSizeBefore = 0;
let totalSizeAfter = 0;

// Обработка каждой папки
AUDIO_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`⚠ Папка не найдена: ${dir}\n`);
    return;
  }

  console.log(`\n📁 Обработка: ${dir}`);
  console.log('─'.repeat(60));

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
  totalFiles += files.length;
  console.log(`Найдено MP3 файлов: ${files.length}\n`);

  files.forEach((file, index) => {
    const filePath = path.join(dir, file);
    const tempPath = path.join(dir, `temp_${file}`);
    
    // Создаём подпапку в BACKUP_DIR, соответствующую структуре
    const relativePath = path.relative('.', dir);
    const backupSubDir = path.join(BACKUP_DIR, relativePath);
    const backupPath = path.join(backupSubDir, file);

    try {
      const statsBefore = fs.statSync(filePath);
      const sizeBefore = statsBefore.size;
      totalSizeBefore += sizeBefore;

      if (!DRY_RUN) {
        // Создаём подпапку для бэкапов, если её нет
        if (!fs.existsSync(backupSubDir)) {
          fs.mkdirSync(backupSubDir, { recursive: true });
        }

        // Конвертация во временный файл
        const command = `"${FFMPEG_PATH}" -i "${filePath}" -b:a ${BITRATE} -ar 22050 -ac 1 "${tempPath}" -y -loglevel error`;
        execSync(command, { stdio: 'inherit' });

        // Проверка результата
        if (!fs.existsSync(tempPath)) {
          throw new Error('Временный файл не создан');
        }

        const statsAfter = fs.statSync(tempPath);
        const sizeAfter = statsAfter.size;
        totalSizeAfter += sizeAfter;

        // Перемещение оригинала в папку бэкапов
        if (!fs.existsSync(backupPath)) {
          fs.renameSync(filePath, backupPath);
        } else {
          // Если бэкап уже существует, просто удаляем оригинал
          fs.unlinkSync(filePath);
        }
        
        // Перемещение сжатого файла на место оригинала
        fs.renameSync(tempPath, filePath);

        const reduction = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1);
        console.log(`✓ [${index + 1}/${files.length}] ${file}`);
        console.log(`  ${(sizeBefore / 1024).toFixed(1)}KB → ${(sizeAfter / 1024).toFixed(1)}KB (−${reduction}%)`);

        processedFiles++;
      } else {
        console.log(`[${index + 1}/${files.length}] ${file} (${(sizeBefore / 1024).toFixed(1)}KB)`);
        processedFiles++;
      }
    } catch (error) {
      console.error(`✗ [${index + 1}/${files.length}] Ошибка: ${file}`);
      console.error(`  ${error.message}`);
      errorFiles++;

      // Очистка при ошибке
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  });
});

// Итоговая статистика
console.log('\n' + '═'.repeat(60));
console.log('ИТОГО:');
console.log('─'.repeat(60));
console.log(`Всего файлов: ${totalFiles}`);
console.log(`Обработано: ${processedFiles}`);
console.log(`Ошибок: ${errorFiles}`);

if (!DRY_RUN && totalSizeBefore > 0) {
  const totalReduction = ((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(1);
  console.log(`\nРазмер до:  ${(totalSizeBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Размер после: ${(totalSizeAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Экономия: ${totalReduction}% (${((totalSizeBefore - totalSizeAfter) / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`\n💡 Оригиналы сохранены в папке: ${BACKUP_DIR}`);
  console.log(`   Если всё OK, можете удалить папку вручную`);
}

console.log('\n✅ Готово!\n');

