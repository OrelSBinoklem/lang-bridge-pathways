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

function create_categories_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'categories';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            dictionary_id mediumint(9) NOT NULL,
            name varchar(255) NOT NULL,
            parent_id mediumint(9),
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

add_action('after_setup_theme', 'create_categories_table');

/** Создаём таблицу слов
 * @return void
 */

function create_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'words';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            dictionary_id mediumint(9) NOT NULL,
            category_id mediumint(9) NOT NULL,
            word varchar(255) NOT NULL,
            translation_1 varchar(255) NOT NULL,
            translation_2 varchar(255) DEFAULT NULL,
            translation_3 varchar(255) DEFAULT NULL,
            sound_url varchar(255),
            level tinyint(1) NOT NULL CHECK (level BETWEEN 1 AND 6),
            maxLevel tinyint(1) NOT NULL CHECK (maxLevel BETWEEN 1 AND 6),
            type varchar(50) NOT NULL,
            gender char(1) DEFAULT NULL,
            `order` mediumint(9) NOT NULL,
            PRIMARY KEY (id),
            KEY word (word),
            UNIQUE KEY unique_word_dictionary (word, dictionary_id),
            FOREIGN KEY (dictionary_id) REFERENCES {$wpdb->prefix}dictionaries(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES {$wpdb->prefix}categories(id) ON DELETE CASCADE
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
