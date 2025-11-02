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

<div class="useful-links <?=$lang !== 'LV'?'d-none':''?>">
    <h2>Полезные ссылки</h2>
    <a href="https://maciunmacies.valoda.lv/16-un-vairak" target="_blank" class="highlighted-link">Главный сайт где всё! (примеры экзаменов, озвучка заданий учебника Laipa, ссылки на интерактивные задания)</a>
    <a href="https://www.viaa.gov.lv/lv/parbaudes-programma" target="_blank" class="highlighted-link">Примеры экзаменов - Если нет программы Word, чтобы открыть без багов файлы, то установите LibreOffice</a>
    <a href="https://elaipa.lv/Home/A1" target="_blank" class="highlighted-link">Elaipa (лучшие интерактивные задания с проверкой)</a>
    <a href="https://www.gramatika.lv/" target="_blank" class="highlighted-link">Gramatika (чей-то незаконченный сайт по грамматике)</a>
    <a href="https://aic.lv/izglitiba-latvija/izglitibas-sistema/" target="_blank">Система образования в Латвии!!!</a>
    <a href="https://epupa.valoda.lv/" target="_blank">Словарь с примерами использования слов и склонениями!!!</a>
    <a href="https://forvo.com/languages/lv/" target="_blank">Словарь с озвучкой</a>
    <a href="https://www.valodukursi.lv/en/language-training-courses-classes-lessons/latvian-for-foreigners" target="_blank">Платный разговорный клуб</a>
    <a href="https://t.me/uaenlv" target="_blank">Бесплатный для беженцев разговорный клуб</a>
    <a href="https://www.youtube.com/@%D0%9B%D0%B0%D1%82%D1%8B%D1%88%D1%81%D0%BA%D0%B8%D0%B9_%D0%B1%D0%B5%D0%B7_%D0%B7%D1%83%D0%B1%D1%80%D1%91%D0%B6%D0%BA%D0%B8/videos" target="_blank">Расказы в картинках с переводом (Канал: Латышский без зубрёжки!)</a>
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
