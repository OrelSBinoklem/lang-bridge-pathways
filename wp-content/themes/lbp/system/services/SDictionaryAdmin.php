<?php

/**
 * Импорт / экспорт / удаление словарей (WP Admin)
 */
class DictionaryAdminService {

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function get_all_dictionaries() {
        return WordsService::get_all_dictionaries();
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function get_dictionary($dictionary_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'dictionaries';
        $row = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM $table WHERE id = %d", $dictionary_id),
            ARRAY_A
        );
        return $row ?: null;
    }

    /**
     * @param array|string $data JSON string or decoded array
     * @return int|WP_Error dictionary id
     */
    public static function import_from_json($data, array $meta) {
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            if (!is_array($decoded)) {
                return new WP_Error('invalid_json', 'Некорректный JSON');
            }
            $data = $decoded;
        }

        if (!is_array($data) || !$data) {
            return new WP_Error('invalid_json', 'JSON должен быть непустым массивом');
        }

        $name = trim($meta['name'] ?? '');
        $lang = trim($meta['lang'] ?? '');
        $learn_lang = trim($meta['learn_lang'] ?? '');

        if ($name === '' || $lang === '' || $learn_lang === '') {
            return new WP_Error('missing_meta', 'Заполните название, lang и learn_lang');
        }

        $word_count = self::count_words_in_json_tree($data);
        if ($word_count === 0) {
            return new WP_Error('no_words', 'В JSON не найдено слов');
        }

        $level = max(1, (int) ($meta['level'] ?? 1));
        $max_level = max($level, (int) ($meta['maxLevel'] ?? 1));
        $sound = !empty($meta['sound']) ? 1 : 0;

        $computed = self::compute_level_range($data);
        if (!empty($meta['auto_levels'])) {
            if ($computed['min'] < 99) {
                $level = $computed['min'];
            }
            if ($computed['max'] > 0) {
                $max_level = $computed['max'];
            }
        }

        if (!empty($meta['use_json_word_count'])) {
            $word_count = $computed['count'] ?: $word_count;
        } elseif (!empty($meta['words'])) {
            $word_count = (int) $meta['words'];
        }

        global $wpdb;
        $table = $wpdb->prefix . 'dictionaries';
        $inserted = $wpdb->insert(
            $table,
            [
                'name' => $name,
                'lang' => $lang,
                'learn_lang' => $learn_lang,
                'words' => $word_count,
                'level' => $level,
                'maxLevel' => $max_level,
                'sound' => $sound,
            ],
            ['%s', '%s', '%s', '%d', '%d', '%d', '%d']
        );

        if ($inserted === false) {
            return new WP_Error('db_error', 'Не удалось создать запись словаря: ' . $wpdb->last_error);
        }

        $dictionary_id = (int) $wpdb->insert_id;
        add_words_recursion($data, $dictionary_id, null, $learn_lang);

        return $dictionary_id;
    }

    /**
     * @return array{count:int,min:int,max:int}
     */
    public static function compute_level_range(array $data) {
        $count = 0;
        $min = 99;
        $max = 0;

        self::walk_json_tree($data, function ($item) use (&$count, &$min, &$max) {
            if (!isset($item['word'])) {
                return;
            }
            $count++;
            if (isset($item['level'])) {
                $min = min($min, (int) $item['level']);
            }
            if (isset($item['maxLevel'])) {
                $max = max($max, (int) $item['maxLevel']);
            }
        });

        return ['count' => $count, 'min' => $min, 'max' => $max];
    }

    public static function count_words_in_json_tree(array $data) {
        return self::compute_level_range($data)['count'];
    }

    /**
     * @param callable(array):void $on_word
     */
    private static function walk_json_tree(array $data, callable $on_word) {
        foreach ($data as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (isset($item['category']) || isset($item['sub_category'])) {
                $children = $item['sub_catgories'] ?? $item['catgories'] ?? $item['words'] ?? [];
                if (is_array($children)) {
                    self::walk_json_tree($children, $on_word);
                }
                continue;
            }
            if (isset($item['word'])) {
                $on_word($item);
            }
        }
    }

    /**
     * Экспорт в формат, совместимый с import (category / sub_catgories / words)
     *
     * @return array|WP_Error
     */
    public static function export_to_json_tree($dictionary_id) {
        $dictionary_id = (int) $dictionary_id;
        if ($dictionary_id <= 0) {
            return new WP_Error('invalid_id', 'Некорректный ID словаря');
        }

        $dict = self::get_dictionary($dictionary_id);
        if (!$dict) {
            return new WP_Error('not_found', 'Словарь не найден');
        }

        global $wpdb;
        $categories_table = $wpdb->prefix . 'd_categories';
        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';

        $categories = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, name, parent_id, `order` FROM $categories_table WHERE dictionary_id = %d ORDER BY parent_id IS NULL DESC, `order` ASC, id ASC",
                $dictionary_id
            ),
            ARRAY_A
        );

        if (!$categories) {
            return new WP_Error('no_categories', 'У словаря нет категорий');
        }

        $words = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT w.* FROM $words_table w WHERE w.dictionary_id = %d ORDER BY w.`order` ASC, w.id ASC",
                $dictionary_id
            ),
            ARRAY_A
        );

        $links = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT wc.category_id, wc.word_id FROM $word_category_table wc
                 INNER JOIN $words_table w ON w.id = wc.word_id
                 WHERE w.dictionary_id = %d",
                $dictionary_id
            ),
            ARRAY_A
        );

        $words_by_id = [];
        foreach ($words as $word) {
            $words_by_id[(int) $word['id']] = $word;
        }

        $words_by_category = [];
        foreach ($links as $link) {
            $cid = (int) $link['category_id'];
            $wid = (int) $link['word_id'];
            if (!isset($words_by_id[$wid])) {
                continue;
            }
            $words_by_category[$cid][] = $words_by_id[$wid];
        }

        $children_map = [];
        foreach ($categories as $cat) {
            $pid = $cat['parent_id'];
            $parent_key = ($pid === null || $pid === '' || (int) $pid === 0) ? 'root' : (string) (int) $pid;
            $children_map[$parent_key][] = $cat;
        }

        $build = function ($parent_key, $is_root) use (&$build, $children_map, $words_by_category) {
            $nodes = [];
            foreach ($children_map[$parent_key] ?? [] as $cat) {
                $cid = (int) $cat['id'];
                $child_key = (string) $cid;
                $child_categories = $build($child_key, false);
                $cat_words = $words_by_category[$cid] ?? [];

                $node = [];
                if ($is_root) {
                    $node['category'] = $cat['name'];
                } else {
                    $node['sub_category'] = $cat['name'];
                }

                if ($child_categories) {
                    $node['sub_catgories'] = $child_categories;
                }
                if ($cat_words) {
                    $node['words'] = array_map([self::class, 'db_word_to_json'], $cat_words);
                }

                $nodes[] = $node;
            }
            return $nodes;
        };

        return $build('root', true);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function db_word_to_json(array $row) {
        $translations = array_values(array_filter([
            $row['translation_1'] ?? null,
            $row['translation_2'] ?? null,
            $row['translation_3'] ?? null,
        ], static function ($v) {
            return $v !== null && $v !== '';
        }));

        $translated = count($translations) <= 1
            ? ($translations[0] ?? '')
            : $translations;

        $item = [
            'word' => $row['word'],
            'gender' => $row['gender'],
            'translated' => $translated,
            'level' => (int) $row['level'],
            'maxLevel' => (int) $row['maxLevel'],
            'type' => $row['type'],
        ];

        if (!empty($row['difficult_translation'])) {
            $item['difficult_translation'] = $row['difficult_translation'];
        }
        if (!empty($row['sound_url'])) {
            $item['sound'] = $row['sound_url'];
        }

        return $item;
    }

    /**
     * @return true|WP_Error
     */
    public static function delete_dictionary($dictionary_id) {
        global $wpdb;

        $dictionary_id = (int) $dictionary_id;
        if ($dictionary_id <= 0) {
            return new WP_Error('invalid_id', 'Некорректный ID словаря');
        }

        $dict = self::get_dictionary($dictionary_id);
        if (!$dict) {
            return new WP_Error('not_found', 'Словарь не найден');
        }

        $words_table = $wpdb->prefix . 'd_words';
        $categories_table = $wpdb->prefix . 'd_categories';
        $dictionaries_table = $wpdb->prefix . 'dictionaries';
        $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
        $dense_table = $wpdb->prefix . 'dense_training_sessions';

        $word_ids = $wpdb->get_col(
            $wpdb->prepare("SELECT id FROM $words_table WHERE dictionary_id = %d", $dictionary_id)
        );
        if ($word_ids) {
            $ids_sql = implode(',', array_map('intval', $word_ids));
            $wpdb->query("DELETE FROM $user_dict_words_table WHERE dict_word_id IN ($ids_sql)");
        }

        $category_ids = $wpdb->get_col(
            $wpdb->prepare("SELECT id FROM $categories_table WHERE dictionary_id = %d", $dictionary_id)
        );
        if ($category_ids) {
            $cat_sql = implode(',', array_map('intval', $category_ids));
            $wpdb->query("DELETE FROM $dense_table WHERE category_id IN ($cat_sql)");
        }
        $wpdb->delete($dense_table, ['dictionary_id' => $dictionary_id], ['%d']);

        $deleted = $wpdb->delete($dictionaries_table, ['id' => $dictionary_id], ['%d']);
        if ($deleted === false) {
            return new WP_Error('db_error', 'Не удалось удалить словарь: ' . $wpdb->last_error);
        }

        return true;
    }

    public static function count_words_in_db($dictionary_id) {
        global $wpdb;
        $words_table = $wpdb->prefix . 'd_words';
        return (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM $words_table WHERE dictionary_id = %d", $dictionary_id)
        );
    }

    public static function count_categories_in_db($dictionary_id) {
        global $wpdb;
        $categories_table = $wpdb->prefix . 'd_categories';
        return (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM $categories_table WHERE dictionary_id = %d", $dictionary_id)
        );
    }
}
