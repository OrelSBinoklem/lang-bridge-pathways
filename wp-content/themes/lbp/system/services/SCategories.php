<?php

// Сервис для работы с таблицей категорий
class CategoriesService {
    /**
     * Получить все категории словаря.
     *
     * @param int $dictionary_id ID словаря
     * @return array Список категорий
     */
    public static function get_categories_by_dictionary($dictionary_id) {
        return get_categories_by_dictionary($dictionary_id);
    }

    /**
     * Получить категорию по ID.
     *
     * @param int $category_id ID категории
     * @return array|null Данные категории или null
     */
    public static function get_category_by_id($category_id) {
        return get_category_by_id($category_id);
    }

    /**
     * Создать новую категорию.
     *
     * @param int $dictionary_id ID словаря
     * @param string $name Название категории
     * @param int|null $parent_id ID родительской категории
     * @param int $order Порядок сортировки
     * @return int|false ID созданной категории или false при ошибке
     */
    public static function create_category($dictionary_id, $name, $parent_id = null, $order = 0) {
        return create_category($dictionary_id, $name, $parent_id, $order);
    }

    /**
     * Обновить категорию.
     *
     * @param int $category_id ID категории
     * @param array $fields Поля для обновления
     * @return bool Результат операции
     */
    public static function update_category($category_id, $fields) {
        return update_category($category_id, $fields);
    }

    /**
     * Удалить категорию.
     *
     * @param int $category_id ID категории
     * @return bool Результат операции
     */
    public static function delete_category($category_id) {
        return delete_category($category_id);
    }

    /**
     * Получить дерево категорий для словаря.
     *
     * @param int $dictionary_id ID словаря
     * @return array Дерево категорий
     */
    public static function get_category_tree($dictionary_id) {
        return get_category_tree($dictionary_id);
    }

    /**
     * Получить все дочерние категории (рекурсивно).
     *
     * @param int $category_id ID родительской категории
     * @return array Массив ID дочерних категорий
     */
    public static function get_child_category_ids($category_id) {
        return get_child_category_ids($category_id);
    }

    /**
     * Получить максимальный порядок для категорий в словаре или родительской категории.
     *
     * @param int $dictionary_id ID словаря
     * @param int|null $parent_id ID родительской категории
     * @return int Максимальный порядок
     */
    public static function get_max_category_order($dictionary_id, $parent_id = null) {
        return get_max_category_order($dictionary_id, $parent_id);
    }

    /**
     * Валидировать данные категории.
     *
     * @param array $data Данные для валидации
     * @return array Массив ошибок (пустой если валидация прошла)
     */
    public static function validate_category_data($data) {
        $errors = [];

        // Проверяем название
        if (empty($data['name']) || !is_string($data['name'])) {
            $errors[] = 'Название категории обязательно';
        } elseif (strlen(trim($data['name'])) < 2) {
            $errors[] = 'Название категории должно содержать минимум 2 символа';
        } elseif (strlen(trim($data['name'])) > 255) {
            $errors[] = 'Название категории не должно превышать 255 символов';
        }

        // Проверяем parent_id
        if (isset($data['parent_id']) && $data['parent_id'] !== null) {
            if (!is_numeric($data['parent_id']) || intval($data['parent_id']) <= 0) {
                $errors[] = 'Неверный ID родительской категории';
            }
        }

        // Проверяем order
        if (isset($data['order'])) {
            if (!is_numeric($data['order']) || intval($data['order']) < 0) {
                $errors[] = 'Порядок должен быть неотрицательным числом';
            }
        }

        return $errors;
    }

    /**
     * Получить список категорий для выбора родителя (исключая текущую и её дочерние).
     *
     * @param int $dictionary_id ID словаря
     * @param int|null $exclude_id ID категории для исключения
     * @return array Список категорий
     */
    public static function get_parent_options($dictionary_id, $exclude_id = null) {
        $categories = get_categories_by_dictionary($dictionary_id);
        
        // Исключаем текущую категорию и её дочерние
        if ($exclude_id) {
            $exclude_ids = [$exclude_id];
            $exclude_ids = array_merge($exclude_ids, get_child_category_ids($exclude_id));
            
            $categories = array_filter($categories, function($category) use ($exclude_ids) {
                return !in_array($category['id'], $exclude_ids);
            });
        }
        
        return array_values($categories);
    }

    /**
     * Переместить категорию в новую позицию.
     *
     * @param int $category_id ID категории
     * @param int $new_order Новый порядок
     * @param int|null $new_parent_id Новый родитель
     * @return bool Результат операции
     */
    public static function move_category($category_id, $new_order, $new_parent_id = null) {
        $category = get_category_by_id($category_id);
        if (!$category) {
            return false;
        }

        $update_data = ['order' => $new_order];
        
        if ($new_parent_id !== $category['parent_id']) {
            // Проверяем, что новый родитель существует и не создает цикл
            if ($new_parent_id) {
                $parent = get_category_by_id($new_parent_id);
                if (!$parent || $parent['dictionary_id'] != $category['dictionary_id']) {
                    return false;
                }
                
                if (would_create_cycle($category_id, $new_parent_id)) {
                    return false;
                }
            }
            
            $update_data['parent_id'] = $new_parent_id;
        }

        return update_category($category_id, $update_data);
    }

    /**
     * Получить статистику по категории.
     *
     * @param int $category_id ID категории
     * @return array Статистика
     */
    public static function get_category_stats($category_id) {
        global $wpdb;
        
        $word_category_table = $wpdb->prefix . 'd_word_category';
        $words_table = $wpdb->prefix . 'd_words';
        $categories_table = $wpdb->prefix . 'd_categories';
        
        // Количество слов в категории
        $word_count = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM $word_category_table wc
            INNER JOIN $words_table w ON wc.word_id = w.id
            WHERE wc.category_id = %d
        ", $category_id));
        
        // Количество дочерних категорий
        $child_count = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM $categories_table
            WHERE parent_id = %d
        ", $category_id));
        
        return [
            'word_count' => intval($word_count),
            'child_count' => intval($child_count)
        ];
    }

    /**
     * Обновить порядок категорий одного уровня.
     *
     * @param int $dictionary_id ID словаря
     * @param int|null $parent_id ID родительской категории (null для корневых)
     * @param array $category_orders Массив [{category_id: 123, order: 1}, ...]
     * @return int|WP_Error Количество обновленных категорий или ошибка
     */
    public static function reorder_categories($dictionary_id, $parent_id, $category_orders) {
        global $wpdb;
        
        $categories_table = $wpdb->prefix . 'd_categories';
        
        // Проверяем, что все категории принадлежат словарю и имеют правильный parent_id
        $parent_condition = $parent_id === null || $parent_id === '' 
            ? 'parent_id IS NULL' 
            : $wpdb->prepare('parent_id = %d', intval($parent_id));
        
        $valid_category_ids = $wpdb->get_col($wpdb->prepare("
            SELECT id 
            FROM $categories_table 
            WHERE dictionary_id = %d AND $parent_condition
        ", $dictionary_id));
        
        if (empty($valid_category_ids)) {
            return new WP_Error('no_categories', 'Категории не найдены');
        }
        
        $updated_count = 0;
        
        // Обновляем порядок для каждой категории
        foreach ($category_orders as $item) {
            $category_id = intval($item['category_id'] ?? 0);
            $order = intval($item['order'] ?? 0);
            
            if (!$category_id || !in_array($category_id, $valid_category_ids)) {
                continue; // Пропускаем категории, не принадлежащие этому уровню
            }
            
            $result = $wpdb->update(
                $categories_table,
                ['order' => $order],
                ['id' => $category_id],
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
     * Переместить категорию (с поддеревом и словами) в другой словарь.
     * Поддерживает слова, которые одновременно состоят и в переносимой, и в "внешней" категории:
     * такие слова клонируются в целевой словарь, а связи переносимого поддерева переключаются на клон.
     *
     * @param int $category_id
     * @param int $target_dictionary_id
     * @param int|null $target_parent_id
     * @return array|WP_Error
     */
    public static function move_category_to_dictionary($category_id, $target_dictionary_id, $target_parent_id = null) {
        global $wpdb;

        $category_id = intval($category_id);
        $target_dictionary_id = intval($target_dictionary_id);
        $target_parent_id = $target_parent_id ? intval($target_parent_id) : null;

        if (!$category_id || !$target_dictionary_id) {
            return new WP_Error('invalid_input', 'Некорректные входные данные');
        }

        $categories_table = $wpdb->prefix . 'd_categories';
        $dictionaries_table = $wpdb->prefix . 'dictionaries';
        $words_table = $wpdb->prefix . 'd_words';
        $word_category_table = $wpdb->prefix . 'd_word_category';
        $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
        $dense_sessions_table = $wpdb->prefix . 'dense_training_sessions';

        $source_category = get_category_by_id($category_id);
        if (!$source_category) {
            return new WP_Error('category_not_found', 'Категория не найдена');
        }

        $source_dictionary_id = intval($source_category['dictionary_id']);
        if ($source_dictionary_id === $target_dictionary_id) {
            return new WP_Error('same_dictionary', 'Категория уже находится в этом словаре');
        }

        $target_dictionary_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $dictionaries_table WHERE id = %d",
            $target_dictionary_id
        ));
        if (!$target_dictionary_exists) {
            return new WP_Error('target_dictionary_not_found', 'Целевой словарь не найден');
        }

        if ($target_parent_id) {
            $target_parent = get_category_by_id($target_parent_id);
            if (!$target_parent || intval($target_parent['dictionary_id']) !== $target_dictionary_id) {
                return new WP_Error('invalid_target_parent', 'Целевая родительская категория не найдена в выбранном словаре');
            }
        }

        $child_ids = get_child_category_ids($category_id);
        $subtree_ids = array_values(array_unique(array_merge([$category_id], array_map('intval', $child_ids))));
        if (empty($subtree_ids)) {
            return new WP_Error('empty_subtree', 'Не удалось определить поддерево категории');
        }

        $root_new_order = get_max_category_order($target_dictionary_id, $target_parent_id) + 1;

        $placeholders_subtree = implode(',', array_fill(0, count($subtree_ids), '%d'));
        $subtree_word_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT DISTINCT word_id FROM $word_category_table WHERE category_id IN ($placeholders_subtree)",
                ...$subtree_ids
            )
        );
        $subtree_word_ids = array_values(array_filter(array_map('intval', $subtree_word_ids)));

        $moved_words = 0;
        $cloned_words = 0;
        $word_id_map = []; // old_word_id => new_word_id для слов-клонов

        $wpdb->query('START TRANSACTION');
        try {
            // 1) Переносим категорию-узел + всё поддерево в целевой словарь
            $updated_root = $wpdb->update(
                $categories_table,
                [
                    'dictionary_id' => $target_dictionary_id,
                    'parent_id' => $target_parent_id,
                    'order' => $root_new_order,
                ],
                ['id' => $category_id],
                ['%d', '%d', '%d'],
                ['%d']
            );
            if ($updated_root === false) {
                throw new Exception('Ошибка переноса корневой категории');
            }

            $descendant_ids = array_values(array_filter($subtree_ids, function($id) use ($category_id) {
                return intval($id) !== intval($category_id);
            }));
            if (!empty($descendant_ids)) {
                $desc_placeholders = implode(',', array_fill(0, count($descendant_ids), '%d'));
                $res_desc = $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE $categories_table SET dictionary_id = %d WHERE id IN ($desc_placeholders)",
                        $target_dictionary_id,
                        ...$descendant_ids
                    )
                );
                if ($res_desc === false) {
                    throw new Exception('Ошибка переноса дочерних категорий');
                }
            }

            // 2) Переносим/клонируем слова, связанные с поддеревом
            foreach ($subtree_word_ids as $word_id) {
                $word = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM $words_table WHERE id = %d",
                    $word_id
                ), ARRAY_A);
                if (!$word) continue;

                $linked_categories = $wpdb->get_col($wpdb->prepare(
                    "SELECT category_id FROM $word_category_table WHERE word_id = %d",
                    $word_id
                ));
                $linked_categories = array_values(array_filter(array_map('intval', $linked_categories)));
                if (empty($linked_categories)) continue;

                $in_subtree = array_values(array_intersect($linked_categories, $subtree_ids));
                $outside_subtree = array_values(array_diff($linked_categories, $subtree_ids));

                if (empty($outside_subtree)) {
                    // Слово используется только в переносимом поддереве -> просто меняем dictionary_id
                    $res_word_update = $wpdb->update(
                        $words_table,
                        ['dictionary_id' => $target_dictionary_id],
                        ['id' => $word_id],
                        ['%d'],
                        ['%d']
                    );
                    if ($res_word_update === false) {
                        throw new Exception("Ошибка обновления dictionary_id для слова ID {$word_id}");
                    }
                    $moved_words++;
                    continue;
                }

                // Слово используется и вне переносимого поддерева:
                // создаём клон в целевом словаре и привязываем только к категориям поддерева.
                $new_word = $word;
                unset($new_word['id']);
                $new_word['dictionary_id'] = $target_dictionary_id;

                $res_clone = $wpdb->insert($words_table, $new_word);
                if ($res_clone === false) {
                    throw new Exception("Ошибка клонирования слова ID {$word_id}");
                }
                $new_word_id = intval($wpdb->insert_id);
                $word_id_map[$word_id] = $new_word_id;

                // Переключаем связи поддерева на новый word_id
                foreach ($in_subtree as $cat_id) {
                    $res_delete_link = $wpdb->delete(
                        $word_category_table,
                        ['word_id' => $word_id, 'category_id' => $cat_id],
                        ['%d', '%d']
                    );
                    if ($res_delete_link === false) {
                        throw new Exception("Ошибка удаления старой связи word/category для слова ID {$word_id}");
                    }

                    $insert_link_sql = $wpdb->prepare(
                        "INSERT IGNORE INTO $word_category_table (word_id, category_id) VALUES (%d, %d)",
                        $new_word_id,
                        $cat_id
                    );
                    $res_insert_link = $wpdb->query($insert_link_sql);
                    if ($res_insert_link === false) {
                        throw new Exception("Ошибка создания связи для нового слова ID {$new_word_id}");
                    }
                }

                // Копируем пользовательский прогресс на клон слова
                $progress_rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT * FROM $user_dict_words_table WHERE dict_word_id = %d",
                    $word_id
                ), ARRAY_A);
                if (!empty($progress_rows)) {
                    foreach ($progress_rows as $row) {
                        unset($row['id']);
                        $row['dict_word_id'] = $new_word_id;
                        $res_progress = $wpdb->insert($user_dict_words_table, $row);
                        if ($res_progress === false) {
                            throw new Exception("Ошибка копирования прогресса user_dict_words для слова ID {$word_id}");
                        }
                    }
                }

                $cloned_words++;
            }

            // 3) Обновляем dictionary_id в dense-сессиях по перенесённым категориям
            $dense_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT id, dense_word_ids_direct, dense_review_word_ids_direct, dense_word_ids_revert, dense_review_word_ids_revert
                     FROM $dense_sessions_table
                     WHERE category_id IN ($placeholders_subtree)",
                    ...$subtree_ids
                ),
                ARRAY_A
            );

            if (!empty($dense_rows)) {
                $dense_fields = [
                    'dense_word_ids_direct',
                    'dense_review_word_ids_direct',
                    'dense_word_ids_revert',
                    'dense_review_word_ids_revert',
                ];
                foreach ($dense_rows as $dense_row) {
                    $update_data = ['dictionary_id' => $target_dictionary_id];
                    foreach ($dense_fields as $field) {
                        $raw = $dense_row[$field];
                        if ($raw === null || $raw === '') continue;
                        $decoded = json_decode($raw, true);
                        if (!is_array($decoded)) continue;
                        $mapped = array_map(function($id) use ($word_id_map) {
                            $id = intval($id);
                            return isset($word_id_map[$id]) ? intval($word_id_map[$id]) : $id;
                        }, $decoded);
                        $update_data[$field] = wp_json_encode(array_values($mapped), JSON_UNESCAPED_UNICODE);
                    }

                    $res_dense = $wpdb->update(
                        $dense_sessions_table,
                        $update_data,
                        ['id' => intval($dense_row['id'])]
                    );
                    if ($res_dense === false) {
                        throw new Exception('Ошибка обновления dense-сессий');
                    }
                }
            }

            // 4) Синхронизируем счётчики "words" в словарях
            $source_words_count = intval($wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $words_table WHERE dictionary_id = %d",
                $source_dictionary_id
            )));
            $target_words_count = intval($wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $words_table WHERE dictionary_id = %d",
                $target_dictionary_id
            )));

            $res_source_count = $wpdb->update(
                $dictionaries_table,
                ['words' => $source_words_count],
                ['id' => $source_dictionary_id],
                ['%d'],
                ['%d']
            );
            if ($res_source_count === false) {
                throw new Exception('Ошибка обновления счётчика слов исходного словаря');
            }

            $res_target_count = $wpdb->update(
                $dictionaries_table,
                ['words' => $target_words_count],
                ['id' => $target_dictionary_id],
                ['%d'],
                ['%d']
            );
            if ($res_target_count === false) {
                throw new Exception('Ошибка обновления счётчика слов целевого словаря');
            }

            $wpdb->query('COMMIT');

            return [
                'success' => true,
                'moved_category_id' => $category_id,
                'target_dictionary_id' => $target_dictionary_id,
                'moved_subcategories_count' => max(0, count($subtree_ids) - 1),
                'moved_words_count' => $moved_words,
                'cloned_words_count' => $cloned_words,
                'message' => 'Категория успешно перенесена в другой словарь',
            ];
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('move_category_failed', $e->getMessage());
        }
    }
}
