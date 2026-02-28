<?php
/**
 * Template part для отображения контента языка (меню словарей, полезные ссылки, React-контейнер)
 * Используется в index.php и page-lang.php
 */

// Получаем язык из куки или используем LV по умолчанию
global $lang;
$lang = getSelectedLang('LV');

// Use the custom walker in your wp_nav_menu
wp_nav_menu(array(
    'theme_location' => 'menu-dictionaries', // Используйте слаг меню
    'menu_id'        => 'menu-dictionaries', // Произвольный ID для HTML
    'menu_class'     => 'menu-dictionaries', // Произвольный класс для HTML
    'walker'         => new Custom_Nav_Walker()
));

?>

<div class="lang-content-buttons <?=$lang !== 'LV'?'d-none':''?>">
    <button type="button" class="btn btn-outline-primary lang-modal-btn" data-bs-toggle="modal" data-bs-target="#lang-modal-184">Общая грамматика</button>
    <button type="button" class="btn btn-outline-primary lang-modal-btn" data-bs-toggle="modal" data-bs-target="#lang-modal-187">Понятия</button>
</div>

<div id="lang-modal-184" class="modal fade" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Общая грамматика</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
            </div>
            <div id="lang-modal-184-content" class="modal-body lang-modal-content"></div>
        </div>
    </div>
</div>
<div id="lang-modal-187" class="modal fade" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Понятия</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
            </div>
            <div id="lang-modal-187-content" class="modal-body lang-modal-content"></div>
        </div>
    </div>
</div>

<div class="useful-links <?=$lang !== 'LV'?'d-none':''?>">
    <h2>Полезные ссылки</h2>
    <a href="https://elaipa.lv/Home/A1" target="_blank" class="highlighted-link">Elaipa (лучшие интерактивные задания с проверкой)</a>
    <a href="<?php echo esc_url(get_stylesheet_directory_uri() . '/assets/progress_latvieshu.xlsx'); ?>" download class="highlighted-link download-link">Скачать: Ексель файл для самоконтроля прогресса на сайте Elaipa (можно портировать в Google таблицы)</a>
    <a href="https://ru.glosbe.com/%D1%81%D0%BB%D0%BE%D0%B2%D0%B0%D1%80%D1%8C-%D0%BB%D0%B0%D1%82%D1%8B%D1%88%D1%81%D0%BA%D0%B8%D0%B9-%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9" target="_blank" class="highlighted-link">Словарь (большой) с примерами использования слов и переводом</a>
    <a href="https://maciunmacies.valoda.lv/16-un-vairak" target="_blank" class="highlighted-link">Главный сайт где всё! (примеры экзаменов, озвучка заданий учебника Laipa, ссылки на интерактивные задания)</a>
    <a href="https://www.viaa.gov.lv/lv/parbaudes-programma" target="_blank" class="highlighted-link">Примеры экзаменов - Если нет программы Word, чтобы открыть без багов файлы, то установите LibreOffice</a>
    <a href="https://www.gramatika.lv/" target="_blank">Gramatika (чей-то незаконченный сайт по грамматике)</a>
    <a href="https://www.dokobit.com/lv/" target="_blank">Dokobit - можно подписать документы для подачи заявления на экзамен</a>
    <a href="https://www.facebook.com/resume.lv.lv/videos/3554350828015245/" target="_blank">Dokobit - видео как подписать!</a>
    <a href="https://epupa.valoda.lv/" target="_blank">Словарь с примерами использования слов и склонениями</a>
    <a href="https://forvo.com/languages/lv/" target="_blank">Словарь с озвучкой</a>
    <a href="https://www.valodukursi.lv/en/language-training-courses-classes-lessons/latvian-for-foreigners" target="_blank">Платный разговорный клуб</a>
    <a href="https://t.me/uaenlv" target="_blank">Бесплатный для беженцев разговорный клуб (как обычный курс с заданиями!)</a>
    <a href="https://www.youtube.com/@%D0%9B%D0%B0%D1%82%D1%8B%D1%88%D1%81%D0%BA%D0%B8%D0%B9_%D0%B1%D0%B5%D0%B7_%D0%B7%D1%83%D0%B1%D1%80%D1%91%D0%B6%D0%BA%D0%B8/videos" target="_blank">Расказы в картинках с переводом (Канал: Латышский без зубрёжки!)</a>
    <a href="https://aic.lv/izglitiba-latvija/izglitibas-sistema/" target="_blank">Система образования в Латвии!!!</a>
</div>

<div id="react-app-lang" data-lang="<?php echo esc_attr($lang); ?>"></div><!-- #react-app-lang -->

<script>
  document.addEventListener("DOMContentLoaded", () => {
    const blocks = document.querySelectorAll(".menu-dictionaries h2");

    if (blocks.length === 0) return;

    // Функция для расчета и установки максимальной ширины
    const setMaxWidth = () => {
      let maxWidth = 0;

      // Сбросить ширину перед пересчетом (для корректной работы на адаптиве)
      blocks.forEach(block => {
        block.style.width = ""; // Убираем ранее установленную ширину
      });

      // Найти максимальную ширину
      blocks.forEach(block => {
        const blockWidth = block.offsetWidth;
        if (blockWidth > maxWidth) {
          maxWidth = blockWidth;
        }
      });

      // Установить максимальную ширину для всех блоков
      blocks.forEach(block => {
        block.style.width = `${maxWidth}px`;
      });
    };

    // Выполнить расчет при загрузке страницы
    setMaxWidth();

    // Добавить обработчик на изменение размера окна
    window.addEventListener("resize", setMaxWidth);
  });
</script>
