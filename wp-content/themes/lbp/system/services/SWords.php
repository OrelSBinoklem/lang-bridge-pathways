<?php

// Сервис для работы с таблицей слов
class WordsService {
    /**
     * Получить данные словаря по его ID.
     *
     * @param int $dictionary_id
     * @return array|null
     */
    public static function get_dictionary_by_id($dictionary_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'dictionaries';

        $query = $wpdb->prepare("SELECT * FROM $table WHERE id = %d", $dictionary_id);
        $dictionary = $wpdb->get_row($query, ARRAY_A);

        return $dictionary ?: null;
    }


    /**
     * Получить список слов из словаря.
     *
     * @param int $dictionary_id ID словаря
     * @return array Список слов
     */
    public static function get_words_by_dictionary($dictionary_id) {
        global $wpdb;
        
        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';

        // SQL-запрос для получения всех полей слов словаря с категориями
        $query = $wpdb->prepare("
            SELECT w.id, 
                   w.word,
                   w.learn_lang,
                   w.is_phrase,
                   w.translation_1,
                   w.translation_2,
                   w.translation_3,
                   w.translation_input_variable,
                   w.difficult_translation,
                   w.sound_url,
                   w.level,
                   w.maxLevel,
                   w.type,
                   w.gender,
                   w.`order`,
                   GROUP_CONCAT(wc.category_id) as category_ids
            FROM $words_table AS w
            LEFT JOIN $word_category_table AS wc ON w.id = wc.word_id
            WHERE w.dictionary_id = %d
            GROUP BY w.id
            ORDER BY w.`order`
        ", $dictionary_id);

        $results = $wpdb->get_results($query, ARRAY_A);
        
        // Приводим числовые поля к правильным типам
        foreach ($results as &$word) {
            // Числовые поля
            $word['id'] = intval($word['id']);
            $word['is_phrase'] = intval($word['is_phrase']);
            $word['level'] = $word['level'] ? intval($word['level']) : null;
            $word['maxLevel'] = intval($word['maxLevel']);
            $word['gender'] = $word['gender'] ? intval($word['gender']) : null;
            $word['order'] = intval($word['order']);
            
            // Преобразуем category_ids в массив
            if ($word['category_ids']) {
                $word['category_ids'] = array_map('intval', explode(',', $word['category_ids']));
            } else {
                $word['category_ids'] = [];
            }
        }
        
        return $results;
    }

    /**
     * Получить список слов, сгруппированных по категориям.
     *
     * @param int $dictionary_id ID словаря
     * @return array Слова, сгруппированные по категориям
     */
    public static function get_words_grouped_by_category($dictionary_id) {
        global $wpdb;

        $categories_table = $wpdb->prefix . 'd_categories';
        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';

        // SQL-запрос для получения слов, сгруппированных по категориям
        $query = $wpdb->prepare("
            SELECT c.id AS category_id,
                   c.name AS category_name,
                   w.word,
                   w.translation_1,
                   w.translation_2,
                   w.translation_3
            FROM $categories_table AS c
            LEFT JOIN $word_category_table AS wc ON c.id = wc.category_id
            LEFT JOIN $words_table AS w ON wc.word_id = w.id
            WHERE c.dictionary_id = %d
            ORDER BY c.id, w.word
        ", $dictionary_id);

        $results = $wpdb->get_results($query, ARRAY_A);

        // Группируем слова по категориям
        $grouped_words = [];
        foreach ($results as $row) {
            $category_id = $row['category_id'];
            $category_name = $row['category_name'];

            if (!isset($grouped_words[$category_id])) {
                $grouped_words[$category_id] = [
                    'category_name' => $category_name,
                    'words' => []
                ];
            }

            $grouped_words[$category_id]['words'][] = [
                'word' => $row['word'],
                'translation_1' => $row['translation_1'],
                'translation_2' => $row['translation_2'],
                'translation_3' => $row['translation_3']
            ];
        }

        return $grouped_words;
    }

    public static function get_category_tree($dictionary_id) {
        global $wpdb;

        // Таблица категорий
        $categories_table = $wpdb->prefix . 'd_categories';

        // Получаем все категории словаря
        $query = $wpdb->prepare("
        SELECT id, name, parent_id
        FROM $categories_table
        WHERE dictionary_id = %d
        ORDER BY id ASC
    ", $dictionary_id);

        $categories = $wpdb->get_results($query, ARRAY_A);

        // Преобразуем в дерево
        return self::build_category_tree($categories);
    }

    public static function build_category_tree(array $categories, $parent_id = null) {
        $tree = [];

        foreach ($categories as $category) {
            if ($category['parent_id'] == $parent_id) {
                // Рекурсивно получаем детей
                $children = self::build_category_tree($categories, $category['id']);
                if ($children) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }

        return $tree;
    }

    /**
     * Получить список слов из категории.
     *
     * @param int $category_id ID категории
     * @return array Список слов
     */
    public static function get_words_by_category($category_id) {
        global $wpdb;

        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';

        // SQL-запрос для получения слов по категории
        $query = $wpdb->prepare("
            SELECT w.id, w.word, w.translation_1, w.translation_2, w.translation_3, w.translation_input_variable, w.difficult_translation, w.sound_url, w.level, w.maxLevel, w.type, w.gender
            FROM $words_table AS w
            INNER JOIN $word_category_table AS wc ON w.id = wc.word_id
            WHERE wc.category_id = %d
        ", $category_id);

        return $wpdb->get_results($query, ARRAY_A);
    }

    /**
     * Обновить слово в словаре.
     *
     * @param int $dictionary_id
     * @param int $word_id
     * @param array $fields — ассоциативный массив с новыми значениями
     * @return bool|WP_Error
     */
    public static function update_word_in_dictionary($dictionary_id, $word_id, $fields) {
        global $wpdb;

        $table = $wpdb->prefix . 'd_words';

        // Убедимся, что слово принадлежит словарю
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE id = %d AND dictionary_id = %d",
            $word_id,
            $dictionary_id
        ));

        if (!$exists) {
            return new WP_Error('not_found', 'Слово не найдено в указанном словаре');
        }

        // Фильтруем допустимые поля
        $allowed_fields = [
            'word', 'translation_1', 'translation_2', 'translation_3',
            'translation_input_variable', 'difficult_translation', 'sound_url', 
            'level', 'maxLevel', 'type', 'gender', 'is_phrase'
        ];

        $update_data = array_intersect_key($fields, array_flip($allowed_fields));

        if (empty($update_data)) {
            return new WP_Error('no_fields', 'Нет данных для обновления');
        }

        // Обновление
        $updated = $wpdb->update($table, $update_data, ['id' => $word_id], null, ['%d']);

        return $updated !== false;
    }

    /**
     * Создать новое слово в словаре.
     *
     * @param int $dictionary_id
     * @param array $word_data — данные слова
     * @param array $category_ids — массив ID категорий
     * @return int|false ID созданного слова или false
     */
    public static function create_word_in_dictionary($dictionary_id, $word_data, $category_ids = []) {
        return create_word($dictionary_id, $word_data, $category_ids);
    }

    /**
     * Удалить слово из словаря.
     *
     * @param int $word_id
     * @return bool
     */
    public static function delete_word_from_dictionary($word_id) {
        return delete_word($word_id);
    }

    /**
     * Изменить порядок слов в категории
     *
     * @param int $category_id ID категории
     * @param array $word_orders Массив объектов [{word_id: 123, order: 1}, ...]
     * @return int|WP_Error Количество обновленных слов или WP_Error
     */
    public static function reorder_category_words($category_id, $word_orders) {
        global $wpdb;
        
        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';
        
        // Получаем все слова из категории для проверки
        $category_word_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT word_id FROM $word_category_table WHERE category_id = %d",
            $category_id
        ));
        
        if (empty($category_word_ids)) {
            return new WP_Error('empty_category', 'Категория пуста или не найдена');
        }
        
        $updated_count = 0;
        
        // Обновляем порядок для каждого слова
        foreach ($word_orders as $item) {
            $word_id = intval($item['word_id'] ?? 0);
            $order = intval($item['order'] ?? 0);
            
            if (!$word_id || !in_array($word_id, $category_word_ids)) {
                continue; // Пропускаем слова, не принадлежащие категории
            }
            
            $result = $wpdb->update(
                $words_table,
                ['order' => $order],
                ['id' => $word_id],
                ['%d'],
                ['%d']
            );
            
            if ($result !== false) {
                $updated_count++;
            }
        }
        
        return $updated_count;
    }

    /**
     * Автоматическая сортировка слов через OpenAI GPT
     * 
     * @param int $category_id ID категории
     * @param array $words Массив слов [{id, word, translation_1}, ...]
     * @return array|WP_Error Отсортированный массив или ошибка
     */
    public static function sort_words_with_ai($category_id, $words) {
        // Получаем API ключ из настроек (можно добавить в wp-config.php как define('OPENAI_API_KEY', 'sk-...'))
        $api_key = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : get_option('openai_api_key');
        
        if (empty($api_key)) {
            return new WP_Error('no_api_key', 'OpenAI API ключ не настроен');
        }
        
        // Формируем список слов для GPT
        $words_list = array_map(function($word) {
            return $word['word'] . ' → ' . ($word['translation_1'] ?? '');
        }, $words);
        
        $words_text = implode("\n", $words_list);
        
        // Промпт для GPT
        $prompt = "Отсортируй следующие слова по смыслу и частотности встречаемости. Критерии сортировки:

1. Базовые, самые частотные слова (I, you, to be) - в начало
2. Общеупотребительные слова - в середину  
3. Специфичные, редкие слова - в конец

Группируй по смысловым категориям (местоимения, глаголы, существительные и т.д.), внутри категорий сортируй от частых к редким.

Верни ТОЛЬКО слова в новом порядке, по одному на строку, в том же формате 'слово → перевод'. Не добавляй никаких комментариев, заголовков или пояснений.

Слова:\n\n" . $words_text;
        
        // Запрос к OpenAI API
        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([
                'model' => 'gpt-4o',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Ты эксперт-лингвист, специализирующийся на сортировке слов по частотности и смыслу. Отвечай ТОЛЬКО списком слов в формате по одному на строку. Никаких дополнительных комментариев, нумерации или заголовков.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'temperature' => 0.3,
            ])
        ]);
        
        if (is_wp_error($response)) {
            return new WP_Error('api_error', 'Ошибка запроса к OpenAI: ' . $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (empty($body['choices'][0]['message']['content'])) {
            return new WP_Error('empty_response', 'Пустой ответ от OpenAI');
        }
        
        $sorted_text = trim($body['choices'][0]['message']['content']);
        $sorted_lines = explode("\n", $sorted_text);
        
        // Парсим ответ и сопоставляем со словами
        $sorted_words = [];
        $remaining_words = $words;
        
        foreach ($sorted_lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            // Извлекаем слово из строки
            if (preg_match('/^(.+?)\s*→/', $line, $matches)) {
                $word_text = trim($matches[1]);
                
                // Ищем это слово в оригинальном массиве
                foreach ($remaining_words as $key => $original_word) {
                    if (strcasecmp($original_word['word'], $word_text) === 0) {
                        $sorted_words[] = $original_word;
                        unset($remaining_words[$key]);
                        break;
                    }
                }
            }
        }
        
        // Добавляем не найденные слова в конец
        foreach ($remaining_words as $word) {
            $sorted_words[] = $word;
        }
        
        // Проверяем что все слова на месте
        if (count($sorted_words) !== count($words)) {
            return new WP_Error('word_count_mismatch', 'Количество слов не совпадает');
        }
        
        return [
            'success' => true,
            'sorted_words' => $sorted_words,
            'original_count' => count($words),
            'sorted_count' => count($sorted_words),
        ];
    }

    /**
     * Перемешать данные слов для защиты авторских прав
     * 
     * ВАЖНО: Эта операция необратима!
     * 
     * Перемешивает ДАННЫЕ записей случайным образом (ID остаются, но слова меняются местами)
     * 
     * @param int $dictionary_id ID словаря
     * @return array|WP_Error Результат операции
     */
    public static function initialize_and_shuffle_dictionary_words($dictionary_id) {
        global $wpdb;
        
        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';
        
        // Получаем все категории словаря
        $categories = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT category_id FROM $word_category_table wc
            INNER JOIN $words_table w ON wc.word_id = w.id
            WHERE w.dictionary_id = %d",
            $dictionary_id
        ));
        
        if (empty($categories)) {
            return new WP_Error('no_categories', 'Категории не найдены');
        }
        
        $total_shuffled = 0;
        
        // Перемешиваем ДАННЫЕ записей внутри каждой категории
        foreach ($categories as $category_id) {
            // Получаем все записи слов категории
            $words = $wpdb->get_results($wpdb->prepare(
                "SELECT w.* FROM $words_table w
                INNER JOIN $word_category_table wc ON w.id = wc.word_id
                WHERE wc.category_id = %d AND w.dictionary_id = %d
                ORDER BY w.id ASC",
                $category_id,
                $dictionary_id
            ), ARRAY_A);
            
            if (count($words) < 2) {
                continue; // Нечего перемешивать
            }
            
            // Сохраняем ID
            $ids = array_column($words, 'id');
            
            // Перемешиваем данные (кроме id)
            $data_to_shuffle = [];
            foreach ($words as $word) {
                $data = $word;
                unset($data['id']); // ID не трогаем
                $data_to_shuffle[] = $data;
            }
            
            // Случайное перемешивание
            shuffle($data_to_shuffle);
            
            // Записываем перемешанные данные обратно в БД
            foreach ($ids as $index => $id) {
                $update_data = $data_to_shuffle[$index];
                
                $wpdb->update(
                    $words_table,
                    $update_data,
                    ['id' => $id],
                    null,
                    ['%d']
                );
                $total_shuffled++;
            }
        }
        
        return [
            'success' => true,
            'categories_processed' => count($categories),
            'words_shuffled' => $total_shuffled,
            'message' => "Обработано категорий: " . count($categories) . ", перемешано " . $total_shuffled . " записей"
        ];
    }

    /**
     * Получить список всех словарей
     *
     * @return array Список словарей
     */
    public static function get_all_dictionaries() {
        global $wpdb;
        $table = $wpdb->prefix . 'dictionaries';

        $query = "SELECT id, name, lang, learn_lang, words, level, maxLevel FROM $table ORDER BY name ASC";
        $dictionaries = $wpdb->get_results($query, ARRAY_A);

        return $dictionaries ?: [];
    }

    /**
     * Переместить слова из одной категории в другую
     *
     * @param array $word_ids Массив ID слов
     * @param int $source_category_id ID исходной категории
     * @param int $target_category_id ID целевой категории
     * @param int $target_dictionary_id ID целевого словаря (если отличается от исходного)
     * @return array|WP_Error Результат операции
     */
    public static function move_words_to_category($word_ids, $source_category_id, $target_category_id, $target_dictionary_id = null) {
        global $wpdb;

        $word_category_table = $wpdb->prefix . 'd_word_category';
        $words_table = $wpdb->prefix . 'd_words';
        $categories_table = $wpdb->prefix . 'd_categories';

        // Проверяем существование целевой категории
        $target_category = $wpdb->get_row($wpdb->prepare(
            "SELECT id, dictionary_id FROM $categories_table WHERE id = %d",
            $target_category_id
        ), ARRAY_A);

        if (!$target_category) {
            return new WP_Error('category_not_found', 'Целевая категория не найдена');
        }

        $target_dict_id = $target_dictionary_id ?: $target_category['dictionary_id'];

        // Если слова перемещаются в другой словарь, нужно скопировать слова
        $moved_count = 0;
        $errors = [];

        foreach ($word_ids as $word_id) {
            $word_id = intval($word_id);

            // Получаем информацию о слове
            $word = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $words_table WHERE id = %d",
                $word_id
            ), ARRAY_A);

            if (!$word) {
                $errors[] = "Слово ID $word_id не найдено";
                continue;
            }

            $source_dict_id = $word['dictionary_id'];

            // Если словарь отличается, копируем слово
            if ($source_dict_id != $target_dict_id) {
                // Копируем слово в новый словарь
                $new_word_data = $word;
                unset($new_word_data['id']); // Убираем ID для создания новой записи
                $new_word_data['dictionary_id'] = $target_dict_id;

                $result = $wpdb->insert($words_table, $new_word_data);
                if ($result === false) {
                    $errors[] = "Ошибка копирования слова ID $word_id";
                    continue;
                }
                $new_word_id = $wpdb->insert_id;

                // Добавляем связь с целевой категорией
                $wpdb->insert(
                    $word_category_table,
                    ['word_id' => $new_word_id, 'category_id' => $target_category_id],
                    ['%d', '%d']
                );

                // Удаляем связь со старой категорией (если указана)
                if ($source_category_id) {
                    $wpdb->delete(
                        $word_category_table,
                        ['word_id' => $word_id, 'category_id' => $source_category_id],
                        ['%d', '%d']
                    );
                }
            } else {
                // Слова в том же словаре - просто меняем категорию
                // Удаляем старую связь
                if ($source_category_id) {
                    $wpdb->delete(
                        $word_category_table,
                        ['word_id' => $word_id, 'category_id' => $source_category_id],
                        ['%d', '%d']
                    );
                }

                // Проверяем, нет ли уже связи с целевой категорией
                $exists = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM $word_category_table WHERE word_id = %d AND category_id = %d",
                    $word_id,
                    $target_category_id
                ));

                if (!$exists) {
                    // Добавляем новую связь
                    $wpdb->insert(
                        $word_category_table,
                        ['word_id' => $word_id, 'category_id' => $target_category_id],
                        ['%d', '%d']
                    );
                }
            }

            $moved_count++;
        }

        return [
            'success' => true,
            'moved_count' => $moved_count,
            'errors' => $errors,
            'message' => "Перемещено слов: $moved_count" . (!empty($errors) ? ". Ошибок: " . count($errors) : "")
        ];
    }

    /**
     * Скопировать слова в другую категорию (без удаления из исходной)
     *
     * @param array $word_ids Массив ID слов
     * @param int $target_category_id ID целевой категории
     * @param int $target_dictionary_id ID целевого словаря (если отличается от исходного)
     * @return array|WP_Error Результат операции
     */
    public static function copy_words_to_category($word_ids, $target_category_id, $target_dictionary_id = null) {
        global $wpdb;

        $word_category_table = $wpdb->prefix . 'd_word_category';
        $words_table = $wpdb->prefix . 'd_words';
        $categories_table = $wpdb->prefix . 'd_categories';

        // Проверяем существование целевой категории
        $target_category = $wpdb->get_row($wpdb->prepare(
            "SELECT id, dictionary_id FROM $categories_table WHERE id = %d",
            $target_category_id
        ), ARRAY_A);

        if (!$target_category) {
            return new WP_Error('category_not_found', 'Целевая категория не найдена');
        }

        $target_dict_id = $target_dictionary_id ?: $target_category['dictionary_id'];

        $copied_count = 0;
        $errors = [];

        foreach ($word_ids as $word_id) {
            $word_id = intval($word_id);

            // Получаем информацию о слове
            $word = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $words_table WHERE id = %d",
                $word_id
            ), ARRAY_A);

            if (!$word) {
                $errors[] = "Слово ID $word_id не найдено";
                continue;
            }

            $source_dict_id = $word['dictionary_id'];

            // Если словарь отличается, копируем слово
            if ($source_dict_id != $target_dict_id) {
                // Копируем слово в новый словарь
                $new_word_data = $word;
                unset($new_word_data['id']); // Убираем ID для создания новой записи
                $new_word_data['dictionary_id'] = $target_dict_id;

                $result = $wpdb->insert($words_table, $new_word_data);
                if ($result === false) {
                    $errors[] = "Ошибка копирования слова ID $word_id";
                    continue;
                }
                $new_word_id = $wpdb->insert_id;

                // Добавляем связь с целевой категорией
                $wpdb->insert(
                    $word_category_table,
                    ['word_id' => $new_word_id, 'category_id' => $target_category_id],
                    ['%d', '%d']
                );
            } else {
                // Слова в том же словаре - просто добавляем связь с новой категорией
                // Проверяем, нет ли уже связи
                $exists = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM $word_category_table WHERE word_id = %d AND category_id = %d",
                    $word_id,
                    $target_category_id
                ));

                if (!$exists) {
                    $wpdb->insert(
                        $word_category_table,
                        ['word_id' => $word_id, 'category_id' => $target_category_id],
                        ['%d', '%d']
                    );
                }
            }

            $copied_count++;
        }

        return [
            'success' => true,
            'copied_count' => $copied_count,
            'errors' => $errors,
            'message' => "Скопировано слов: $copied_count" . (!empty($errors) ? ". Ошибок: " . count($errors) : "")
        ];
    }
}