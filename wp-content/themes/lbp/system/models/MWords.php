<?php

function get_user_word_status($user_id) {
    global $wpdb;

    $unique_words_table = $wpdb->prefix . 'unique_words';
    $user_words_table = $wpdb->prefix . 'user_words';

    // SQL-запрос с LEFT JOIN
    $query = $wpdb->prepare("
        SELECT uw.word,
               CASE
                   WHEN uwt.correct_attempts >= 2 THEN true
                   ELSE false
               END AS is_learned
        FROM $unique_words_table AS uw
        LEFT JOIN $user_words_table AS uwt
        ON uw.id = uwt.unique_word_id AND uwt.user_id = %d
    ", $user_id);

    // Выполнение запроса и получение результатов
    $results = $wpdb->get_results($query, ARRAY_A);

    // Возвращаем массив слов с их статусом
    return $results;
}

function get_user_word_status_by_dictionary($user_id, $dictionary_id) {
    global $wpdb;

    $unique_words_table = $wpdb->prefix . 'unique_words';
    $user_words_table = $wpdb->prefix . 'user_words';
    $words_table = $wpdb->prefix . 'd_words';

    $query = $wpdb->prepare("
        SELECT uw.word,
               CASE
                   WHEN uwt.correct_attempts >= 2 THEN true
                   ELSE false
               END AS is_learned
        FROM $unique_words_table AS uw
        INNER JOIN $words_table AS dw
        ON uw.word = dw.word AND uw.lang = dw.learn_lang
        LEFT JOIN $user_words_table AS uwt
        ON uw.id = uwt.unique_word_id AND uwt.user_id = %d
        WHERE dw.dictionary_id = %d
    ", $user_id, $dictionary_id);

    return $wpdb->get_results($query, ARRAY_A);
}

/**
 * Получает данные пользователя из таблицы user_dict_words для определённого словаря
 * @param int $user_id ID пользователя
 * @param int $dictionary_id ID словаря
 * @return array Массив данных пользователя, индексированный по dict_word_id
 */
function get_user_dict_words_data($user_id, $dictionary_id) {
    global $wpdb;
    
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $words_table = $wpdb->prefix . 'd_words';
    
    $query = $wpdb->prepare("
        SELECT dict_word_id, attempts, correct_attempts, last_shown, 
               easy_education, mode_education, attempts_all, correct_attempts_all
        FROM $user_dict_words_table 
        WHERE user_id = %d AND dict_word_id IN (
            SELECT id FROM $words_table WHERE dictionary_id = %d
        )
    ", $user_id, $dictionary_id);

    $results = $wpdb->get_results($query, ARRAY_A);
    
    // Преобразуем в объект для удобства поиска по dict_word_id и приводим типы
    $user_words_data = [];
    foreach ($results as $row) {
        // Приводим числовые поля к правильным типам
        $row['dict_word_id'] = intval($row['dict_word_id']);
        $row['attempts'] = intval($row['attempts']);
        $row['correct_attempts'] = intval($row['correct_attempts']);
        $row['easy_education'] = intval($row['easy_education']);
        $row['mode_education'] = intval($row['mode_education']);
        $row['attempts_all'] = intval($row['attempts_all']);
        $row['correct_attempts_all'] = intval($row['correct_attempts_all']);
        
        $user_words_data[$row['dict_word_id']] = $row;
    }

    return $user_words_data;
}

