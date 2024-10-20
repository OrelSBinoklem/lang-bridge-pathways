<?php


// Парсим слова из JSON

function register_custom_admin_menu() {
    add_menu_page(
        'JSON Parser',         // Название страницы
        'JSON Parser',         // Название меню
        'manage_options',      // Способность
        'json-parser',         // Слаг страницы
        'json_parser_page',    // Функция, которая отображает содержимое страницы
        'dashicons-admin-tools', // Иконка меню
        20                     // Позиция в меню
    );
}

add_action('admin_menu', 'register_custom_admin_menu');

function json_parser_page() {
    ?>
    <div class="wrap">
        <h1>JSON Parser</h1>
        <form method="post" action="">
            <input type="hidden" name="json_parser_action" value="parse_json">
            <input type="submit" class="button button-primary" value="Parse JSON">
        </form>
    </div>
    <?php

    // Обработка отправки формы
    if (isset($_POST['json_parser_action']) && $_POST['json_parser_action'] === 'parse_json') {
        // Укажите путь к вашему JSON файлу
        $json_file = get_template_directory() . '/system/dictionaries/Russko-angliyskiy-britanskiy_slovar_3000_slov_Kirillicheskaya_transliteratsiya-result.json';
        add_words_from_json($json_file, 'RU', 'EN', 'Русско-Английский (Британский)', 3000, 3);
        echo '<div class="notice notice-success is-dismissible"><p>JSON data has been parsed and inserted.</p></div>';
    }
}

function add_words_from_json($json_file, $lang, $learn_lang, $name, $words, $level) {
    global $wpdb;
    $json_data = file_get_contents($json_file);
    $data = json_decode($json_data, true);


    $table_name = $wpdb->prefix . 'dictionaries';
    $wpdb->insert(
        $table_name,
        array(
            'name' => $name,
            'lang' => $lang,
            'learn_lang' => $learn_lang,
            'words' => $words,
            'level' => 3,
        ),
        array(
            '%s',
            '%s',
            '%s',
            '%d',
            '%d',
        )
    );

    $id_dictionary = $wpdb->insert_id;

    add_words_recursion($data, $id_dictionary, null, $learn_lang);
}










function add_words_recursion($data, $id_dictionary, $parent_category_id = null, $learn_lang) {
    global $wpdb;
    $indexWord = 0;

    foreach ($data as $item) {
        $isCategory1 = isset($item['category']) || isset($item['sub_category']);

        if($isCategory1) {
            $table_name = $wpdb->prefix . 'd_categories';
            $wpdb->insert(
                $table_name,
                array(
                    'dictionary_id' => $id_dictionary,
                    'name' => $item['category'] ?? $item['sub_category'],
                    'parent_id' => $parent_category_id,
                ),
                array(
                    '%d',
                    '%s',
                    '%d'
                )
            );

            $current_category_id = $wpdb->insert_id;

            add_words_recursion($item['sub_catgories'] ?? $item['catgories'] ?? $item['words'], $id_dictionary, $current_category_id, $learn_lang);
        } else {
            $table_name = $wpdb->prefix . 'd_words';
            $wpdb->insert(
                $table_name,
                array(
                    'dictionary_id' => $id_dictionary,
                    'word' => $item['word'],
                    'learn_lang' => $learn_lang,
                    'is_phrase' => count(preg_split("/[\s,]+/", $item['word'])) > 1 ? 1 : 0,
                    'translation_1' => is_array($item['translated']) ? $item['translated'][0] : $item['translated'],
                    'translation_2' => is_array($item['translated']) && isset($item['translated'][1]) ? $item['translated'][1] : null,
                    'translation_3' => is_array($item['translated']) && isset($item['translated'][2]) ? $item['translated'][2] : null,
                    'difficult_translation' => $item['difficult_translation'] ?? null,
                    'sound_url' => $item['sound'] ?? null,
                    'level' => $item['level'],
                    'maxLevel' => $item['maxLevel'],
                    'type' => $item['type'] ?? null,
                    'gender' => $item['gender'] ?? null,
                    'order' => ++$indexWord
                ),
                array('%d', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%d')
            );

            $id_word = $wpdb->insert_id;

            if($parent_category_id !== null) {
                $table_name = $wpdb->prefix . 'd_word_category';

                $result = $wpdb->insert(
                    $table_name,
                    array('word_id' => $id_word, 'category_id' => $parent_category_id,),
                    array('%d', '%d')
                );

                if ($result === false) {
                    error_log('Insert into word_category failed: ' . $wpdb->last_error);
                    return false;
                }
            }

            // Уникальные слова
            $table_name = $wpdb->prefix . 'unique_words';
            $sql = $wpdb->prepare("SELECT COUNT(*) FROM $table_name WHERE word = %s AND lang = %s", $item['word'], $learn_lang);
            if( $wpdb->get_var($sql) == 0) {

                $wpdb->insert(
                    $table_name,
                    array(
                        'word' => $item['word'],
                        'lang' => $learn_lang
                    ),
                    array('%s', '%s')
                );
            }
        }
    }
}