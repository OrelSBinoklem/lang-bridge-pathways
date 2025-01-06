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

