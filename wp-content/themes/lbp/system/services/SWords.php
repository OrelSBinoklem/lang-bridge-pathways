<?php

// Сервис для работы с таблицей слов
class WordsService {
    /**
     * Получить список слов из словаря.
     *
     * @param int $dictionary_id ID словаря
     * @return array Список слов
     */
    public static function get_words_by_dictionary($dictionary_id) {
        global $wpdb;

        $unique_words_table = $wpdb->prefix . 'unique_words';
        $words_table = $wpdb->prefix . 'd_words';

        // SQL-запрос для получения списка слов и их переводов
        $query = $wpdb->prepare("
            SELECT uw.word,
                   dw.translation_1,
                   dw.translation_2,
                   dw.translation_3
            FROM $unique_words_table AS uw
            INNER JOIN $words_table AS dw
            ON uw.word = dw.word AND uw.lang = dw.learn_lang
            WHERE dw.dictionary_id = %d
        ", $dictionary_id);

        return $wpdb->get_results($query, ARRAY_A);
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
}