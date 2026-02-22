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
 * Получить запись прогресса обучения для одного слова и пользователя (для админ-редактирования).
 * @param int $user_id ID пользователя
 * @param int $word_id ID слова (dict_word_id)
 * @return array|null Запись из user_dict_words или null
 */
function get_single_word_progress($user_id, $word_id) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $row = $wpdb->get_row($wpdb->prepare("
        SELECT id, user_id, dict_word_id, attempts, correct_attempts, attempts_revert, correct_attempts_revert,
               last_shown, last_shown_revert, easy_education, mode_education, mode_education_revert,
               attempts_all, correct_attempts_all, easy_correct, easy_correct_revert
        FROM $user_dict_words_table
        WHERE user_id = %d AND dict_word_id = %d
    ", $user_id, $word_id), ARRAY_A);
    if (!$row) {
        return null;
    }
    $row['attempts'] = (int) $row['attempts'];
    $row['correct_attempts'] = (int) $row['correct_attempts'];
    $row['attempts_revert'] = (int) $row['attempts_revert'];
    $row['correct_attempts_revert'] = (int) $row['correct_attempts_revert'];
    $row['mode_education'] = (int) $row['mode_education'];
    $row['mode_education_revert'] = (int) $row['mode_education_revert'];
    $row['attempts_all'] = (int) ($row['attempts_all'] ?? 0);
    $row['correct_attempts_all'] = (int) ($row['correct_attempts_all'] ?? 0);
    return $row;
}

/**
 * Обновить запись прогресса обучения для слова текущего пользователя (только для админа).
 * @param int $user_id ID пользователя (текущий админ)
 * @param int $word_id ID слова (dict_word_id)
 * @param array $data Поля для обновления: attempts, correct_attempts, attempts_revert, correct_attempts_revert, mode_education, mode_education_revert, last_shown, last_shown_revert
 * @return bool
 */
function update_single_word_progress_admin($user_id, $word_id, $data) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $allowed = ['attempts', 'correct_attempts', 'attempts_revert', 'correct_attempts_revert',
                'mode_education', 'mode_education_revert', 'last_shown', 'last_shown_revert',
                'attempts_all', 'correct_attempts_all', 'easy_education', 'easy_correct', 'easy_correct_revert'];
    $update = [];
    foreach ($allowed as $key) {
        if (array_key_exists($key, $data)) {
            if (in_array($key, ['last_shown', 'last_shown_revert'], true)) {
                $update[$key] = $data[$key] === '' || $data[$key] === null ? null : sanitize_text_field($data[$key]);
            } else {
                $update[$key] = (int) $data[$key];
            }
        }
    }
    if (empty($update)) {
        return true;
    }
    $exists = $wpdb->get_row($wpdb->prepare("
        SELECT id FROM $user_dict_words_table WHERE user_id = %d AND dict_word_id = %d
    ", $user_id, $word_id), ARRAY_A);
    if ($exists) {
        return $wpdb->update($user_dict_words_table, $update, ['user_id' => $user_id, 'dict_word_id' => $word_id]) !== false;
    }
    $insert = array_merge([
        'user_id' => $user_id,
        'dict_word_id' => $word_id,
        'attempts' => 0,
        'correct_attempts' => 0,
        'attempts_revert' => 0,
        'correct_attempts_revert' => 0,
        'mode_education' => 0,
        'mode_education_revert' => 0,
    ], $update);
    return $wpdb->insert($user_dict_words_table, $insert) !== false;
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
            'translation_input_variable' => !empty($word_data['translation_input_variable']) ? $word_data['translation_input_variable'] : null,
            'difficult_translation' => !empty($word_data['difficult_translation']) ? $word_data['difficult_translation'] : null,
            'info' => !empty($word_data['info']) ? $word_data['info'] : null,
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
 * Удалить слово из категории. Если после удаления слово не принадлежит ни одной категории — удалить слово полностью.
 * @param int $word_id ID слова
 * @param int $category_id ID категории
 * @return bool Результат операции
 */
function remove_word_from_category($word_id, $category_id) {
    global $wpdb;

    $word_category_table = $wpdb->prefix . 'd_word_category';

    // Удаляем связь слово-категория
    $deleted = $wpdb->delete(
        $word_category_table,
        ['word_id' => $word_id, 'category_id' => $category_id],
        ['%d', '%d']
    );

    if ($deleted === false) {
        return false;
    }

    // Проверяем, остались ли у слова другие категории
    $remaining = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $word_category_table WHERE word_id = %d",
        $word_id
    ));

    if ($remaining > 0) {
        return true; // Слово ещё в других категориях — удалили только из этой
    }

    // Слова больше ни в какой категории — удаляем полностью
    return delete_word($word_id);
}

/**
 * Удалить слово полностью (из всех категорий)
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
            'last_shown' => gmdate('Y-m-d H:i:s'), // UTC время
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
    
    $current_time = gmdate('Y-m-d H:i:s'); // UTC время
    
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

/**
 * Сбросить прогресс экзамена для всех слов категории
 * (Вызывается при входе в режим легкого изучения)
 * Симулируем правильный ответ в режиме обучения (не с первой попытки)
 * Это запускает откат: mode_education = 0, last_shown = NOW, attempts +1
 */
function reset_exam_progress_for_category($user_id, $category_id) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    
    error_log("📊 reset_exam_progress_for_category: user_id=$user_id, category_id=$category_id");
    
    // Получаем все слова из категории
    $word_ids = $wpdb->get_col($wpdb->prepare("
        SELECT w.id 
        FROM $words_table AS w
        INNER JOIN $word_category_table AS wc ON w.id = wc.word_id
        WHERE wc.category_id = %d
    ", $category_id));
    
    error_log("📊 Найдено слов в категории: " . count($word_ids));
    
    if (empty($word_ids)) {
        error_log("⚠️ Нет слов в категории $category_id");
        return true; // Нет слов - не ошибка
    }
    
    $current_time = gmdate('Y-m-d H:i:s'); // UTC время
    error_log("⏰ Текущее время (UTC): $current_time");
    
    // Симулируем правильный ответ в режиме обучения для всех слов
    $updated_count = 0;
    $created_count = 0;
    
    foreach ($word_ids as $word_id) {
        $exists = $wpdb->get_row($wpdb->prepare("
            SELECT * FROM $user_dict_words_table 
            WHERE user_id = %d AND dict_word_id = %d
        ", $user_id, $word_id), ARRAY_A);
        
        if ($exists) {
            error_log("🔄 Обновление слова ID=$word_id");
            // Симулируем правильный ответ в режиме обучения (не с первой попытки)
            // Это выключает mode_education и запускает откат
            $result = $wpdb->update(
                $user_dict_words_table,
                [
                    // Прямой перевод
                    'mode_education' => 0,              // Выключаем режим обучения
                    'last_shown' => $current_time,      // Устанавливаем время показа
                    
                    // Обратный перевод
                    'mode_education_revert' => 0,       // Выключаем режим обучения
                    'last_shown_revert' => $current_time, // Устанавливаем время показа
                    // НЕ увеличиваем attempts_revert - откат без учёта попытки --- потому что юзер просто подсмотрел слова  в режиме изучениия поэтому не считаем этот как за попытку ответа а просто сбрасываем время
                ],
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
            
            if ($result !== false) {
                $updated_count++;
                error_log("✅ Слово ID=$word_id обновлено");
            } else {
                error_log("❌ Ошибка обновления слова ID=$word_id: " . $wpdb->last_error);
            }
        }
    }
    
    error_log("📊 Итого: обновлено=$updated_count, создано=$created_count");
    
    // Проверяем что получилось - выводим несколько записей для отладки
    if (!empty($word_ids)) {
        $first_word_id = $word_ids[0];
        $check_data = $wpdb->get_row($wpdb->prepare("
            SELECT mode_education, mode_education_revert, last_shown, last_shown_revert, 
                   correct_attempts, correct_attempts_revert, attempts, attempts_revert
            FROM $user_dict_words_table 
            WHERE user_id = %d AND dict_word_id = %d
        ", $user_id, $first_word_id), ARRAY_A);
        
        error_log("🔍 Проверка первого слова (ID=$first_word_id): " . print_r($check_data, true));
    }
    
    return true;
}

/**
 * Сбросить тренировочные данные одного слова для пользователя.
 * ВАЖНО: attempts/attempts_revert не трогаем (нужны для статистики).
 *
 * @param int $user_id
 * @param int $word_id
 * @return bool
 */
function reset_training_word_data($user_id, $word_id) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';

    $user_id = intval($user_id);
    $word_id = intval($word_id);
    if ($user_id <= 0 || $word_id <= 0) {
        return false;
    }

    $result = $wpdb->update(
        $user_dict_words_table,
        [
            'correct_attempts' => 0,
            'correct_attempts_revert' => 0,
            'last_shown' => null,
            'last_shown_revert' => null,
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

    // 0 = запись уже была в нужном состоянии; считаем успешным.
    return $result !== false;
}

function reset_training_category_data($user_id, $category_id = null, $word_ids = null) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    
    error_log("🔄 reset_training_category_data: user_id=$user_id, category_id=$category_id");
    
    // Если переданы word_ids напрямую (для фейковых категорий), используем их
    if (!empty($word_ids)) {
        error_log("📋 Используем переданные word_ids: " . count($word_ids));
    } else {
        // Получаем все слова из категории (для реальных категорий)
        $word_ids = $wpdb->get_col($wpdb->prepare("
            SELECT w.id 
            FROM $words_table AS w
            INNER JOIN $word_category_table AS wc ON w.id = wc.word_id
            WHERE wc.category_id = %d
        ", $category_id));
        
        if (empty($word_ids)) {
            error_log("⚠️ Категория пустая или не найдена");
            return false;
        }
        
        error_log("📋 Найдено слов в категории: " . count($word_ids));
    }
    
    // Санитизируем ID слов
    $word_ids = array_map('intval', $word_ids);
    $word_ids_str = implode(',', $word_ids);
    
    // ОПТИМИЗАЦИЯ: Массовый UPDATE для всех существующих записей одним запросом
    // Обновляем только те записи, которые существуют (сохраняя attempts_all и correct_attempts_all)
    $result = $wpdb->query($wpdb->prepare("
        UPDATE $user_dict_words_table 
        SET correct_attempts = 0,
            correct_attempts_revert = 0,
            last_shown = NULL,
            last_shown_revert = NULL,
            easy_education = 0,
            easy_correct = 0,
            easy_correct_revert = 0,
            mode_education = 0,
            mode_education_revert = 0
        WHERE user_id = %d 
        AND dict_word_id IN ($word_ids_str)
    ", $user_id));
    
    if ($result !== false) {
        error_log("✅ Массовый сброс: обновлено $result записей");
    } else {
        error_log("❌ Ошибка массового сброса: " . $wpdb->last_error);
    }
    
    return true;
}

/**
 * Установить для всех слов категории режим лёгкого обучения (mode_education = 1, mode_education_revert = 1)
 * Создаёт записи для слов без БД данных
 * 
 * @param int $user_id ID пользователя
 * @param int|int[] $category_id_or_ids ID категории или массив ID (категория + подкатегории)
 * @return bool
 */
function set_category_to_easy_mode($user_id, $category_id_or_ids) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $words_table = $wpdb->prefix . 'd_words';
    $word_category_table = $wpdb->prefix . 'd_word_category';

    $category_ids = is_array($category_id_or_ids) ? array_map('intval', $category_id_or_ids) : [intval($category_id_or_ids)];
    $category_ids = array_filter($category_ids);

    error_log("🎓 set_category_to_easy_mode: user_id=$user_id, category_ids=" . implode(',', $category_ids));

    if (empty($category_ids)) {
        return false;
    }

    $placeholders = implode(',', array_fill(0, count($category_ids), '%d'));
    $query = $wpdb->prepare("
        SELECT DISTINCT w.id
        FROM $words_table AS w
        INNER JOIN $word_category_table AS wc ON w.id = wc.word_id
        WHERE wc.category_id IN ($placeholders)
    ", ...$category_ids);

    $word_ids = $wpdb->get_col($query);

    if (empty($word_ids)) {
        error_log("⚠️ Нет слов в категориях " . implode(',', $category_ids));
        return false;
    }

    error_log("📚 Найдено слов: " . count($word_ids));
    
    $updated_count = 0;
    $created_count = 0;
    
    foreach ($word_ids as $word_id) {
        $exists = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) FROM $user_dict_words_table 
            WHERE user_id = %d AND dict_word_id = %d
        ", $user_id, $word_id));
        
        if ($exists) {
            // Обновляем существующую запись
            $result = $wpdb->update(
                $user_dict_words_table,
                [
                    'mode_education' => 1,           // Включаем режим обучения
                    'mode_education_revert' => 1,    // Включаем режим обучения для реверса
                ],
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id
                ]
            );
            
            if ($result !== false) {
                $updated_count++;
            }
        } else {
            // Создаём новую запись с режимом обучения
            $result = $wpdb->insert(
                $user_dict_words_table,
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id,
                    'attempts' => 0,
                    'attempts_revert' => 0,
                    'correct_attempts' => 0,
                    'correct_attempts_revert' => 0,
                    'last_shown' => gmdate('Y-m-d H:i:s'), // UTC время
                    'last_shown_revert' => gmdate('Y-m-d H:i:s'), // UTC время
                    'mode_education' => 1,              // Режим обучения включен
                    'mode_education_revert' => 1,       // Режим обучения включен
                    'attempts_all' => 0,
                    'correct_attempts_all' => 0,
                    'easy_education' => 0,
                    'easy_correct' => 0,
                    'easy_correct_revert' => 0
                ]
            );
            
            if ($result !== false) {
                $created_count++;
            }
        }
    }
    
    error_log("✅ Завершено: обновлено=$updated_count, создано=$created_count");
    
    return true;
}
/**
 * Создать/обновить записи с mode_education = 1 для слов без БД записей ИЛИ со сброшенными записями
 * Сброшенная запись: attempts = 0 AND attempts_revert = 0 AND correct_attempts = 0 AND correct_attempts_revert = 0
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: массовые INSERT и UPDATE запросы
 * 
 * @param int $user_id ID пользователя
 * @param array $word_ids Массив ID слов
 * @return bool
 */
function create_easy_mode_for_new_words($user_id, $word_ids) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    
    error_log("🆕 create_easy_mode_for_new_words: user_id=$user_id, words=" . count($word_ids));
    
    if (empty($word_ids)) {
        error_log("⚠️ Пустой массив word_ids");
        return false;
    }
    
    // Санитизируем ID слов
    $word_ids = array_map('intval', $word_ids);
    $word_ids_str = implode(',', $word_ids);
    
    // Шаг 1: Получаем все существующие записи одним запросом
    $existing_records = $wpdb->get_results($wpdb->prepare("
        SELECT dict_word_id, attempts, attempts_revert, correct_attempts, correct_attempts_revert, 
               mode_education, mode_education_revert
        FROM $user_dict_words_table 
        WHERE user_id = %d AND dict_word_id IN ($word_ids_str)
    ", $user_id), ARRAY_A);
    
    error_log("📊 Найдено существующих записей: " . count($existing_records));
    
    // Индексируем существующие записи по dict_word_id
    $existing_map = [];
    foreach ($existing_records as $record) {
        $existing_map[$record['dict_word_id']] = $record;
    }
    
    // Разделяем слова на: новые (нужен INSERT) и сброшенные (нужен UPDATE)
    $new_word_ids = [];
    $reset_word_ids = [];
    
    foreach ($word_ids as $word_id) {
        if (!isset($existing_map[$word_id])) {
            // Нет записи - нужно создать
            $new_word_ids[] = $word_id;
        } else {
            // Запись есть - проверяем, сброшена ли она
            $record = $existing_map[$word_id];
            $isResetState = (
                $record['attempts'] == 0 && 
                $record['attempts_revert'] == 0 && 
                $record['correct_attempts'] == 0 && 
                $record['correct_attempts_revert'] == 0
            );
            
            if ($isResetState) {
                $reset_word_ids[] = $word_id;
            } else {
                error_log("⏭️ Слово ID=$word_id имеет реальную запись (не сброшенную), пропускаем");
            }
        }
    }
    
    error_log("➕ Новых слов для создания: " . count($new_word_ids));
    error_log("🔄 Сброшенных слов для обновления: " . count($reset_word_ids));
    
    // Шаг 2: Массовый INSERT для новых записей
    if (!empty($new_word_ids)) {
        $values = [];
        foreach ($new_word_ids as $word_id) {
            $values[] = $wpdb->prepare(
                "(%d, %d, 0, 0, 0, 0, %s, %s, 1, 1, 0, 0, 0, 0, 0)",
                $user_id,
                $word_id,
                '0000-00-00 00:00:00',
                null
            );
        }
        
        $sql = "INSERT INTO $user_dict_words_table 
                (user_id, dict_word_id, attempts, attempts_revert, correct_attempts, correct_attempts_revert, 
                 last_shown, last_shown_revert, mode_education, mode_education_revert, 
                 attempts_all, correct_attempts_all, easy_education, easy_correct, easy_correct_revert) 
                VALUES " . implode(', ', $values);
        
        $result = $wpdb->query($sql);
        
        if ($result !== false) {
            error_log("✅ Массовый INSERT: создано $result записей");
        } else {
            error_log("❌ Ошибка массового INSERT: " . $wpdb->last_error);
        }
    }
    
    // Шаг 3: Массовый UPDATE для сброшенных записей
    if (!empty($reset_word_ids)) {
        $reset_word_ids_str = implode(',', $reset_word_ids);
        
        $result = $wpdb->query($wpdb->prepare("
            UPDATE $user_dict_words_table 
            SET mode_education = 1, 
                mode_education_revert = 1,
                last_shown = '0000-00-00 00:00:00',
                last_shown_revert = NULL
            WHERE user_id = %d 
            AND dict_word_id IN ($reset_word_ids_str)
        ", $user_id));
        
        if ($result !== false) {
            error_log("✅ Массовый UPDATE: обновлено $result записей");
        } else {
            error_log("❌ Ошибка массового UPDATE: " . $wpdb->last_error);
        }
    }
    
    error_log("📊 Итого: создано=" . count($new_word_ids) . ", обновлено=" . count($reset_word_ids) . " записей");
    
    return true;
}

if (!defined('LBP_DENSE_INTERVAL_SEC')) {
    define('LBP_DENSE_INTERVAL_SEC', 900); // 15 минут
}

function lbp_dense_table_name() {
    global $wpdb;
    return $wpdb->prefix . 'dense_training_sessions';
}

function lbp_dense_decode_ids($raw) {
    if ($raw === null || $raw === '') return [];
    // Уже массив (например после maybe_rotate) — не передавать в json_decode, иначе получим []
    if (is_array($raw)) {
        $ids = array_map('intval', $raw);
        $ids = array_filter($ids, function($v) { return $v > 0; });
        return array_values(array_unique($ids));
    }
    $arr = json_decode($raw, true);
    if (!is_array($arr)) return [];
    $ids = array_map('intval', $arr);
    $ids = array_filter($ids, function($v) { return $v > 0; });
    return array_values(array_unique($ids));
}

function lbp_dense_encode_ids($arr) {
    $ids = array_map('intval', is_array($arr) ? $arr : []);
    $ids = array_filter($ids, function($v) { return $v > 0; });
    $ids = array_values(array_unique($ids));
    return wp_json_encode($ids, JSON_UNESCAPED_UNICODE);
}

function lbp_dense_remove_id($arr, $word_id) {
    $wid = intval($word_id);
    return array_values(array_filter($arr, function($id) use ($wid) {
        return intval($id) !== $wid;
    }));
}

function lbp_dense_prepare_row($row) {
    if (!$row) return null;
    $row['id'] = intval($row['id']);
    $row['user_id'] = intval($row['user_id']);
    $row['dictionary_id'] = intval($row['dictionary_id']);
    $row['category_id'] = intval($row['category_id']);
    $row['attempts_left'] = intval($row['attempts_left']);
    $row['use_random'] = intval($row['use_random']) ? 1 : 0;
    return $row;
}

function lbp_dense_fetch_session($user_id, $category_id) {
    global $wpdb;
    $t = lbp_dense_table_name();
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $t WHERE user_id = %d AND category_id = %d LIMIT 1",
        intval($user_id),
        intval($category_id)
    ), ARRAY_A);
    return lbp_dense_prepare_row($row);
}

/**
 * Засчитать успешную мини-игру: счётчик (attempts_left) −1 и запуск отката (waiting_since = сейчас).
 * Не меняет сессию, если откат уже идёт (повторное «Проверить» во время ожидания не уменьшает счётчик).
 *
 * @param int $user_id ID пользователя
 * @param int $category_id ID категории
 * @return array Состояние плотной сессии после обновления (lbp_dense_to_state).
 */
function lbp_dense_count_match_game_success($user_id, $category_id) {
    global $wpdb;
    $t = lbp_dense_table_name();
    $user_id = intval($user_id);
    $category_id = intval($category_id);

    $row = lbp_dense_fetch_session($user_id, $category_id);
    if (!$row || $row['attempts_left'] <= 0) {
        return $row ? lbp_dense_to_state($row) : lbp_dense_to_state(null);
    }
    // Не засчитывать повторный успех, пока идёт откат.
    if (!empty($row['waiting_since'])) {
        $waiting_ts = strtotime($row['waiting_since'] . ' UTC');
        $elapsed = $waiting_ts !== false ? (time() - $waiting_ts) : 0;
        if ($elapsed < LBP_DENSE_INTERVAL_SEC) {
            return lbp_dense_to_state($row);
        }
    }

    $attempts_left = intval($row['attempts_left']);
    if ($attempts_left <= 1) {
        // Последняя попытка: сразу завершаем тренировку без отката, сессия очищается, счётчик пропадает.
        return lbp_dense_clear_session($user_id, $category_id);
    }

    // Завершаем раунд: переносим текущие стеки в review, чтобы после отката ротация вернула слова.
    $direct = lbp_dense_decode_ids($row['dense_word_ids_direct']);
    $review_direct = lbp_dense_decode_ids($row['dense_review_word_ids_direct']);
    $revert = lbp_dense_decode_ids($row['dense_word_ids_revert']);
    $review_revert = lbp_dense_decode_ids($row['dense_review_word_ids_revert']);

    $row['dense_word_ids_direct'] = [];
    $row['dense_review_word_ids_direct'] = array_values(array_unique(array_merge($direct, $review_direct)));
    $row['dense_word_ids_revert'] = [];
    $row['dense_review_word_ids_revert'] = array_values(array_unique(array_merge($revert, $review_revert)));
    $row['attempts_left'] = max(0, $attempts_left - 1);
    $row['waiting_since'] = gmdate('Y-m-d H:i:s');
    lbp_dense_save_session($row);

    $row = lbp_dense_fetch_session($user_id, $category_id);
    return lbp_dense_to_state($row);
}

function lbp_dense_save_session($session) {
    global $wpdb;
    $t = lbp_dense_table_name();

    $data = [
        'dense_word_ids_direct' => lbp_dense_encode_ids($session['dense_word_ids_direct']),
        'dense_review_word_ids_direct' => lbp_dense_encode_ids($session['dense_review_word_ids_direct']),
        'dense_word_ids_revert' => lbp_dense_encode_ids($session['dense_word_ids_revert']),
        'dense_review_word_ids_revert' => lbp_dense_encode_ids($session['dense_review_word_ids_revert']),
        'attempts_left' => max(0, intval($session['attempts_left'])),
        'waiting_since' => !empty($session['waiting_since']) ? $session['waiting_since'] : null,
        'use_random' => intval($session['use_random']) ? 1 : 0,
        'updated_at' => gmdate('Y-m-d H:i:s'),
    ];

    if (!empty($session['id'])) {
        $wpdb->update($t, $data, ['id' => intval($session['id'])]);
        return intval($session['id']);
    }

    $now = gmdate('Y-m-d H:i:s');
    $data['user_id'] = intval($session['user_id']);
    $data['dictionary_id'] = intval($session['dictionary_id']);
    $data['category_id'] = intval($session['category_id']);
    $data['created_at'] = $now;

    $wpdb->insert($t, $data);
    return intval($wpdb->insert_id);
}

function lbp_dense_to_state($row) {
    if (!$row) {
        return [
            'exists' => false,
            'attempts_left' => 0,
            'waiting_since' => null,
            'waiting_remaining_sec' => 0,
            'use_random' => 1,
            'dense_word_ids_direct' => [],
            'dense_review_word_ids_direct' => [],
            'dense_word_ids_revert' => [],
            'dense_review_word_ids_revert' => [],
            'active_word_ids' => [],
        ];
    }

    $direct = lbp_dense_decode_ids($row['dense_word_ids_direct']);
    $review_direct = lbp_dense_decode_ids($row['dense_review_word_ids_direct']);
    $revert = lbp_dense_decode_ids($row['dense_word_ids_revert']);
    $review_revert = lbp_dense_decode_ids($row['dense_review_word_ids_revert']);
    $active = array_values(array_unique(array_merge($direct, $review_direct, $revert, $review_revert)));

    $remaining = 0;
    if (!empty($row['waiting_since'])) {
        $waiting_ts = strtotime($row['waiting_since'] . ' UTC');
        if ($waiting_ts !== false) {
            $remaining = max(0, LBP_DENSE_INTERVAL_SEC - (time() - $waiting_ts));
        }
    }

    return [
        'exists' => true,
        'attempts_left' => intval($row['attempts_left']),
        'waiting_since' => $row['waiting_since'] ?: null,
        'waiting_remaining_sec' => $remaining,
        'use_random' => intval($row['use_random']) ? 1 : 0,
        'dense_word_ids_direct' => $direct,
        'dense_review_word_ids_direct' => $review_direct,
        'dense_word_ids_revert' => $revert,
        'dense_review_word_ids_revert' => $review_revert,
        'active_word_ids' => $active,
    ];
}

function lbp_dense_maybe_rotate_session($row) {
    if (!$row) return null;

    $row['dense_word_ids_direct'] = lbp_dense_decode_ids($row['dense_word_ids_direct']);
    $row['dense_review_word_ids_direct'] = lbp_dense_decode_ids($row['dense_review_word_ids_direct']);
    $row['dense_word_ids_revert'] = lbp_dense_decode_ids($row['dense_word_ids_revert']);
    $row['dense_review_word_ids_revert'] = lbp_dense_decode_ids($row['dense_review_word_ids_revert']);
    $row['attempts_left'] = intval($row['attempts_left']);
    $row['use_random'] = intval($row['use_random']) ? 1 : 0;

    $changed = false;
    $direct_done = empty($row['dense_word_ids_direct']);
    $revert_done = empty($row['dense_word_ids_revert']);
    $has_review_direct = !empty($row['dense_review_word_ids_direct']);
    $has_review_revert = !empty($row['dense_review_word_ids_revert']);
    // Лок 15 мин только когда оба направления пройдены: оба стартовых стека пусты И в обоих review есть слова.
    $both_directions_done = $direct_done && $revert_done && $has_review_direct && $has_review_revert;

    // Счётчик уменьшаем сразу при старте отката (завершение раунда), а не после отката.
    if ($both_directions_done && empty($row['waiting_since']) && $row['attempts_left'] > 1) {
        $row['attempts_left'] = max(0, $row['attempts_left'] - 1);
        $row['waiting_since'] = gmdate('Y-m-d H:i:s');
        $changed = true;
    }

    if (!empty($row['waiting_since'])) {
        $waiting_ts = strtotime($row['waiting_since'] . ' UTC');
        $elapsed = $waiting_ts !== false ? (time() - $waiting_ts) : 0;
        if ($elapsed >= LBP_DENSE_INTERVAL_SEC) {
            if ($row['attempts_left'] <= 0) {
                // Последний круг завершён — очищаем стеки.
                $row['attempts_left'] = 0;
                $row['dense_word_ids_direct'] = [];
                $row['dense_review_word_ids_direct'] = [];
                $row['dense_word_ids_revert'] = [];
                $row['dense_review_word_ids_revert'] = [];
                $row['waiting_since'] = null;
            } else {
                // Только ротация; счётчик уже уменьшен при старте отката.
                $row['dense_word_ids_direct'] = $row['dense_review_word_ids_direct'];
                $row['dense_review_word_ids_direct'] = [];
                $row['dense_word_ids_revert'] = $row['dense_review_word_ids_revert'];
                $row['dense_review_word_ids_revert'] = [];
                $row['waiting_since'] = null;
            }
            $changed = true;
        }
    }

    if ($changed) {
        lbp_dense_save_session($row);
    }
    return $row;
}

/**
 * @param int $user_id
 * @param int $category_id
 * @param bool $apply_rotate — применять ли ротацию/очистку по 15 мин (false при открытии окна, чтобы не сбросить сессию)
 */
function lbp_dense_get_state($user_id, $category_id, $apply_rotate = true) {
    $row = lbp_dense_fetch_session($user_id, $category_id);
    if ($row && $apply_rotate) {
        $row = lbp_dense_maybe_rotate_session($row);
    }
    return lbp_dense_to_state($row);
}

/**
 * Установить mode_education = 1 и mode_education_revert = 1 для слов (при добавлении в плотное дообучение).
 *
 * @param int $user_id ID пользователя
 * @param int[] $word_ids Массив dict_word_id
 */
function lbp_dense_set_words_retraining_mode($user_id, $word_ids) {
    global $wpdb;
    $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
    $word_ids = array_values(array_unique(array_filter(array_map('intval', (array) $word_ids), function ($v) {
        return $v > 0;
    })));
    if (empty($word_ids)) {
        return;
    }
    $user_id = (int) $user_id;
    foreach ($word_ids as $word_id) {
        $word_id = (int) $word_id;
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT 1 FROM $user_dict_words_table WHERE user_id = %d AND dict_word_id = %d LIMIT 1",
            $user_id,
            $word_id
        ));
        if ($exists) {
            $wpdb->update(
                $user_dict_words_table,
                [
                    'mode_education' => 1,
                    'mode_education_revert' => 1,
                    'last_shown' => '0000-00-00 00:00:00',
                    'last_shown_revert' => null,
                ],
                ['user_id' => $user_id, 'dict_word_id' => $word_id],
                ['%d', '%d', '%s', '%s'],
                ['%d', '%d']
            );
        } else {
            $wpdb->insert(
                $user_dict_words_table,
                [
                    'user_id' => $user_id,
                    'dict_word_id' => $word_id,
                    'attempts' => 0,
                    'attempts_revert' => 0,
                    'correct_attempts' => 0,
                    'correct_attempts_revert' => 0,
                    'last_shown' => '0000-00-00 00:00:00',
                    'last_shown_revert' => null,
                    'easy_education' => 0,
                    'mode_education' => 1,
                    'mode_education_revert' => 1,
                    'attempts_all' => 0,
                    'correct_attempts_all' => 0,
                    'easy_correct' => 0,
                    'easy_correct_revert' => 0,
                ],
                ['%d', '%d', '%d', '%d', '%d', '%d', '%s', '%s', '%d', '%d', '%d', '%d', '%d', '%d', '%d']
            );
        }
    }
}

function lbp_dense_add_words($user_id, $dictionary_id, $category_id, $word_ids, $use_random = 1) {
    $row = lbp_dense_fetch_session($user_id, $category_id);
    if (!$row) {
        $row = [
            'id' => 0,
            'user_id' => intval($user_id),
            'dictionary_id' => intval($dictionary_id),
            'category_id' => intval($category_id),
            'dense_word_ids_direct' => [],
            'dense_review_word_ids_direct' => [],
            'dense_word_ids_revert' => [],
            'dense_review_word_ids_revert' => [],
            'attempts_left' => 3,
            'waiting_since' => null,
            'use_random' => intval($use_random) ? 1 : 0,
        ];
    } else {
        $row['dense_word_ids_direct'] = lbp_dense_decode_ids($row['dense_word_ids_direct']);
        $row['dense_review_word_ids_direct'] = lbp_dense_decode_ids($row['dense_review_word_ids_direct']);
        $row['dense_word_ids_revert'] = lbp_dense_decode_ids($row['dense_word_ids_revert']);
        $row['dense_review_word_ids_revert'] = lbp_dense_decode_ids($row['dense_review_word_ids_revert']);
    }

    $ids = array_values(array_unique(array_filter(array_map('intval', (array) $word_ids), function($v) {
        return $v > 0;
    })));
    if (empty($ids)) {
        return lbp_dense_to_state($row);
    }

    foreach ($ids as $wid) {
        $row['dense_word_ids_direct'] = lbp_dense_remove_id($row['dense_word_ids_direct'], $wid);
        $row['dense_review_word_ids_direct'] = lbp_dense_remove_id($row['dense_review_word_ids_direct'], $wid);
        $row['dense_word_ids_revert'] = lbp_dense_remove_id($row['dense_word_ids_revert'], $wid);
        $row['dense_review_word_ids_revert'] = lbp_dense_remove_id($row['dense_review_word_ids_revert'], $wid);
        $row['dense_word_ids_direct'][] = $wid;
        $row['dense_word_ids_revert'][] = $wid;
    }

    $row['dense_word_ids_direct'] = array_values(array_unique($row['dense_word_ids_direct']));
    $row['dense_word_ids_revert'] = array_values(array_unique($row['dense_word_ids_revert']));
    $row['attempts_left'] = 3;
    $row['waiting_since'] = null;
    $row['use_random'] = intval($use_random) ? 1 : 0;
    lbp_dense_save_session($row);

    // Слова, добавленные в плотное, переводим в режим дообучения в обычной тренировке
    lbp_dense_set_words_retraining_mode($user_id, $ids);

    $fresh = lbp_dense_fetch_session($user_id, $category_id);
    return lbp_dense_to_state($fresh);
}

/**
 * Удалить одно слово из плотной сессии (из всех стеков).
 *
 * @param int $user_id
 * @param int $category_id
 * @param int $word_id
 * @return array Состояние после удаления.
 */
function lbp_dense_remove_word($user_id, $category_id, $word_id) {
    $row = lbp_dense_fetch_session($user_id, $category_id);
    if (!$row) {
        return lbp_dense_to_state(null);
    }
    $row['dense_word_ids_direct'] = lbp_dense_decode_ids($row['dense_word_ids_direct']);
    $row['dense_review_word_ids_direct'] = lbp_dense_decode_ids($row['dense_review_word_ids_direct']);
    $row['dense_word_ids_revert'] = lbp_dense_decode_ids($row['dense_word_ids_revert']);
    $row['dense_review_word_ids_revert'] = lbp_dense_decode_ids($row['dense_review_word_ids_revert']);
    $wid = intval($word_id);
    $row['dense_word_ids_direct'] = array_values(array_filter($row['dense_word_ids_direct'], function ($id) use ($wid) { return (int) $id !== $wid; }));
    $row['dense_review_word_ids_direct'] = array_values(array_filter($row['dense_review_word_ids_direct'], function ($id) use ($wid) { return (int) $id !== $wid; }));
    $row['dense_word_ids_revert'] = array_values(array_filter($row['dense_word_ids_revert'], function ($id) use ($wid) { return (int) $id !== $wid; }));
    $row['dense_review_word_ids_revert'] = array_values(array_filter($row['dense_review_word_ids_revert'], function ($id) use ($wid) { return (int) $id !== $wid; }));
    if (empty($row['dense_word_ids_direct']) && empty($row['dense_review_word_ids_direct']) && empty($row['dense_word_ids_revert']) && empty($row['dense_review_word_ids_revert'])) {
        lbp_dense_clear_session($user_id, $category_id);
        return lbp_dense_to_state(null);
    }
    lbp_dense_save_session($row);
    $fresh = lbp_dense_fetch_session($user_id, $category_id);
    return lbp_dense_to_state($fresh);
}

/**
 * Очистить плотную сессию для пользователя и категории (удалить запись).
 *
 * @param int $user_id
 * @param int $category_id
 * @return array Состояние после очистки (exists => false).
 */
function lbp_dense_clear_session($user_id, $category_id) {
    global $wpdb;
    $t = lbp_dense_table_name();
    $wpdb->delete($t, [
        'user_id' => intval($user_id),
        'category_id' => intval($category_id),
    ], ['%d', '%d']);
    return lbp_dense_to_state(null);
}

function lbp_dense_submit_answer($user_id, $category_id, $word_id, $is_revert, $is_correct) {
    $row = lbp_dense_fetch_session($user_id, $category_id);
    if (!$row) {
        return lbp_dense_to_state(null);
    }

    $row = lbp_dense_maybe_rotate_session($row);
    if (!$row) return lbp_dense_to_state(null);

    // Декодируем все четыре стека; меняем только один направление за запрос, второй не трогаем.
    $direct_start = lbp_dense_decode_ids($row['dense_word_ids_direct']);
    $direct_review = lbp_dense_decode_ids($row['dense_review_word_ids_direct']);
    $revert_start = lbp_dense_decode_ids($row['dense_word_ids_revert']);
    $revert_review = lbp_dense_decode_ids($row['dense_review_word_ids_revert']);

    $wid = intval($word_id);
    $is_revert = (int) $is_revert ? 1 : 0;

    if ($is_revert) {
        // Обновляем только обратное направление; direct не трогаем.
        if (intval($is_correct) === 1) {
            $revert_start = lbp_dense_remove_id($revert_start, $wid);
            if (!in_array($wid, $revert_review, true)) {
                $revert_review[] = $wid;
            }
        } else {
            $revert_review = lbp_dense_remove_id($revert_review, $wid);
            if (!in_array($wid, $revert_start, true)) {
                $revert_start[] = $wid;
            }
        }
    } else {
        // Обновляем только прямое направление; revert не трогаем.
        if (intval($is_correct) === 1) {
            $direct_start = lbp_dense_remove_id($direct_start, $wid);
            if (!in_array($wid, $direct_review, true)) {
                $direct_review[] = $wid;
            }
        } else {
            $direct_review = lbp_dense_remove_id($direct_review, $wid);
            if (!in_array($wid, $direct_start, true)) {
                $direct_start[] = $wid;
            }
        }
    }

    $row['dense_word_ids_direct'] = $direct_start;
    $row['dense_review_word_ids_direct'] = $direct_review;
    $row['dense_word_ids_revert'] = $revert_start;
    $row['dense_review_word_ids_revert'] = $revert_review;

    $direct_done = empty($row['dense_word_ids_direct']);
    $revert_done = empty($row['dense_word_ids_revert']);
    $has_review_direct = !empty($row['dense_review_word_ids_direct']);
    $has_review_revert = !empty($row['dense_review_word_ids_revert']);
    $both_directions_done = $direct_done && $revert_done && $has_review_direct && $has_review_revert;

    if ($row['attempts_left'] <= 1 && $direct_done && $revert_done) {
        $row['attempts_left'] = 0;
        $row['dense_word_ids_direct'] = [];
        $row['dense_review_word_ids_direct'] = [];
        $row['dense_word_ids_revert'] = [];
        $row['dense_review_word_ids_revert'] = [];
        $row['waiting_since'] = null;
    } elseif ($both_directions_done && empty($row['waiting_since']) && $row['attempts_left'] > 1) {
        $row['attempts_left'] = max(0, $row['attempts_left'] - 1);
        $row['waiting_since'] = gmdate('Y-m-d H:i:s');
    }

    lbp_dense_save_session($row);
    $fresh = lbp_dense_fetch_session($user_id, $category_id);
    return lbp_dense_to_state($fresh);
}