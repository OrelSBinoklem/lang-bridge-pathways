<?php

/** Создаём таблицу словарей
 * @return void
 */
function create_dictionaries_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'dictionaries';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            lang varchar(10) NOT NULL,
            learn_lang varchar(10) NOT NULL,
            words mediumint(9) NOT NULL,
            level mediumint(9) NOT NULL,
            maxLevel mediumint(9) NOT NULL,
            sound BOOLEAN NOT NULL DEFAULT 0,
            PRIMARY KEY (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_dictionaries_table');

/** Создаём таблицу словарей
 * @return void
 */

function create_dictionaries_categories_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'd_categories';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            dictionary_id mediumint(9) NOT NULL,
            name varchar(255) NOT NULL,
            parent_id mediumint(9),
            `order` mediumint(9) NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            FOREIGN KEY (dictionary_id) REFERENCES {$wpdb->prefix}dictionaries(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES $table_name(id) ON DELETE CASCADE
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_dictionaries_categories_table');

/** Создаём таблицу слов
 * @return void
 */

function create_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'd_words';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            dictionary_id mediumint(9) NOT NULL,
            word varchar(255) NOT NULL,
            learn_lang varchar(10) NOT NULL,
            is_phrase tinyint(1) NOT NULL DEFAULT 0,
            translation_1 varchar(255) NOT NULL,
            translation_2 varchar(255) DEFAULT NULL,
            translation_3 varchar(255) DEFAULT NULL,
            difficult_translation varchar(255) DEFAULT NULL,
            sound_url varchar(255) DEFAULT NULL,
            level tinyint(1) DEFAULT NULL CHECK (level BETWEEN 1 AND 6),
            maxLevel tinyint(1) NOT NULL CHECK (maxLevel BETWEEN 1 AND 6),
            type varchar(50) DEFAULT NULL,
            gender char(1) DEFAULT NULL,
            `order` mediumint(9) NOT NULL,
            PRIMARY KEY (id),
            KEY word (word),
            FOREIGN KEY (dictionary_id) REFERENCES {$wpdb->prefix}dictionaries(id) ON DELETE CASCADE
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_words_table');

/** Поле info в d_words: добавить при отсутствии, при varchar — обновить до TEXT. */
function ensure_info_column_words() {
    global $wpdb;
    $t = $wpdb->prefix . 'd_words';
    if ($wpdb->get_var("SHOW TABLES LIKE '$t'") !== $t) return;
    $has = $wpdb->get_var($wpdb->prepare("SHOW COLUMNS FROM $t LIKE %s", 'info'));
    if (!$has) {
        $wpdb->query("ALTER TABLE $t ADD COLUMN info TEXT DEFAULT NULL AFTER difficult_translation");
        return;
    }
    $col = $wpdb->get_row($wpdb->prepare("SHOW FULL COLUMNS FROM $t WHERE Field = %s", 'info'));
    if ($col && strpos(strtolower($col->Type), 'varchar') === 0) {
        $wpdb->query("ALTER TABLE $t MODIFY COLUMN info TEXT DEFAULT NULL");
    }
}
add_action('after_setup_theme', 'ensure_info_column_words');

/** Создаём таблицу связей между словами и категориями словарей
 * @return void
 */
function create_word_category_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'd_word_category';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            word_id mediumint(9) NOT NULL,
            category_id mediumint(9) NOT NULL,
            PRIMARY KEY (word_id, category_id),
            FOREIGN KEY (word_id) REFERENCES {$wpdb->prefix}d_words(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES {$wpdb->prefix}d_categories(id) ON DELETE CASCADE
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_word_category_table');

function create_unique_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'unique_words';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            word varchar(255) NOT NULL,
            lang varchar(10) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_word_lang (word, lang)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_unique_words_table');


// todo Уникальными могут быть только значения слов!!!
// todo при проверке слова надо найти все варианты переводов из всех словарей и при любом совпадении помечать что юзер правильно перевёл
function create_user_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_words';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            unique_word_id mediumint(9) NOT NULL,
            attempts mediumint(9) NOT NULL DEFAULT 0,
            correct_attempts mediumint(9) NOT NULL DEFAULT 0,
            last_shown datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY unique_word_id (unique_word_id),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->users}(ID) ON DELETE CASCADE,
            FOREIGN KEY (unique_word_id) REFERENCES {$wpdb->prefix}unique_words(id) ON DELETE CASCADE
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_user_words_table');

function create_user_categories_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'd_user_categories';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            category_id mediumint(9) NOT NULL,
            attempts mediumint(9) NOT NULL DEFAULT 0,
            correct_attempts mediumint(9) NOT NULL DEFAULT 0,
            last_shown datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->users}(ID) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES {$wpdb->prefix}d_categories(id) ON DELETE CASCADE
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_user_categories_table');

/** Создаём таблицу пользовательских слов из словаря
 * @return void
 */
function create_user_dict_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_dict_words';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            dict_word_id mediumint(9) NOT NULL,
            attempts mediumint(9) NOT NULL DEFAULT 0,
            correct_attempts mediumint(9) NOT NULL DEFAULT 0,
            last_shown datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            easy_education tinyint(1) NOT NULL DEFAULT 0,
            mode_education tinyint(1) NOT NULL DEFAULT 0,
            attempts_all mediumint(9) NOT NULL DEFAULT 0,
            correct_attempts_all mediumint(9) NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY dict_word_id (dict_word_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Выполнение запроса и логирование ошибок
        $result = dbDelta($sql);
        if (!empty($result)) {
            error_log(print_r($result, true)); // Логирование результата dbDelta
        } else {
            error_log('Table creation failed: no result from dbDelta');
        }
    }
}

add_action('after_setup_theme', 'create_user_dict_words_table');

/** Добавляем поля для мониторинга обратного перевода в таблицу user_dict_words
 * @return void
 */
function add_revert_fields_to_user_dict_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_dict_words';

    // Проверяем, существуют ли уже эти поля
    $columns = $wpdb->get_col("DESCRIBE $table_name");
    
    if (!in_array('attempts_revert', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN attempts_revert mediumint(9) NOT NULL DEFAULT 0 AFTER correct_attempts_all");
        error_log('Added attempts_revert field to user_dict_words table');
    }
    
    if (!in_array('correct_attempts_revert', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN correct_attempts_revert mediumint(9) NOT NULL DEFAULT 0 AFTER attempts_revert");
        error_log('Added correct_attempts_revert field to user_dict_words table');
    }
    
    if (!in_array('easy_correct', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN easy_correct tinyint(1) NOT NULL DEFAULT 0 AFTER correct_attempts_revert");
        error_log('Added easy_correct field to user_dict_words table');
    }
    
    if (!in_array('easy_correct_revert', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN easy_correct_revert tinyint(1) NOT NULL DEFAULT 0 AFTER easy_correct");
        error_log('Added easy_correct_revert field to user_dict_words table');
    }
}

add_action('after_setup_theme', 'add_revert_fields_to_user_dict_words_table');

function add_training_mode_fields_to_user_dict_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_dict_words';

    // Проверяем, существуют ли уже эти поля
    $columns = $wpdb->get_col("DESCRIBE $table_name");
    
    if (!in_array('last_shown_revert', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN last_shown_revert datetime DEFAULT NULL AFTER last_shown");
        error_log('Added last_shown_revert field to user_dict_words table');
    }
    
    if (!in_array('mode_education', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN mode_education tinyint(1) NOT NULL DEFAULT 0 AFTER easy_correct_revert");
        error_log('Added mode_education field to user_dict_words table');
    }
    
    if (!in_array('mode_education_revert', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN mode_education_revert tinyint(1) NOT NULL DEFAULT 0 AFTER mode_education");
        error_log('Added mode_education_revert field to user_dict_words table');
    }
}

add_action('after_setup_theme', 'add_training_mode_fields_to_user_dict_words_table');

/** Добавляем поле order в таблицу категорий словарей
 * @return void
 */
function add_order_field_to_categories_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'd_categories';

    // Проверяем, существует ли уже поле order
    $columns = $wpdb->get_col("DESCRIBE $table_name");
    
    if (!in_array('order', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN `order` mediumint(9) NOT NULL DEFAULT 0 AFTER parent_id");
        error_log('Added order field to d_categories table');
    }
}

add_action('after_setup_theme', 'add_order_field_to_categories_table');

/** Добавляем поле translation_input_variable в таблицу слов
 * @return void
 */
function add_translation_input_variable_to_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'd_words';

    // Проверяем, существует ли уже поле translation_input_variable
    $columns = $wpdb->get_col("DESCRIBE $table_name");
    
    if (!in_array('translation_input_variable', $columns)) {
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN translation_input_variable TEXT DEFAULT NULL AFTER translation_3");
        error_log('Added translation_input_variable field to d_words table');
    }
}

add_action('after_setup_theme', 'add_translation_input_variable_to_words_table');

/**
 * Таблица сессий плотного дообучения (user x category).
 * Храним 4 стека (direct/revert + review), счётчик кругов и время старта ожидания 15 минут.
 */
function create_dense_training_sessions_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'dense_training_sessions';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            dictionary_id mediumint(9) NOT NULL DEFAULT 0,
            category_id mediumint(9) NOT NULL,
            dense_word_ids_direct longtext NULL,
            dense_review_word_ids_direct longtext NULL,
            dense_word_ids_revert longtext NULL,
            dense_review_word_ids_revert longtext NULL,
            attempts_left smallint(5) unsigned NOT NULL DEFAULT 3,
            waiting_since datetime NULL,
            use_random tinyint(1) NOT NULL DEFAULT 1,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_user_category (user_id, category_id),
            KEY idx_user (user_id),
            KEY idx_category (category_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}
add_action('after_setup_theme', 'create_dense_training_sessions_table');