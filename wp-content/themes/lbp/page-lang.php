<?php
/*
Template Name: Lang
*/
?>

<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php wp_title(); ?></title>
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="wrap">
    <?php get_header(); ?>

    <div class="site-content">



        <?php

        function getLanguageLevel($value) {$levels = [1 => 'A1', 2 => 'A2', 3 => 'B1', 4 => 'B2', 5 => 'C1', 6 => 'C2'];
            return $levels[$value] ?? 'Invalid level'; // Если значение не в диапазоне 1–6
        }

        $lang = get_field('lang');
        class Custom_Nav_Walker extends Walker_Nav_Menu {
            // Start Element Output
            function start_el(&$output, $item, $depth = 0, $args = array(), $id = 0) {
                global $lang;



                $post_id = $item->object_id; // ID объекта меню (поста или страницы)
                if($lang === get_field('learn_lang', $post_id) ) {
                    $classes = empty($item->classes) ? array() : (array) $item->classes;
                    $class_names = join(' ', apply_filters('nav_menu_css_class', array_filter($classes), $item));



                    $class_names = ' class="' . esc_attr($class_names) . '"';
                    $output .= '<li id="menu-item-'. $item->ID . '"' . $class_names .'>';

                    $attributes  = ! empty( $item->attr_title ) ? ' title="'  . esc_attr( $item->attr_title ) .'"' : '';
                    $attributes .= ! empty( $item->target )     ? ' target="' . esc_attr( $item->target     ) .'"' : '';
                    $attributes .= ! empty( $item->xfn )        ? ' rel="'    . esc_attr( $item->xfn        ) .'"' : '';
                    $attributes .= ! empty( $item->url )        ? ' href="'   . esc_attr( $item->url        ) .'"' : '';

                    $item_output = $args->before;
                    $item_output .= '<a'. $attributes .'>';

                    /*вывод доп инфы к ссылкам*/
                    $levelStart = get_field('level', $post_id);
                    $levelEnd = get_field('maxlevel', $post_id);
                    $wordsCnt = get_field('words', $post_id);
                    $existSound = get_field('sound', $post_id);


                    $item_output .= "<span class='menu-dictionaries-level'>";
                    $item_output .= "<span class='menu-dictionaries-level-start'>" . getLanguageLevel($levelStart) . "</span>";
                    $item_output .= getLanguageLevel($levelStart) !== getLanguageLevel($levelEnd) ? "<span class='menu-dictionaries-level-end'> - " . getLanguageLevel($levelEnd) . "</span>" : "";
                    $item_output .= "</span>";
                    /*\вывод доп инфы к ссылкам*/


                    $item_output .= '<h2>';
                    $item_output .= $args->link_before . apply_filters('the_title', $item->title, $item->ID) . $args->link_after;
                    $item_output .= '</h2>';


                    $item_output .= "<span class='menu-dictionaries-cnt'>{$wordsCnt}</span>";
                    $item_output .= "<span class='menu-dictionaries-exist-sound'>" . ($existSound?'Озвучка есть':'Озвучки нету') . "</span>";


                    $item_output .= '</a>';

                    $item_output .= $args->after;

                    $output .= apply_filters('walker_nav_menu_start_el', $item_output, $item, $depth, $args);
                }


            }
        }

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
            <a href="https://maciunmacies.valoda.lv/16-un-vairak" target="_blank">Главный сайт где всё! (примеры экзаменов, озвучка заданий учебника Laipa, ссылки на интерактивные задания)</a>
            <a href="https://www.viaa.gov.lv/lv/parbaudes-programma" target="_blank">Примеры экзаменов</a>
            <a href="https://elaipa.lv/Home/A1" target="_blank">Elaipa (лучшие интерактивные задания с проверкой)</a>
            <a href="https://www.gramatika.lv/" target="_blank">Gramatika (чей-то незаконченный сайт по грамматике)</a>
            <a href="https://aic.lv/izglitiba-latvija/izglitibas-sistema/" target="_blank">Система образования в Латвии!!!</a>
            <a href="https://epupa.valoda.lv/" target="_blank">Словарь с примерами использования слов и склонениями!!!</a>
            <a href="https://forvo.com/languages/lv/" target="_blank">Словарь с озвучкой</a>
            <a href="https://www.valodukursi.lv/en/language-training-courses-classes-lessons/latvian-for-foreigners" target="_blank">Платный разговорный клуб</a>
            <a href="https://t.me/uaenlv" target="_blank">Бесплатный для беженцев разговорный клуб</a>
            <a href="https://www.youtube.com/@%D0%9B%D0%B0%D1%82%D1%8B%D1%88%D1%81%D0%BA%D0%B8%D0%B9_%D0%B1%D0%B5%D0%B7_%D0%B7%D1%83%D0%B1%D1%80%D1%91%D0%B6%D0%BA%D0%B8/videos" target="_blank">Расказы в картинках с переводом (Канал: Латышский без зубрёжки!)</a>
        </div>




        <div id="react-app-lang"></div><!-- #react-app-dictionary -->

    </div>

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

    <?php get_footer(); ?>
</div>

</body>
</html>