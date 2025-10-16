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
        SELECT dict_word_id, attempts, correct_attempts, last_shown, last_shown_revert,
               easy_education, mode_education, mode_education_revert, attempts_all, correct_attempts_all,
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
        $row['mode_education_revert'] = intval($row['mode_education_revert']);
        $row['attempts_all'] = intval($row['attempts_all']);
        $row['correct_attempts_all'] = intval($row['correct_attempts_all']);
        $row['attempts_revert'] = intval($row['attempts_revert']);
        $row['correct_attempts_revert'] = intval($row['correct_attempts_revert']);
        $row['easy_correct'] = intval($row['easy_correct']);
        $row['easy_correct_revert'] = intval($row['easy_correct_revert']);
        // last_shown и last_shown_revert остаются строками (datetime)
        
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

/**
 * Создать новое слово
 * @param int $dictionary_id ID словаря
 * @param array $word_data Данные слова
 * @param array $category_ids Массив ID категорий
 * @return int|false ID созданного слова или false при ошибке
 */
function create_word($dictionary_id, $word_data, $category_ids = []) {
    global $wpdb;
    
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    
    // Получаем максимальный order для словаря
    $max_order = $wpdb->get_var($wpdb->prepare("
        SELECT MAX(`order`) FROM $words_table WHERE dictionary_id = %d
    ", $dictionary_id));
    
    $order = $max_order ? intval($max_order) + 1 : 1;
    
    // Получаем язык словаря
    $dictionary = $wpdb->get_row($wpdb->prepare("
        SELECT learn_lang FROM {$wpdb->prefix}dictionaries WHERE id = %d
    ", $dictionary_id), ARRAY_A);
    
    if (!$dictionary) {
        return false;
    }
    
    // Обрабатываем данные для корректной вставки
    $level = !empty($word_data['level']) ? intval($word_data['level']) : null;
    $maxLevel = !empty($word_data['maxLevel']) ? intval($word_data['maxLevel']) : 1;
    
    // Валидация уровня (должен быть от 1 до 6)
    if ($level !== null && ($level < 1 || $level > 6)) {
        $level = null;
    }
    if ($maxLevel < 1 || $maxLevel > 6) {
        $maxLevel = 1;
    }
    
    // Создаем слово
    $result = $wpdb->insert(
        $words_table,
        [
            'dictionary_id' => $dictionary_id,
            'word' => $word_data['word'],
            'learn_lang' => $dictionary['learn_lang'],
            'is_phrase' => isset($word_data['is_phrase']) ? intval($word_data['is_phrase']) : 0,
            'translation_1' => $word_data['translation_1'],
            'translation_2' => !empty($word_data['translation_2']) ? $word_data['translation_2'] : null,
            'translation_3' => !empty($word_data['translation_3']) ? $word_data['translation_3'] : null,
            'difficult_translation' => !empty($word_data['difficult_translation']) ? $word_data['difficult_translation'] : null,
            'sound_url' => !empty($word_data['sound_url']) ? $word_data['sound_url'] : null,
            'level' => $level,
            'maxLevel' => $maxLevel,
            'type' => !empty($word_data['type']) ? $word_data['type'] : null,
            'gender' => !empty($word_data['gender']) ? $word_data['gender'] : null,
            'order' => $order
        ]
    );
    
    if (!$result) {
        return false;
    }
    
    $word_id = $wpdb->insert_id;
    
    // Добавляем связи с категориями
    if (!empty($category_ids)) {
        foreach ($category_ids as $category_id) {
            $wpdb->insert(
                $word_category_table,
                [
                    'word_id' => $word_id,
                    'category_id' => $category_id
                ]
            );
        }
    }
    
    return $word_id;
}

/**
 * Удалить слово
 * @param int $word_id ID слова
 * @return bool Результат операции
 */
function delete_word($word_id) {
    global $wpdb;
    
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    
    // Удаляем связи с категориями
    $wpdb->delete(
        $word_category_table,
        ['word_id' => $word_id],
        ['%d']
    );
    
    // Удаляем пользовательские данные
    $wpdb->delete(
        $user_dict_words_table,
        ['dict_word_id' => $word_id],
        ['%d']
    );
    
    // Удаляем само слово
    $result = $wpdb->delete(
        $words_table,
        ['id' => $word_id],
        ['%d']
    );
    
    return $result !== false;
}

/**
 * Обновить прогресс пользователя по слову
 * @param int $user_id ID пользователя
 * @param int $word_id ID слова
 * @param int $is_revert 0 = прямой перевод, 1 = обратный перевод
 * @return bool Результат операции
 */
function update_word_progress($user_id, $word_id, $is_revert) {
    global $wpdb;
    
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    
    // Проверяем, существует ли запись
    $exists = $wpdb->get_var($wpdb->prepare("
        SELECT COUNT(*) FROM $user_dict_words_table 
        WHERE user_id = %d AND dict_word_id = %d
    ", $user_id, $word_id));
    
    $field_to_update = $is_revert ? 'easy_correct_revert' : 'easy_correct';
    
    if ($exists) {
        // Обновляем существующую запись
        $result = $wpdb->update(
            $user_dict_words_table,
            [$field_to_update => 1],
            [
                'user_id' => $user_id,
                'dict_word_id' => $word_id
            ]
        );
        return $result !== false;
    } else {
        // Создаем новую запись
        $data = [
            'user_id' => $user_id,
            'dict_word_id' => $word_id,
            'attempts' => 0,
            'correct_attempts' => 0,
            'last_shown' => current_time('mysql'),
            'easy_education' => 1,
            'mode_education' => 0,
            'attempts_all' => 0,
            'correct_attempts_all' => 0,
            'attempts_revert' => 0,
            'correct_attempts_revert' => 0,
            'easy_correct' => 0,
            'easy_correct_revert' => 0
        ];
        
        // Устанавливаем правильный флаг в зависимости от режима
        $data[$field_to_update] = 1;
        
        $result = $wpdb->insert($user_dict_words_table, $data);
        return $result !== false;
    }
}

/**
 * Сбросить слова категории из режима обучения (easy_education = 0)
 * @param int $user_id ID пользователя
 * @param int $category_id ID категории
 * @return bool Результат операции
 */
function reset_category_from_training($user_id, $category_id) {
    global $wpdb;
    
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    
    $word_ids = $wpdb->get_col($wpdb->prepare("
        SELECT w.id 
        FROM $words_table AS w
        INNER JOIN $word_category_table AS wc ON w.id = wc.word_id
        WHERE wc.category_id = %d
    ", $category_id));
    
    if (empty($word_ids)) {
        return false;
    }
    
    foreach ($word_ids as $word_id) {
        $exists = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) FROM $user_dict_words_table 
            WHERE user_id = %d AND dict_word_id = %d
        ", $user_id, $word_id));
        
        if ($exists) {
            $wpdb->update(
                $user_dict_words_table,
                [
                    'easy_education' => 0,
                    'easy_correct' => 0,
                    'easy_correct_revert' => 0
                ],
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
        }
        // Не создаем новую запись, если пользователь не участвует в тренировке
    }
    
    return true;
}

function update_word_attempts($user_id, $word_id, $is_revert, $is_correct, $is_first_attempt) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    
    // Проверяем, существует ли запись
    $exists = $wpdb->get_row($wpdb->prepare("
        SELECT * FROM $user_dict_words_table 
        WHERE user_id = %d AND dict_word_id = %d
    ", $user_id, $word_id), ARRAY_A);
    
    $current_time = current_time('mysql');
    
    if ($exists) {
        // Обновляем существующую запись
        if ($is_revert) {
            // Обратный перевод
            $update_data = [
                'attempts_revert' => $exists['attempts_revert'] + 1
            ];
            
            if ($is_correct) {
                // Если правильно ответил
                if ($is_first_attempt) {
                    // С первой попытки - добавляем балл
                    $update_data['correct_attempts_revert'] = $exists['correct_attempts_revert'] + 1;
                    $update_data['last_shown_revert'] = $current_time;
                    $update_data['mode_education_revert'] = 0; // Выключаем режим обучения
                } else {
                    // Не с первой попытки - выходим из режима обучения и запускаем откат
                    $update_data['last_shown_revert'] = $current_time;
                    $update_data['mode_education_revert'] = 0;
                }
            } else {
                // Если неправильно ответил - включаем режим обучения
                $update_data['mode_education_revert'] = 1;
            }
            
            $wpdb->update(
                $user_dict_words_table,
                $update_data,
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
        } else {
            // Прямой перевод
            $update_data = [
                'attempts' => $exists['attempts'] + 1
            ];
            
            if ($is_correct) {
                // Если правильно ответил
                if ($is_first_attempt) {
                    // С первой попытки - добавляем балл
                    $update_data['correct_attempts'] = $exists['correct_attempts'] + 1;
                    $update_data['last_shown'] = $current_time;
                    $update_data['mode_education'] = 0; // Выключаем режим обучения
                } else {
                    // Не с первой попытки - выходим из режима обучения и запускаем откат
                    $update_data['last_shown'] = $current_time;
                    $update_data['mode_education'] = 0;
                }
            } else {
                // Если неправильно ответил - включаем режим обучения
                $update_data['mode_education'] = 1;
            }
            
            $wpdb->update(
                $user_dict_words_table,
                $update_data,
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
        }
    } else {
        // Создаем новую запись
        $insert_data = [
            'user_id' => $user_id,
            'dict_word_id' => $word_id,
            'attempts' => 0,
            'attempts_revert' => 0,
            'correct_attempts' => 0,
            'correct_attempts_revert' => 0,
            'mode_education' => 0,
            'mode_education_revert' => 0
        ];
        
        if ($is_revert) {
            $insert_data['attempts_revert'] = 1;
            if ($is_correct && $is_first_attempt) {
                $insert_data['correct_attempts_revert'] = 1;
                $insert_data['last_shown_revert'] = $current_time;
            } else if (!$is_correct) {
                $insert_data['mode_education_revert'] = 1;
            }
        } else {
            $insert_data['attempts'] = 1;
            if ($is_correct && $is_first_attempt) {
                $insert_data['correct_attempts'] = 1;
                $insert_data['last_shown'] = $current_time;
            } else if (!$is_correct) {
                $insert_data['mode_education'] = 1;
            }
        }
        
        $wpdb->insert($user_dict_words_table, $insert_data);
    }
    
    return true;
}

function reset_training_category_data($user_id, $category_id) {
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
    
    // Обновляем все записи для слов категории, сохраняя attempts_all и correct_attempts_all
    foreach ($word_ids as $word_id) {
        // Проверяем, существует ли запись
        $exists = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) FROM $user_dict_words_table 
            WHERE user_id = %d AND dict_word_id = %d
        ", $user_id, $word_id));
        
        if ($exists) {
            // Обновляем существующую запись, сохраняя attempts_all и correct_attempts_all
            $wpdb->update(
                $user_dict_words_table,
                [
                    'attempts' => 0,
                    'attempts_revert' => 0,
                    'correct_attempts' => 0,
                    'correct_attempts_revert' => 0,
                    'last_shown' => NULL,
                    'last_shown_revert' => NULL,
                    'easy_education' => 0,
                    'easy_correct' => 0,
                    'easy_correct_revert' => 0,
                    'mode_education' => 0,
                    'mode_education_revert' => 0
                ],
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
        }
    }
    
    return true;
}
