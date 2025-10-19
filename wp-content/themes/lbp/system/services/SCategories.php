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
}
