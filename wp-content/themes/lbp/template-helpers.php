<?php
/**
 * Общие функции для шаблонов
 */

/**
 * Получает текстовое представление уровня языка
 * @param int $value Значение уровня (1-6)
 * @return string Текстовое представление уровня (A1-C2)
 */
function getLanguageLevel($value) {
    $levels = [1 => 'A1', 2 => 'A2', 3 => 'B1', 4 => 'B2', 5 => 'C1', 6 => 'C2'];
    return $levels[$value] ?? 'Invalid level';
}

/**
 * Custom Walker для меню словарей
 * Отображает только элементы меню, соответствующие выбранному языку
 */
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

/**
 * Получает текущий выбранный язык из куки или использует значение по умолчанию
 * @param string $default Язык по умолчанию (по умолчанию 'LV')
 * @return string Код языка
 */
function getSelectedLang($default = 'LV') {
    if (isset($_COOKIE['selected_lang'])) {
        return sanitize_text_field($_COOKIE['selected_lang']);
    }
    // Если есть поле lang у текущей страницы, используем его
    if (function_exists('get_field')) {
        $page_lang = get_field('lang');
        if ($page_lang) {
            return $page_lang;
        }
    }
    return $default;
}

