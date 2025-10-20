<?php
require "system/migrations.php";
require "system/dictionaries_to_db.php";
require "system/models/MWords.php";
require "system/models/MCategories.php";
require "system/services/SWords.php";
require "system/services/SCategories.php";

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

// Скрыть админ-бар на фронтенде
add_filter('show_admin_bar', '__return_false');



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

    // Подключаем Bootstrap для обеих страниц (нужен для form-control)
    if (is_page_template('page-interactive-cheat-sheet.php') || is_page_template('page-grammar-tables.php')) {
        wp_enqueue_style(
            'bootstrap-css',
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
            [],
            '5.3.3'
        );
        
        wp_enqueue_script(
            'bootstrap-js',
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
            [],
            '5.3.3',
            true
        );
    }

    // Подключение стилей для интерактивной шпаргалки только на нужной странице
    if (is_page_template('page-interactive-cheat-sheet.php')) {
        wp_enqueue_style(
            'interactive-cheat-sheet-style',
            get_stylesheet_directory_uri() . '/src/InteractiveCheatSheet/styles/interactive-cheat-sheet.css',
            ['bootstrap-css'], // Зависимость от Bootstrap
            time() // For production use wp_get_theme()->get('Version')
        );
        
        wp_enqueue_script(
            'interactive-cheat-sheet-script',
            get_stylesheet_directory_uri() . '/src/InteractiveCheatSheet/interactive-cheat-sheet.js',
            [], // Зависимости
            time(), // For production use wp_get_theme()->get('Version')
            true // В footer
        );
    }

    // Подключение стилей для галереи грамматических таблиц только на нужной странице
    if (is_page_template('page-grammar-tables.php')) {
        wp_enqueue_style(
            'grammar-tables-gallery-style',
            get_stylesheet_directory_uri() . '/src/GrammarTablesGallery/styles/grammar-tables-gallery.css',
            ['bootstrap-css'], // Зависимость от Bootstrap
            time() // For production use wp_get_theme()->get('Version')
        );
    }

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

    /**
     * AJAX-метод для получения данных пользователя из таблицы user_dict_words
     */
    public static function handle_get_user_dict_words() {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $dictionary_id = intval($_POST['dictionary_id'] ?? 0);
        
        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Не передан ID словаря']);
            wp_die();
        }

        // Используем функцию из модели MWords
        $user_words_data = get_user_dict_words_data($user_id, $dictionary_id);

        wp_send_json_success($user_words_data);
        wp_die();
    }

    public static function handle_reset_category_progress() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        if (!$category_id) {
            wp_send_json_error(['message' => 'Не передан ID категории']);
            wp_die();
        }

        $result = reset_category_progress($user_id, $category_id);
        if ($result) {
            wp_send_json_success(['message' => 'Прогресс категории сброшен']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при сбросе прогресса']);
        }
        wp_die();
    }

    public static function handle_update_word_progress() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $word_id = intval($_POST['word_id'] ?? 0);
        $is_revert = intval($_POST['is_revert'] ?? 0); // 0 = прямой перевод, 1 = обратный

        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }

        $result = update_word_progress($user_id, $word_id, $is_revert);
        if ($result) {
            wp_send_json_success(['message' => 'Прогресс обновлен']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при обновлении прогресса']);
        }
        wp_die();
    }

    public static function handle_reset_category_from_training() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        if (!$category_id) {
            wp_send_json_error(['message' => 'Не передан ID категории']);
            wp_die();
        }

        $result = reset_category_from_training($user_id, $category_id);
        if ($result) {
            wp_send_json_success(['message' => 'Слова категории сброшены из режима обучения']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при сбросе категории']);
        }
        wp_die();
    }

    public static function handle_update_word_attempts() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $word_id = intval($_POST['word_id'] ?? 0);
        $is_revert = intval($_POST['is_revert'] ?? 0); // 0 = прямой перевод, 1 = обратный
        $is_correct = intval($_POST['is_correct'] ?? 0); // 0 = неправильно, 1 = правильно
        $is_first_attempt = intval($_POST['is_first_attempt'] ?? 0); // 0 = не первая попытка, 1 = первая попытка

        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }

        $result = update_word_attempts($user_id, $word_id, $is_revert, $is_correct, $is_first_attempt);
        if ($result) {
            wp_send_json_success(['message' => 'Попытка записана']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при записи попытки']);
        }
        wp_die();
    }

    public static function handle_reset_training_word() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $word_id = intval($_POST['word_id'] ?? 0);
        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }

        $result = reset_training_word_data($user_id, $word_id);
        if ($result) {
            wp_send_json_success(['message' => 'Данные слова сброшены']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при сбросе данных слова']);
        }
        wp_die();
    }

    public static function handle_reset_training_category() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        if (!$category_id) {
            wp_send_json_error(['message' => 'Не передан ID категории']);
            wp_die();
        }

        $result = reset_training_category_data($user_id, $category_id);
        if ($result) {
            wp_send_json_success(['message' => 'Данные категории сброшены']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при сбросе данных категории']);
        }
        wp_die();
    }

    /**
     * Сбросить прогресс экзамена для всех слов категории
     * Вызывается при входе в режим легкого изучения (Education)
     */
    public static function handle_reset_exam_progress_for_category() {
        global $wpdb;
        
        error_log('🔄 handle_reset_exam_progress_for_category вызван');
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            error_log('❌ Пользователь не авторизован');
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        if (!$category_id) {
            error_log('❌ Не передан ID категории');
            wp_send_json_error(['message' => 'Не передан ID категории']);
            wp_die();
        }

        error_log("🔄 Сброс прогресса экзамена: user_id=$user_id, category_id=$category_id");
        
        try {
            $result = reset_exam_progress_for_category($user_id, $category_id);
            
            if ($result) {
                error_log('✅ Прогресс экзамена успешно сброшен');
                
                // Получаем обновлённые данные пользователя для проверки
                $user_dict_words_table = $wpdb->prefix . 'user_dict_words';
                $words_table = $wpdb->prefix . 'd_words';
                $word_category_table = $wpdb->prefix . 'd_word_category';
                
                $updated_data = $wpdb->get_results($wpdb->prepare("
                    SELECT udw.dict_word_id, udw.mode_education, udw.mode_education_revert, 
                           udw.last_shown, udw.last_shown_revert, udw.correct_attempts, udw.correct_attempts_revert
                    FROM $user_dict_words_table AS udw
                    INNER JOIN $word_category_table AS wc ON udw.dict_word_id = wc.word_id
                    WHERE udw.user_id = %d AND wc.category_id = %d
                    LIMIT 5
                ", $user_id, $category_id), ARRAY_A);
                
                error_log('📊 Обновлённые данные (первые 5 слов): ' . print_r($updated_data, true));
                
                wp_send_json_success([
                    'message' => 'Прогресс экзамена сброшен для категории',
                    'debug_data' => $updated_data
                ]);
            } else {
                error_log('❌ Ошибка при сбросе прогресса экзамена');
                wp_send_json_error(['message' => 'Ошибка при сбросе прогресса экзамена']);
            }
        } catch (Exception $e) {
            error_log('❌ Exception при сбросе прогресса: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            wp_send_json_error(['message' => 'Ошибка сервера: ' . $e->getMessage()]);
        }
        
        wp_die();
    }

    /**
     * AJAX-метод для создания категории
     */
    public static function handle_create_category() {
        // Проверяем права доступа
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }
        
        // Проверяем nonce для безопасности
        if (!wp_verify_nonce($_POST['nonce'], 'category_management_nonce')) {
            wp_send_json_error(['message' => 'Ошибка безопасности']);
            wp_die();
        }
        
        $dictionary_id = intval($_POST['dictionary_id']);
        $name = sanitize_text_field($_POST['name']);
        $parent_id = !empty($_POST['parent_id']) ? intval($_POST['parent_id']) : null;
        $order = intval($_POST['order']);
        
        // Валидация через сервис
        $errors = CategoriesService::validate_category_data([
            'name' => $name,
            'parent_id' => $parent_id,
            'order' => $order
        ]);
        
        if (!empty($errors)) {
            wp_send_json_error(['message' => implode(', ', $errors)]);
            wp_die();
        }
        
        // Создаем категорию
        $category_id = CategoriesService::create_category($dictionary_id, $name, $parent_id, $order);
        
        if ($category_id) {
            wp_send_json_success([
                'id' => $category_id,
                'message' => 'Категория создана успешно'
            ]);
        } else {
            wp_send_json_error(['message' => 'Ошибка при создании категории']);
        }
        wp_die();
    }

    /**
     * AJAX-метод для получения категорий
     */
    public static function handle_get_categories() {
        $dictionary_id = intval($_POST['dictionary_id']);
        
        $tree = CategoriesService::get_category_tree($dictionary_id);
        
        wp_send_json_success($tree);
        wp_die();
    }

    /**
     * AJAX-метод для обновления категории
     */
    public static function handle_update_category() {
        // Проверяем права доступа
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }
        
        // Проверяем nonce для безопасности
        if (!wp_verify_nonce($_POST['nonce'], 'category_management_nonce')) {
            wp_send_json_error(['message' => 'Ошибка безопасности']);
            wp_die();
        }
        
        $category_id = intval($_POST['category_id']);
        $name = sanitize_text_field($_POST['name']);
        $parent_id = !empty($_POST['parent_id']) ? intval($_POST['parent_id']) : null;
        $order = intval($_POST['order']);
        
        // Валидация через сервис
        $errors = CategoriesService::validate_category_data([
            'name' => $name,
            'parent_id' => $parent_id,
            'order' => $order
        ]);
        
        if (!empty($errors)) {
            wp_send_json_error(['message' => implode(', ', $errors)]);
            wp_die();
        }
        
        // Проверяем, что категория существует
        $category = CategoriesService::get_category_by_id($category_id);
        if (!$category) {
            wp_send_json_error(['message' => 'Категория не найдена']);
            wp_die();
        }
        
        // Обновляем категорию
        $result = CategoriesService::update_category($category_id, [
            'name' => $name,
            'parent_id' => $parent_id,
            'order' => $order
        ]);
        
        if ($result) {
            wp_send_json_success(['message' => 'Категория обновлена успешно']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при обновлении категории']);
        }
        wp_die();
    }

    /**
     * AJAX-метод для удаления категории
     */
    public static function handle_delete_category() {
        // Проверяем права доступа
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }
        
        // Проверяем nonce для безопасности
        if (!wp_verify_nonce($_POST['nonce'], 'category_management_nonce')) {
            wp_send_json_error(['message' => 'Ошибка безопасности']);
            wp_die();
        }
        
        $category_id = intval($_POST['category_id']);
        
        // Удаляем категорию
        $result = CategoriesService::delete_category($category_id);
        
        if ($result) {
            wp_send_json_success(['message' => 'Категория удалена успешно']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при удалении категории']);
        }
        wp_die();
    }

    /**
     * AJAX-метод для создания слова
     */
    public static function handle_create_word() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        $dictionary_id = intval($_POST['dictionary_id']);
        $word_data_raw = $_POST['word_data'] ?? '';
        $word_data = json_decode(stripslashes($word_data_raw), true);
        $category_ids_raw = $_POST['category_ids'] ?? '';
        $category_ids = $category_ids_raw ? json_decode(stripslashes($category_ids_raw), true) : [];

        if (!$dictionary_id || empty($word_data) || !is_array($word_data)) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $word_id = WordsService::create_word_in_dictionary($dictionary_id, $word_data, $category_ids);

        if ($word_id) {
            wp_send_json_success(['word_id' => $word_id, 'message' => 'Слово создано успешно']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при создании слова']);
        }
        wp_die();
    }

    /**
     * AJAX-метод для удаления слова
     */
    public static function handle_delete_word() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        $word_id = intval($_POST['word_id']);

        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }

        $result = WordsService::delete_word_from_dictionary($word_id);

        if ($result) {
            wp_send_json_success(['message' => 'Слово удалено успешно']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при удалении слова']);
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

add_action('wp_ajax_get_user_dict_words', ['WordsAjaxHandler', 'handle_get_user_dict_words']);
add_action('wp_ajax_reset_category_progress', ['WordsAjaxHandler', 'handle_reset_category_progress']);
add_action('wp_ajax_update_word_progress', ['WordsAjaxHandler', 'handle_update_word_progress']);
add_action('wp_ajax_reset_category_from_training', ['WordsAjaxHandler', 'handle_reset_category_from_training']);
add_action('wp_ajax_update_word_attempts', ['WordsAjaxHandler', 'handle_update_word_attempts']);
add_action('wp_ajax_reset_training_word', ['WordsAjaxHandler', 'handle_reset_training_word']);
add_action('wp_ajax_reset_training_category', ['WordsAjaxHandler', 'handle_reset_training_category']);
add_action('wp_ajax_reset_exam_progress_for_category', ['WordsAjaxHandler', 'handle_reset_exam_progress_for_category']);
add_action('wp_ajax_nopriv_reset_exam_progress_for_category', ['WordsAjaxHandler', 'handle_reset_exam_progress_for_category']);

// AJAX обработчики для управления категориями
add_action('wp_ajax_create_category', ['WordsAjaxHandler', 'handle_create_category']);
add_action('wp_ajax_get_categories', ['WordsAjaxHandler', 'handle_get_categories']);
add_action('wp_ajax_update_category', ['WordsAjaxHandler', 'handle_update_category']);
add_action('wp_ajax_delete_category', ['WordsAjaxHandler', 'handle_delete_category']);

// AJAX обработчики для управления словами
add_action('wp_ajax_create_word', ['WordsAjaxHandler', 'handle_create_word']);
add_action('wp_ajax_delete_word', ['WordsAjaxHandler', 'handle_delete_word']);







// NOTE: 8 - before `wp_print_head_scripts`
add_action( 'wp_head', 'myajax_data', 8 );
function myajax_data(){
    $data = [
        'url' => admin_url( 'admin-ajax.php' ),
        'is_admin' => current_user_can('manage_options'),
        'user_id' => get_current_user_id(),
        'is_logged_in' => is_user_logged_in(),
        'nonce' => wp_create_nonce('category_management_nonce')
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