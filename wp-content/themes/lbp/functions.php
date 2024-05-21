<?php
function mytheme_setup() {
    // Add default posts and comments RSS feed links to head.
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title.
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails on posts and pages.
    add_theme_support('post-thumbnails');

    // Register a single navigation menu.
    register_nav_menus(array(
        'menu-1' => esc_html__('Primary', 'mytheme'),
    ));

    // Switch default core markup for search form, comment form, and comments to output valid HTML5.
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));

    // Add theme support for Custom Logo.
    add_theme_support('custom-logo', array(
        'height' => 50,
        'width' => 200,
        'flex-height' => true,
        'flex-width' => true,
    ));
}
add_action('after_setup_theme', 'mytheme_setup');

// Enqueue scripts and styles.
function mytheme_scripts() {
    wp_enqueue_style('mytheme-style', get_stylesheet_uri());

    // Подключение JavaScript для управления меню
    wp_enqueue_script('mytheme-menu', get_template_directory_uri() . '/assets/js/menu.js', array(), '1.0', true);
}
add_action('wp_enqueue_scripts', 'mytheme_scripts');

function mytheme_widgets_init() {
    register_sidebar(array(
        'name'          => esc_html__('Sidebar', 'mytheme'),
        'id'            => 'sidebar-1',
        'description'   => esc_html__('Add widgets here.', 'mytheme'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
}
add_action('widgets_init', 'mytheme_widgets_init');



// Enqueue Theme JS w React Dependency
add_action( 'wp_enqueue_scripts', 'my_enqueue_theme_js' );
function my_enqueue_theme_js() {
    wp_enqueue_script(
        'my-theme-frontend',
        get_stylesheet_directory_uri() . '/build/index.js',
        ['wp-element'],
        time(), // Change this to null for production
        true
    );
}

add_action( 'wp_enqueue_scripts', 'my_theme_enqueue_styles' );
function my_theme_enqueue_styles() {

    $parent_style = 'twentytwenty-style';

    wp_enqueue_style( $parent_style, get_template_directory_uri() . '/style.css' );

    wp_enqueue_style( 'child-style',
        get_stylesheet_directory_uri() . '/style.css',
        [ $parent_style ],
        time() //wp_get_theme()->get('Version')
    );

    wp_enqueue_script(
        'my-theme-frontend',
        get_stylesheet_directory_uri() . '/build/index.js',
        ['wp-element'],
        time() //For production use wp_get_theme()->get('Version')
    );

}

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
            word varchar(255) NOT NULL,
            level varchar(2) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY word (word),
            KEY level (level)  -- Создание индекса на поле level
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    // Проверка существования уникального индекса на поле 'word'
    $index_exists = $wpdb->get_results("SHOW INDEX FROM $table_name WHERE Key_name = 'word' AND Non_unique = 0");

    if (empty($index_exists)) {
        // Добавление уникального индекса на поле 'word'
        $wpdb->query("ALTER TABLE $table_name ADD UNIQUE (word)");
    }
}

add_action('after_setup_theme', 'create_words_table');

function create_user_words_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'user_words';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            word_id mediumint(9) NOT NULL,
            attempts mediumint(9) NOT NULL DEFAULT 0,
            correct_attempts mediumint(9) NOT NULL DEFAULT 0,
            last_shown datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY word_id (word_id),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->users}(ID) ON DELETE CASCADE,
            FOREIGN KEY (word_id) REFERENCES {$wpdb->prefix}words(id) ON DELETE CASCADE
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

// Парсим слова из JSON
function register_custom_admin_menu() {
    add_menu_page(
        'JSON Parser',         // Название страницы
        'JSON Parser',         // Название меню
        'manage_options',      // Способность
        'json-parser',         // Слаг страницы
        'json_parser_page',    // Функция, которая отображает содержимое страницы
        'dashicons-admin-tools', // Иконка меню
        20                     // Позиция в меню
    );
}

add_action('admin_menu', 'register_custom_admin_menu');

function json_parser_page() {
    ?>
    <div class="wrap">
        <h1>JSON Parser</h1>
        <form method="post" action="">
            <input type="hidden" name="json_parser_action" value="parse_json">
            <input type="submit" class="button button-primary" value="Parse JSON">
        </form>
    </div>
    <?php

    // Обработка отправки формы
    if (isset($_POST['json_parser_action']) && $_POST['json_parser_action'] === 'parse_json') {
        // Укажите путь к вашему JSON файлу
        $json_file = get_template_directory() . '/words.json';
        add_words_from_json($json_file);
        echo '<div class="notice notice-success is-dismissible"><p>JSON data has been parsed and inserted.</p></div>';
    }
}

function add_words_from_json($json_file) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'words';

    $json_data = file_get_contents($json_file);
    $words = json_decode($json_data, true);

    foreach ($words as $word) {
        $wpdb->insert(
            $table_name,
            array(
                'word' => $word['word'],
                'level' => $word['level']
            ),
            array(
                '%s',
                '%s'
            )
        );
    }
}



?>
