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

        // SQL-запрос для получения всех полей слов словаря
        $query = $wpdb->prepare("
            SELECT id, 
                   word,
                   learn_lang,
                   is_phrase,
                   translation_1,
                   translation_2,
                   translation_3,
                   difficult_translation,
                   sound_url,
                   level,
                   maxLevel,
                   type,
                   gender,
                   `order`
            FROM $words_table
            WHERE dictionary_id = %d
            ORDER BY `order`
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
            SELECT w.id, w.word, w.translation_1, w.translation_2, w.translation_3, w.difficult_translation, w.sound_url, w.level, w.maxLevel, w.type, w.gender
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
            'difficult_translation', 'sound_url', 'level', 'maxLevel',
            'type', 'gender', 'is_phrase'
        ];

        $update_data = array_intersect_key($fields, array_flip($allowed_fields));

        if (empty($update_data)) {
            return new WP_Error('no_fields', 'Нет данных для обновления');
        }

        // Обновление
        $updated = $wpdb->update($table, $update_data, ['id' => $word_id], null, ['%d']);

        return $updated !== false;
    }
}