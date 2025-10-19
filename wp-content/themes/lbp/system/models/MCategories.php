<?php

/**
 * Получить все категории словаря
 * @param int $dictionary_id ID словаря
 * @return array Массив категорий
 */
function get_categories_by_dictionary($dictionary_id) {
    global $wpdb;
    
    $categories_table = $wpdb->prefix . 'd_categories';
    
    $query = $wpdb->prepare("
        SELECT id, dictionary_id, name, parent_id, `order`
        FROM $categories_table 
        WHERE dictionary_id = %d
        ORDER BY `order` ASC, id ASC
    ", $dictionary_id);

    $results = $wpdb->get_results($query, ARRAY_A);
    
    // Приводим числовые поля к правильным типам
    foreach ($results as &$category) {
        $category['id'] = intval($category['id']);
        $category['dictionary_id'] = intval($category['dictionary_id']);
        $category['parent_id'] = $category['parent_id'] ? intval($category['parent_id']) : null;
        $category['order'] = intval($category['order']);
    }
    
    return $results;
}

/**
 * Получить категорию по ID
 * @param int $category_id ID категории
 * @return array|null Данные категории или null
 */
function get_category_by_id($category_id) {
    global $wpdb;
    
    $categories_table = $wpdb->prefix . 'd_categories';
    
    $query = $wpdb->prepare("
        SELECT id, dictionary_id, name, parent_id, `order`
        FROM $categories_table 
        WHERE id = %d
    ", $category_id);

    $result = $wpdb->get_row($query, ARRAY_A);
    
    if ($result) {
        // Приводим числовые поля к правильным типам
        $result['id'] = intval($result['id']);
        $result['dictionary_id'] = intval($result['dictionary_id']);
        $result['parent_id'] = $result['parent_id'] ? intval($result['parent_id']) : null;
        $result['order'] = intval($result['order']);
    }
    
    return $result;
}

/**
 * Создать новую категорию
 * @param int $dictionary_id ID словаря
 * @param string $name Название категории
 * @param int|null $parent_id ID родительской категории
 * @param int $order Порядок сортировки
 * @return int|false ID созданной категории или false при ошибке
 */
function create_category($dictionary_id, $name, $parent_id = null, $order = 0) {
    global $wpdb;
    
    $categories_table = $wpdb->prefix . 'd_categories';
    
    // Проверяем, что родительская категория существует и принадлежит тому же словарю
    if ($parent_id) {
        $parent = get_category_by_id($parent_id);
        if (!$parent || $parent['dictionary_id'] != $dictionary_id) {
            return false;
        }
    }
    
    $result = $wpdb->insert(
        $categories_table,
        [
            'dictionary_id' => $dictionary_id,
            'name' => $name,
            'parent_id' => $parent_id,
            'order' => $order
        ],
        ['%d', '%s', '%d', '%d']
    );
    
    return $result ? $wpdb->insert_id : false;
}

/**
 * Обновить категорию
 * @param int $category_id ID категории
 * @param array $fields Поля для обновления
 * @return bool Результат операции
 */
function update_category($category_id, $fields) {
    global $wpdb;
    
    $categories_table = $wpdb->prefix . 'd_categories';
    
    // Фильтруем допустимые поля
    $allowed_fields = ['name', 'parent_id', 'order'];
    $update_data = array_intersect_key($fields, array_flip($allowed_fields));
    
    if (empty($update_data)) {
        return false;
    }
    
    // Проверяем, что родительская категория существует и не создает цикл
    if (isset($update_data['parent_id']) && $update_data['parent_id']) {
        $parent = get_category_by_id($update_data['parent_id']);
        if (!$parent) {
            return false;
        }
        
        // Проверяем на цикл
        if (would_create_cycle($category_id, $update_data['parent_id'])) {
            return false;
        }
    }
    
    $result = $wpdb->update(
        $categories_table,
        $update_data,
        ['id' => $category_id],
        ['%s', '%d', '%d'],
        ['%d']
    );
    
    return $result !== false;
}

/**
 * Удалить категорию
 * @param int $category_id ID категории
 * @return bool Результат операции
 */
function delete_category($category_id) {
    global $wpdb;
    
    $categories_table = $wpdb->prefix . 'd_categories';
    $word_category_table = $wpdb->prefix . 'd_word_category';
    
    // Получаем информацию о категории
    $category = get_category_by_id($category_id);
    if (!$category) {
        return false;
    }
    
    // Перемещаем слова в корень словаря (удаляем связи с категорией)
    $wpdb->delete(
        $word_category_table,
        ['category_id' => $category_id],
        ['%d']
    );
    
    // Перемещаем дочерние категории в корень
    $wpdb->update(
        $categories_table,
        ['parent_id' => null],
        ['parent_id' => $category_id],
        ['%d'],
        ['%d']
    );
    
    // Удаляем саму категорию
    $result = $wpdb->delete(
        $categories_table,
        ['id' => $category_id],
        ['%d']
    );
    
    return $result !== false;
}

/**
 * Проверить, создаст ли изменение родителя цикл
 * @param int $category_id ID категории
 * @param int $new_parent_id ID нового родителя
 * @return bool true если создаст цикл
 */
function would_create_cycle($category_id, $new_parent_id) {
    $current_parent = $new_parent_id;
    
    while ($current_parent) {
        if ($current_parent == $category_id) {
            return true; // Найден цикл
        }
        
        $parent_category = get_category_by_id($current_parent);
        $current_parent = $parent_category ? $parent_category['parent_id'] : null;
    }
    
    return false;
}

/**
 * Получить дерево категорий для словаря
 * @param int $dictionary_id ID словаря
 * @return array Дерево категорий
 */
function get_category_tree($dictionary_id) {
    $categories = get_categories_by_dictionary($dictionary_id);
    return build_category_tree($categories);
}

/**
 * Построить дерево категорий из плоского массива
 * @param array $categories Массив категорий
 * @param int|null $parent_id ID родительской категории
 * @return array Дерево категорий
 */
function build_category_tree($categories, $parent_id = null) {
    $tree = [];
    
    foreach ($categories as $category) {
        if ($category['parent_id'] == $parent_id) {
            $children = build_category_tree($categories, $category['id']);
            if ($children) {
                $category['children'] = $children;
            }
            $tree[] = $category;
        }
    }
    
    return $tree;
}

/**
 * Получить все дочерние категории (рекурсивно)
 * @param int $category_id ID родительской категории
 * @return array Массив ID дочерних категорий
 */
function get_child_category_ids($category_id) {
    $children = [];
    $categories = get_categories_by_dictionary(get_category_by_id($category_id)['dictionary_id']);
    
    foreach ($categories as $category) {
        if ($category['parent_id'] == $category_id) {
            $children[] = $category['id'];
            $children = array_merge($children, get_child_category_ids($category['id']));
        }
    }
    
    return $children;
}

/**
 * Получить максимальный порядок для категорий в словаре или родительской категории
 * @param int $dictionary_id ID словаря
 * @param int|null $parent_id ID родительской категории
 * @return int Максимальный порядок
 */
function get_max_category_order($dictionary_id, $parent_id = null) {
    global $wpdb;
    
    $categories_table = $wpdb->prefix . 'd_categories';
    
    $query = $wpdb->prepare("
        SELECT MAX(`order`) as max_order
        FROM $categories_table 
        WHERE dictionary_id = %d AND parent_id " . ($parent_id ? '= %d' : 'IS NULL'),
        $dictionary_id
    );
    
    if ($parent_id) {
        $query = $wpdb->prepare("
            SELECT MAX(`order`) as max_order
            FROM $categories_table 
            WHERE dictionary_id = %d AND parent_id = %d
        ", $dictionary_id, $parent_id);
    }
    
    $result = $wpdb->get_var($query);
    return $result ? intval($result) : 0;
}
