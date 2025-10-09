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
               easy_education, mode_education, attempts_all, correct_attempts_all,
               attempts_revert, correct_attempts_revert, easy_correct, easy_correct_revert
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
        $row['attempts_revert'] = intval($row['attempts_revert']);
        $row['correct_attempts_revert'] = intval($row['correct_attempts_revert']);
        $row['easy_correct'] = intval($row['easy_correct']);
        $row['easy_correct_revert'] = intval($row['easy_correct_revert']);
        
        $user_words_data[$row['dict_word_id']] = $row;
    }

    return $user_words_data;
}

/**
 * Сбросить прогресс категории - установить easy_education = 1 для всех слов категории
 * @param int $user_id ID пользователя
 * @param int $category_id ID категории
 * @return bool Результат операции
 */
function reset_category_progress($user_id, $category_id) {
    global $wpdb;
    
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    
    // Получаем все слова из категории
    $word_ids = $wpdb->get_col($wpdb->prepare("
        SELECT w.id 
        FROM $words_table AS w
        INNER JOIN $word_category_table AS wc ON w.id = wc.word_id
        WHERE wc.category_id = %d
    ", $category_id));
    
    if (empty($word_ids)) {
        return false;
    }
    
    $placeholders = implode(',', array_fill(0, count($word_ids), '%d'));
    
    // Обновляем или создаем записи для всех слов категории
    foreach ($word_ids as $word_id) {
        // Проверяем, существует ли запись
        $exists = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) FROM $user_dict_words_table 
            WHERE user_id = %d AND dict_word_id = %d
        ", $user_id, $word_id));
        
        if ($exists) {
            // Обновляем существующую запись
            $wpdb->update(
                $user_dict_words_table,
                [
                    'easy_education' => 1,
                    'easy_correct' => 0,
                    'easy_correct_revert' => 0
                ],
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
        } else {
            // Создаем новую запись
            $wpdb->insert(
                $user_dict_words_table,
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id,
                    'attempts' => 0,
                    'correct_attempts' => 0,
                    'last_shown' => '0000-00-00 00:00:00',
                    'easy_education' => 1,
                    'mode_education' => 0,
                    'attempts_all' => 0,
                    'correct_attempts_all' => 0,
                    'attempts_revert' => 0,
                    'correct_attempts_revert' => 0,
                    'easy_correct' => 0,
                    'easy_correct_revert' => 0
                ]
            );
        }
    }
    
    return true;
}

