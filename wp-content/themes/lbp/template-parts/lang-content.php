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

$page_184 = get_post(184);
$page_187 = get_post(187);
$content_184 = '';
$content_187 = '';
if ($page_184 && $page_184->post_status === 'publish') {
    global $post;
    $post = $page_184;
    setup_postdata($post);
    ob_start();
    the_content();
    $content_184 = ob_get_clean();
    wp_reset_postdata();
    $content_184 = do_shortcode($content_184);
}
if ($page_187 && $page_187->post_status === 'publish') {
    global $post;
    $post = $page_187;
    setup_postdata($post);
    ob_start();
    the_content();
    $content_187 = ob_get_clean();
    wp_reset_postdata();
    $content_187 = do_shortcode($content_187);
}

$wptb_registered = shortcode_exists('wptb');
$content_184_has_raw_shortcode = $content_184 && strpos($content_184, '[wptb') !== false;
$content_187_has_raw_shortcode = $content_187 && strpos($content_187, '[wptb') !== false;
$use_iframe_184 = !$wptb_registered && $content_184_has_raw_shortcode;
$use_iframe_187 = !$wptb_registered && $content_187_has_raw_shortcode;
$url_184 = $page_184 && $page_184->post_status === 'publish' ? get_permalink(184) : '';
$url_187 = $page_187 && $page_187->post_status === 'publish' ? get_permalink(187) : '';
?>

<div class="lang-content-buttons <?=$lang !== 'LV'?'d-none':''?>">
    <button type="button" class="lang-modal-btn" data-modal="lang-modal-184">Общая грамматика</button>
    <button type="button" class="lang-modal-btn" data-modal="lang-modal-187">Понятия</button>
</div>

<div id="lang-modal-184" class="lang-modal-overlay" aria-hidden="true">
    <div class="lang-modal-wrap">
        <button type="button" class="lang-modal-close" aria-label="Закрыть">&times;</button>
        <?php if ($use_iframe_184 && $url_184) : ?>
        <iframe class="lang-modal-iframe" src="<?php echo esc_url($url_184); ?>" title="Общая грамматика"></iframe>
        <?php else : ?>
        <div class="lang-modal-content"><?php echo $content_184; ?></div>
        <?php endif; ?>
    </div>
</div>
<div id="lang-modal-187" class="lang-modal-overlay" aria-hidden="true">
    <div class="lang-modal-wrap">
        <button type="button" class="lang-modal-close" aria-label="Закрыть">&times;</button>
        <?php if ($use_iframe_187 && $url_187) : ?>
        <iframe class="lang-modal-iframe" src="<?php echo esc_url($url_187); ?>" title="Понятия"></iframe>
        <?php else : ?>
        <div class="lang-modal-content"><?php echo $content_187; ?></div>
        <?php endif; ?>
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
    document.querySelectorAll(".lang-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-modal");
        const modal = document.getElementById(id);
        if (modal) { modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
      });
    });
    document.querySelectorAll(".lang-modal-overlay .lang-modal-close, .lang-modal-overlay").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target === el || e.target.classList.contains("lang-modal-close")) {
          const overlay = el.closest(".lang-modal-overlay") || el;
          overlay.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "";
        }
      });
    });
    document.querySelectorAll(".lang-modal-wrap").forEach(wrap => {
      wrap.addEventListener("click", (e) => e.stopPropagation());
    });

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
