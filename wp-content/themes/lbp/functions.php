<?php
require "system/migrations.php";
require "system/dictionaries_to_db.php";
require "system/models/MWords.php";
require "system/services/SWords.php";

//


/*********** Отключает новый редактор блоков в WordPress (Гутенберг). ************/
if( 'disable_gutenberg' ){
    add_filter( 'use_block_editor_for_post_type', '__return_false', 100 );

    // отключим подключение базовых css стилей для блоков
    // ВАЖНО! когда выйдут виджеты на блоках или что-то еще, эту строку нужно будет комментировать
    remove_action( 'wp_enqueue_scripts', 'wp_common_block_scripts_and_styles' );

    // Move the Privacy Policy help notice back under the title field.
    add_action( 'admin_init', function(){
        remove_action( 'admin_notices', [ 'WP_Privacy_Policy_Content', 'notice' ] );
        add_action( 'edit_form_after_title', [ 'WP_Privacy_Policy_Content', 'notice' ] );
    } );
}



function mytheme_setup() {
    // Add default posts and comments RSS feed links to head.
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title.
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails on posts and pages.
    add_theme_support('post-thumbnails');

    // Register a single navigation menu.
    register_nav_menus(array(
        'menu-1' => esc_html__('Primary'),
        'menu-langs' => esc_html__('Langs'),
        'menu-dictionaries' => esc_html__('Dictionaries'),
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
    wp_enqueue_script('mytheme-cursor-effects', get_template_directory_uri() . '/assets/js/cursor-effects.js', array(), '1.0', true);
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

// Класс для обработки AJAX-запросов
class WordsAjaxHandler {
    public static function handle_get_dictionary() {
        $dictionary_id = intval($_POST['dictionary_id'] ?? 0);

        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Не передан ID словаря']);
            wp_die();
        }

        $dictionary = WordsService::get_dictionary_by_id($dictionary_id);

        if (!$dictionary) {
            wp_send_json_error(['message' => 'Словарь не найден']);
        } else {
            wp_send_json_success($dictionary);
        }

        wp_die();
    }

    /**
     * AJAX-метод для получения списка слов.
     */
    public static function handle_get_user_words() {
        // Проверяем ID словаря
        $dictionary_id = intval($_POST['dictionary_id']);
        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Invalid dictionary_id']);
            wp_die();
        }

        // Получаем слова через сервис
        $words = WordsService::get_words_by_dictionary($dictionary_id);

        // Отправляем ответ
        wp_send_json_success($words);
        wp_die();
    }

    /*public static function handle_get_words_by_category() {
        $dictionary_id = intval($_POST['dictionary_id']);

        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Invalid dictionary_id']);
            wp_die();
        }

        // Получаем данные через сервис
        $grouped_words = WordsService::get_words_grouped_by_category($dictionary_id);

        // Отправляем ответ
        wp_send_json_success($grouped_words);
        wp_die();
    }*/

    public static function handle_get_category_tree() {
        $dictionary_id = intval($_POST['dictionary_id']);
        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Invalid dictionary_id']);
            wp_die();
        }

        // Получаем дерево категорий через сервис
        $category_tree = WordsService::get_category_tree($dictionary_id);

        if (empty($category_tree)) {
            wp_send_json_error(['message' => 'Categories not found']);
            wp_die();
        }

        // Отправляем дерево категорий
        wp_send_json_success($category_tree);
        wp_die();
    }

    /**
     * AJAX-метод для получения списка слов по ID категории.
     */
    public static function handle_get_words_by_category() {
        $category_id = intval($_POST['category_id']);

        if (!$category_id) {
            wp_send_json_error(['message' => 'Invalid category ID']);
            wp_die();
        }

        // Получаем слова через сервис
        $words = WordsService::get_words_by_category($category_id);

        // Отправляем ответ
        wp_send_json_success($words);
        wp_die();
    }

    public static function handle_update_word() {
        // Только для админов и супер-админов
        if (!current_user_can('administrator') && !is_super_admin()) {
            wp_send_json_error(['message' => 'У вас нет прав для редактирования слов.']);
            wp_die();
        }

        $dictionary_id = intval($_POST['dictionary_id']);
        $word_id = intval($_POST['word_id']);
        $fields_raw = $_POST['fields'] ?? '';
        $fields = json_decode(stripslashes($fields_raw), true); // Декодируем JSON → массив

        if (!$dictionary_id || !$word_id || empty($fields) || !is_array($fields)) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $result = WordsService::update_word_in_dictionary($dictionary_id, $word_id, $fields);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success(['updated' => true]);
        }

        wp_die();
    }
}

// Привязка метода AJAX-обработчика
add_action('wp_ajax_get_dictionary', ['WordsAjaxHandler', 'handle_get_dictionary']);
add_action('wp_ajax_nopriv_get_dictionary', ['WordsAjaxHandler', 'handle_get_dictionary']);

add_action('wp_ajax_get_dictionary_words', ['WordsAjaxHandler', 'handle_get_user_words']);
add_action('wp_ajax_nopriv_get_dictionary_words', ['WordsAjaxHandler', 'handle_get_user_words']);


// Привязка метода AJAX-обработчика
add_action('wp_ajax_get_words_by_category', ['WordsAjaxHandler', 'handle_get_words_by_category']);
add_action('wp_ajax_nopriv_get_words_by_category', ['WordsAjaxHandler', 'handle_get_words_by_category']);

add_action('wp_ajax_get_category_tree', ['WordsAjaxHandler', 'handle_get_category_tree']);
add_action('wp_ajax_nopriv_get_category_tree', ['WordsAjaxHandler', 'handle_get_category_tree']);

add_action('wp_ajax_update_word', ['WordsAjaxHandler', 'handle_update_word']);







// NOTE: 8 - before `wp_print_head_scripts`
add_action( 'wp_head', 'myajax_data', 8 );
function myajax_data(){
    $data = [
        'url' => admin_url( 'admin-ajax.php' ),
        'is_admin' => current_user_can('manage_options'),
        'user_id' => get_current_user_id(),
        'is_logged_in' => is_user_logged_in()
    ];
    ?>
    <script id="myajax_data">
      window.myajax = <?= wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ?>
    </script>
    <?php
}













// Добавляем страницу в админку
function add_words_export_page() {
    add_menu_page(
        'Экспорт словаря',
        'Экспорт слов',
        'manage_options',
        'export-dictionary',
        'render_words_export_page',
        'dashicons-download',
        20
    );
}
add_action('admin_menu', 'add_words_export_page');

// Функция рендеринга страницы
function render_words_export_page() {
    ?>
    <div class="wrap">
        <h1>Экспорт слов из словаря</h1>
        <p>Введите ID словаря и нажмите "Экспортировать".</p>
        <input type="number" id="dictionary_id" value="5" min="1" />
        <button id="export_words_btn" class="button button-primary">Экспортировать</button>
        <p id="export_status"></p>

        <script>
          document.getElementById('export_words_btn').addEventListener('click', function() {
            let dictionaryId = document.getElementById('dictionary_id').value;
            if (!dictionaryId) {
              alert('Введите ID словаря!');
              return;
            }

            document.getElementById('export_status').textContent = 'Экспорт в процессе...';

            fetch(ajaxurl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `action=export_dictionary_words&dictionary_id=${dictionaryId}`
            })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  document.getElementById('export_status').innerHTML =
                    `Файл успешно создан: <a href="${data.file_url}" target="_blank">Скачать JSON</a>`;
                } else {
                  document.getElementById('export_status').textContent = 'Ошибка: ' + data.message;
                }
              })
              .catch(error => {
                document.getElementById('export_status').textContent = 'Ошибка: ' + error;
              });
          });
        </script>
    </div>
    <?php
}

// Обработчик AJAX-запроса
function export_dictionary_words() {
    global $wpdb;

    $dictionary_id = intval($_POST['dictionary_id']);
    if (!$dictionary_id) {
        wp_send_json_error(['message' => 'Некорректный ID словаря']);
    }

    $words_table = $wpdb->prefix . 'd_words';

    // Запрос к базе данных
    $query = $wpdb->prepare("
        SELECT id, word, translation_1, translation_2, translation_3, level, maxLevel, type, gender, sound_url
        FROM $words_table
        WHERE dictionary_id = %d
    ", $dictionary_id);

    $words = $wpdb->get_results($query, ARRAY_A);

    if (empty($words)) {
        wp_send_json_error(['message' => 'Слова не найдены']);
    }

    // Создание JSON-файла
    $upload_dir = wp_upload_dir();
    $file_name = "dictionary_{$dictionary_id}.json";
    $file_path = $upload_dir['path'] . '/' . $file_name;
    $file_url = $upload_dir['url'] . '/' . $file_name;

    file_put_contents($file_path, json_encode($words, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    wp_send_json_success(['file_url' => $file_url]);
}
add_action('wp_ajax_export_dictionary_words', 'export_dictionary_words');

?>