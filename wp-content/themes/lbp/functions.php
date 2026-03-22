<?php
require "system/migrations.php";
require "system/dictionaries_to_db.php";
require "system/models/MWords.php";
require "system/models/MCategories.php";
require "system/services/SWords.php";
require "system/services/SCategories.php";
require "template-helpers.php";

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

    wp_enqueue_style(
        'quill-snow',
        'https://cdn.quilljs.com/1.3.7/quill.snow.css',
        [],
        '1.3.7'
    );

    wp_enqueue_script(
        'my-theme-frontend',
        get_stylesheet_directory_uri() . '/build/index.js',
        ['wp-element'],
        time() //For production use wp_get_theme()->get('Version')
    );

    wp_enqueue_style('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css', [], '5.3.3');
    wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js', [], '5.3.3', true);
    wp_enqueue_style('verb-search', get_stylesheet_directory_uri() . '/src/shared/styles/verb-search.css', ['bootstrap-css'], time());
    wp_enqueue_style('verb-modal', get_stylesheet_directory_uri() . '/src/shared/styles/verb-modal.css', ['verb-search'], time());
    // Подключение стилей для интерактивной шпаргалки только на нужной странице
    if (is_page_template('page-interactive-cheat-sheet.php')) {
        wp_enqueue_style(
            'interactive-cheat-sheet-style',
            get_stylesheet_directory_uri() . '/src/InteractiveCheatSheet/styles/interactive-cheat-sheet.css',
            ['bootstrap-css'], // Зависимость от Bootstrap
            time() // For production use wp_get_theme()->get('Version')
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

    /**
     * Получить прогресс обучения по слову для текущего админа (для редактирования в модалке).
     */
    public static function handle_get_word_progress_admin() {
        $user_id = get_current_user_id();
        if (!$user_id || !current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Доступ только для администратора']);
            wp_die();
        }
        $word_id = intval($_POST['word_id'] ?? 0);
        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }
        $progress = get_single_word_progress($user_id, $word_id);
        $user = get_userdata($user_id);
        wp_send_json_success([
            'progress' => $progress,
            'user_id' => $user_id,
            'user_display' => $user ? $user->display_name : (string) $user_id,
        ]);
        wp_die();
    }

    /**
     * Обновить прогресс обучения по слову для текущего админа.
     */
    public static function handle_update_word_progress_admin() {
        $user_id = get_current_user_id();
        if (!$user_id || !current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Доступ только для администратора']);
            wp_die();
        }
        $word_id = intval($_POST['word_id'] ?? 0);
        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }
        $data = [
            'attempts' => isset($_POST['attempts']) ? (int) $_POST['attempts'] : null,
            'correct_attempts' => isset($_POST['correct_attempts']) ? (int) $_POST['correct_attempts'] : null,
            'attempts_revert' => isset($_POST['attempts_revert']) ? (int) $_POST['attempts_revert'] : null,
            'correct_attempts_revert' => isset($_POST['correct_attempts_revert']) ? (int) $_POST['correct_attempts_revert'] : null,
            'statistic_attempts' => isset($_POST['statistic_attempts']) ? (int) $_POST['statistic_attempts'] : null,
            'statistic_attempts_revert' => isset($_POST['statistic_attempts_revert']) ? (int) $_POST['statistic_attempts_revert'] : null,
            'statistic_correct_attempts' => isset($_POST['statistic_correct_attempts']) ? (int) $_POST['statistic_correct_attempts'] : null,
            'statistic_correct_attempts_revert' => isset($_POST['statistic_correct_attempts_revert']) ? (int) $_POST['statistic_correct_attempts_revert'] : null,
            'mode_education' => isset($_POST['mode_education']) ? (int) $_POST['mode_education'] : null,
            'mode_education_revert' => isset($_POST['mode_education_revert']) ? (int) $_POST['mode_education_revert'] : null,
            'last_shown' => isset($_POST['last_shown']) ? sanitize_text_field($_POST['last_shown']) : null,
            'last_shown_revert' => isset($_POST['last_shown_revert']) ? sanitize_text_field($_POST['last_shown_revert']) : null,
        ];
        $data = array_filter($data, static function ($v) { return $v !== null; });
        $result = update_single_word_progress_admin($user_id, $word_id, $data);
        if ($result) {
            wp_send_json_success(['message' => 'Прогресс сохранён']);
        } else {
            wp_send_json_error(['message' => 'Ошибка сохранения']);
        }
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

        // Проверяем что передано: category_id или word_ids
        $category_id = intval($_POST['category_id'] ?? 0);
        $word_ids_json = $_POST['word_ids'] ?? null;
        
        $word_ids = null;
        if ($word_ids_json) {
            // Если переданы word_ids (для фейковых категорий)
            $word_ids = json_decode(stripslashes($word_ids_json), true);
            if (!is_array($word_ids) || empty($word_ids)) {
                wp_send_json_error(['message' => 'Некорректный список ID слов']);
                wp_die();
            }
            $word_ids = array_map('intval', $word_ids);
        } else if (!$category_id) {
            // Если ничего не передано
            wp_send_json_error(['message' => 'Не переданы ни ID категории, ни список слов']);
            wp_die();
        }

        $result = reset_training_category_data($user_id, $category_id, $word_ids);
        if ($result) {
            wp_send_json_success(['message' => 'Данные категории сброшены']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при сбросе данных категории']);
        }
        wp_die();
    }

    /**
     * Создать записи с mode_education = 1 только для новых слов (без БД записей)
     */
    public static function handle_create_easy_mode_for_new_words() {
        error_log('🔵 handle_create_easy_mode_for_new_words вызван');
        
        $user_id = get_current_user_id();
        if (!$user_id) {
            error_log('❌ Пользователь не авторизован');
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }
        
        error_log('👤 user_id: ' . $user_id);
        error_log('📦 $_POST: ' . print_r($_POST, true));

        $word_ids = isset($_POST['word_ids']) ? json_decode(stripslashes($_POST['word_ids']), true) : [];
        error_log('📋 Декодированные word_ids: ' . print_r($word_ids, true));
        
        if (empty($word_ids)) {
            error_log('❌ word_ids пустой');
            wp_send_json_error(['message' => 'Не переданы ID слов']);
            wp_die();
        }

        error_log('✅ Вызываем create_easy_mode_for_new_words с ' . count($word_ids) . ' словами');
        $result = create_easy_mode_for_new_words($user_id, $word_ids);
        
        if ($result) {
            error_log('✅ Функция вернула true, отправляем success');
            wp_send_json_success(['message' => 'Записи созданы для новых слов', 'count' => count($word_ids)]);
        } else {
            error_log('❌ Функция вернула false');
            wp_send_json_error(['message' => 'Ошибка при создании записей']);
        }
        wp_die();
    }

    /**
     * Установить для всех слов категории режим лёгкого обучения
     */
    public static function handle_set_category_to_easy_mode() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_ids = [];
        if (!empty($_POST['category_ids'])) {
            $decoded = json_decode(stripslashes($_POST['category_ids']), true);
            if (is_array($decoded)) {
                $category_ids = array_map('intval', $decoded);
            }
        }
        if (empty($category_ids) && isset($_POST['category_id'])) {
            $category_ids = [intval($_POST['category_id'])];
        }
        $category_ids = array_filter($category_ids);
        if (empty($category_ids)) {
            wp_send_json_error(['message' => 'Не передан ID категории']);
            wp_die();
        }

        $result = set_category_to_easy_mode($user_id, $category_ids);
        if ($result) {
            wp_send_json_success(['message' => 'Категория переведена в режим лёгкого обучения']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при переводе категории в режим обучения']);
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
     * AJAX-метод для переноса категории (с поддеревом и словами) в другой словарь
     */
    public static function handle_move_category_to_dictionary() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        // Проверяем nonce для безопасности
        if (!wp_verify_nonce($_POST['nonce'], 'category_management_nonce')) {
            wp_send_json_error(['message' => 'Ошибка безопасности']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        $target_dictionary_id = intval($_POST['target_dictionary_id'] ?? 0);
        $target_parent_id = isset($_POST['target_parent_id']) && $_POST['target_parent_id'] !== ''
            ? intval($_POST['target_parent_id'])
            : null;

        if (!$category_id || !$target_dictionary_id) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $result = CategoriesService::move_category_to_dictionary($category_id, $target_dictionary_id, $target_parent_id);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success($result);
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
     * AJAX-метод для удаления слова. Если передан category_id — удалить только из этой категории.
     * Если слово не останется ни в одной категории — удалить полностью.
     */
    public static function handle_delete_word() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        $word_id = intval($_POST['word_id']);
        $category_id = !empty($_POST['category_id']) ? intval($_POST['category_id']) : 0;

        if (!$word_id) {
            wp_send_json_error(['message' => 'Не передан ID слова']);
            wp_die();
        }

        if ($category_id) {
            $result = WordsService::remove_word_from_category($word_id, $category_id);
        } else {
            $result = WordsService::delete_word_from_dictionary($word_id);
        }

        if ($result) {
            wp_send_json_success(['message' => $category_id ? 'Слово удалено из категории' : 'Слово удалено успешно']);
        } else {
            wp_send_json_error(['message' => 'Ошибка при удалении слова']);
        }
        wp_die();
    }

    /**
     * AJAX-метод для получения списка всех словарей
     */
    public static function handle_get_all_dictionaries() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        $dictionaries = WordsService::get_all_dictionaries();
        wp_send_json_success($dictionaries);
        wp_die();
    }

    /**
     * AJAX-метод для перемещения слов между категориями
     */
    public static function handle_move_words_to_category() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        $word_ids_raw = $_POST['word_ids'] ?? '';
        $word_ids = $word_ids_raw ? json_decode(stripslashes($word_ids_raw), true) : [];
        $source_category_id = intval($_POST['source_category_id'] ?? 0);
        $source_category_ids_raw = $_POST['source_category_ids'] ?? '';
        $source_category_ids = $source_category_ids_raw ? json_decode(stripslashes($source_category_ids_raw), true) : [];
        $source_category_ids = is_array($source_category_ids) ? array_values(array_filter(array_map('intval', $source_category_ids))) : [];
        $target_category_id = intval($_POST['target_category_id'] ?? 0);
        $target_dictionary_id = !empty($_POST['target_dictionary_id']) ? intval($_POST['target_dictionary_id']) : null;

        if (empty($word_ids) || !is_array($word_ids) || !$target_category_id) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $result = WordsService::move_words_to_category($word_ids, $source_category_id, $target_category_id, $target_dictionary_id, $source_category_ids);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success($result);
        }
        wp_die();
    }

    /**
     * AJAX-метод для копирования слов в категорию
     */
    public static function handle_copy_words_to_category() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Недостаточно прав доступа']);
            wp_die();
        }

        $word_ids_raw = $_POST['word_ids'] ?? '';
        $word_ids = $word_ids_raw ? json_decode(stripslashes($word_ids_raw), true) : [];
        $target_category_id = intval($_POST['target_category_id'] ?? 0);
        $target_dictionary_id = !empty($_POST['target_dictionary_id']) ? intval($_POST['target_dictionary_id']) : null;

        if (empty($word_ids) || !is_array($word_ids) || !$target_category_id) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $result = WordsService::copy_words_to_category($word_ids, $target_category_id, $target_dictionary_id);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success($result);
        }
        wp_die();
    }

    /**
     * AJAX-метод для изменения порядка слов в категории
     */
    public static function handle_reorder_category_words() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'У вас нет прав для изменения порядка слов.']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        $word_orders_raw = $_POST['word_orders'] ?? '';
        
        // word_orders - это JSON массив объектов [{word_id: 123, order: 1}, ...]
        $word_orders = json_decode(stripslashes($word_orders_raw), true);

        if (!$category_id || empty($word_orders) || !is_array($word_orders)) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $result = WordsService::reorder_category_words($category_id, $word_orders);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success(['reordered' => true, 'updated_count' => $result]);
        }

        wp_die();
    }

    /**
     * AJAX-метод для изменения порядка категорий одного уровня
     */
    public static function handle_reorder_categories() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'У вас нет прав для изменения порядка категорий.']);
            wp_die();
        }

        $dictionary_id = intval($_POST['dictionary_id'] ?? 0);
        $parent_id = $_POST['parent_id'] ?? '';
        $category_orders_raw = $_POST['category_orders'] ?? '';
        
        // category_orders - это JSON массив объектов [{category_id: 123, order: 1}, ...]
        $category_orders = json_decode(stripslashes($category_orders_raw), true);

        if (!$dictionary_id || empty($category_orders) || !is_array($category_orders)) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        // Преобразуем parent_id: пустая строка -> null
        $parent_id = $parent_id === '' ? null : intval($parent_id);

        $result = CategoriesService::reorder_categories($dictionary_id, $parent_id, $category_orders);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success(['reordered' => true, 'updated_count' => $result]);
        }

        wp_die();
    }

    /**
     * AJAX-метод для установки order и перемешивания слов словаря
     * ВАЖНО: Необратимая операция!
     */
    public static function handle_shuffle_dictionary_words() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'У вас нет прав для этой операции.']);
            wp_die();
        }

        $dictionary_id = intval($_POST['dictionary_id'] ?? 0);
        $confirm = $_POST['confirm'] ?? '';

        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Не передан ID словаря']);
            wp_die();
        }

        if ($confirm !== 'YES_SHUFFLE_PERMANENTLY') {
            wp_send_json_error(['message' => 'Подтверждение не получено. Операция отменена.']);
            wp_die();
        }

        $result = WordsService::initialize_and_shuffle_dictionary_words($dictionary_id);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success($result);
        }

        wp_die();
    }

    /**
     * AJAX-метод для инициализации order и перемешивания слов словаря
     * ВАЖНО: Операция необратима!
     */
    public static function handle_initialize_and_shuffle_dictionary() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'У вас нет прав для этой операции.']);
            wp_die();
        }

        $dictionary_id = intval($_POST['dictionary_id'] ?? 0);
        $confirm = $_POST['confirm'] ?? '';

        if (!$dictionary_id) {
            wp_send_json_error(['message' => 'Не передан ID словаря']);
            wp_die();
        }

        if ($confirm !== 'YES_SHUFFLE_PERMANENTLY') {
            wp_send_json_error(['message' => 'Подтверждение не получено']);
            wp_die();
        }

        $result = WordsService::initialize_and_shuffle_dictionary_words($dictionary_id);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success($result);
        }

        wp_die();
    }

    public static function handle_get_dense_training_state() {
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

        $no_rotate = !empty($_POST['no_rotate']);
        $state = lbp_dense_get_state($user_id, $category_id, !$no_rotate);
        wp_send_json_success($state);
        wp_die();
    }

    public static function handle_add_dense_training_words() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        $dictionary_id = intval($_POST['dictionary_id'] ?? 0);
        $use_random = intval($_POST['use_random'] ?? 1) ? 1 : 0;
        $word_ids_raw = $_POST['word_ids'] ?? '';
        $word_ids = json_decode(stripslashes($word_ids_raw), true);

        if (!$category_id || !is_array($word_ids) || empty($word_ids)) {
            wp_send_json_error(['message' => 'Некорректные данные: category_id/word_ids']);
            wp_die();
        }

        $state = lbp_dense_add_words($user_id, $dictionary_id, $category_id, $word_ids, $use_random);

        // Перевести слова в режим дообучения (mode_education = 1, mode_education_revert = 1) — вызываем здесь, чтобы запись в user_dict_words гарантированно выполнялась
        lbp_dense_set_words_retraining_mode($user_id, $word_ids);

        wp_send_json_success($state);
        wp_die();
    }

    public static function handle_remove_dense_training_word() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }
        $category_id = intval($_POST['category_id'] ?? 0);
        $word_id = intval($_POST['word_id'] ?? 0);
        if (!$category_id || !$word_id) {
            wp_send_json_error(['message' => 'Не переданы category_id/word_id']);
            wp_die();
        }
        $state = lbp_dense_remove_word($user_id, $category_id, $word_id);
        wp_send_json_success($state);
        wp_die();
    }

    public static function handle_dense_training_submit_answer() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            wp_send_json_error(['message' => 'Пользователь не авторизован']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        $word_id = intval($_POST['word_id'] ?? 0);
        $is_revert = (intval($_POST['is_revert'] ?? 0) !== 0) ? 1 : 0; // Строго 0 = прямой, 1 = обратный
        $is_correct = intval($_POST['is_correct'] ?? 0);

        if (!$category_id || !$word_id) {
            wp_send_json_error(['message' => 'Не переданы category_id/word_id']);
            wp_die();
        }

        // В режиме плотного дообучения не обновляем обычную статистику. Обновляем только dense-стеки (одно направление за запрос).
        $state = lbp_dense_submit_answer($user_id, $category_id, $word_id, $is_revert, $is_correct);
        wp_send_json_success($state);
        wp_die();
    }

    public static function handle_dense_training_tick() {
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

        $state = lbp_dense_get_state($user_id, $category_id);
        wp_send_json_success($state);
        wp_die();
    }

    /**
     * Засчитать полностью правильный ответ в мини-игре: счётчик плотного дообучения уменьшается на 1.
     */
    public static function handle_dense_match_game_success() {
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
        $state = lbp_dense_count_match_game_success($user_id, $category_id);
        wp_send_json_success($state);
        wp_die();
    }

    public static function handle_clear_dense_training() {
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
        $state = lbp_dense_clear_session($user_id, $category_id);
        wp_send_json_success($state);
        wp_die();
    }

    /**
     * AJAX-метод для автоматической сортировки слов через OpenAI GPT
     */
    public static function handle_sort_words_with_ai() {
        // Только для админов
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'У вас нет прав для этой операции.']);
            wp_die();
        }

        $category_id = intval($_POST['category_id'] ?? 0);
        $words_raw = $_POST['words'] ?? '';
        
        // words - это JSON массив объектов [{id, word, translation}, ...]
        $words = json_decode(stripslashes($words_raw), true);

        if (!$category_id || empty($words) || !is_array($words)) {
            wp_send_json_error(['message' => 'Некорректные входные данные']);
            wp_die();
        }

        $result = WordsService::sort_words_with_ai($category_id, $words);

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        } else {
            wp_send_json_success($result);
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
add_action('wp_ajax_get_word_progress_admin', ['WordsAjaxHandler', 'handle_get_word_progress_admin']);
add_action('wp_ajax_update_word_progress_admin', ['WordsAjaxHandler', 'handle_update_word_progress_admin']);
add_action('wp_ajax_reset_category_progress', ['WordsAjaxHandler', 'handle_reset_category_progress']);
add_action('wp_ajax_update_word_progress', ['WordsAjaxHandler', 'handle_update_word_progress']);
add_action('wp_ajax_reset_category_from_training', ['WordsAjaxHandler', 'handle_reset_category_from_training']);
add_action('wp_ajax_update_word_attempts', ['WordsAjaxHandler', 'handle_update_word_attempts']);
add_action('wp_ajax_reset_training_word', ['WordsAjaxHandler', 'handle_reset_training_word']);
add_action('wp_ajax_reset_training_category', ['WordsAjaxHandler', 'handle_reset_training_category']);
add_action('wp_ajax_reset_exam_progress_for_category', ['WordsAjaxHandler', 'handle_reset_exam_progress_for_category']);
add_action('wp_ajax_nopriv_reset_exam_progress_for_category', ['WordsAjaxHandler', 'handle_reset_exam_progress_for_category']);
add_action('wp_ajax_create_easy_mode_for_new_words', ['WordsAjaxHandler', 'handle_create_easy_mode_for_new_words']);
add_action('wp_ajax_nopriv_create_easy_mode_for_new_words', ['WordsAjaxHandler', 'handle_create_easy_mode_for_new_words']);
add_action('wp_ajax_set_category_to_easy_mode', ['WordsAjaxHandler', 'handle_set_category_to_easy_mode']);
add_action('wp_ajax_nopriv_set_category_to_easy_mode', ['WordsAjaxHandler', 'handle_set_category_to_easy_mode']);
add_action('wp_ajax_get_dense_training_state', ['WordsAjaxHandler', 'handle_get_dense_training_state']);
add_action('wp_ajax_add_dense_training_words', ['WordsAjaxHandler', 'handle_add_dense_training_words']);
add_action('wp_ajax_remove_dense_training_word', ['WordsAjaxHandler', 'handle_remove_dense_training_word']);
add_action('wp_ajax_dense_training_submit_answer', ['WordsAjaxHandler', 'handle_dense_training_submit_answer']);
add_action('wp_ajax_dense_training_tick', ['WordsAjaxHandler', 'handle_dense_training_tick']);
add_action('wp_ajax_dense_match_game_success', ['WordsAjaxHandler', 'handle_dense_match_game_success']);
add_action('wp_ajax_clear_dense_training', ['WordsAjaxHandler', 'handle_clear_dense_training']);

// AJAX обработчики для управления категориями
add_action('wp_ajax_create_category', ['WordsAjaxHandler', 'handle_create_category']);
add_action('wp_ajax_get_categories', ['WordsAjaxHandler', 'handle_get_categories']);
add_action('wp_ajax_update_category', ['WordsAjaxHandler', 'handle_update_category']);
add_action('wp_ajax_delete_category', ['WordsAjaxHandler', 'handle_delete_category']);
add_action('wp_ajax_move_category_to_dictionary', ['WordsAjaxHandler', 'handle_move_category_to_dictionary']);

// AJAX обработчики для управления словами
add_action('wp_ajax_create_word', ['WordsAjaxHandler', 'handle_create_word']);
add_action('wp_ajax_delete_word', ['WordsAjaxHandler', 'handle_delete_word']);
add_action('wp_ajax_reorder_category_words', ['WordsAjaxHandler', 'handle_reorder_category_words']);
add_action('wp_ajax_reorder_categories', ['WordsAjaxHandler', 'handle_reorder_categories']);
add_action('wp_ajax_initialize_and_shuffle_dictionary', ['WordsAjaxHandler', 'handle_initialize_and_shuffle_dictionary']);
add_action('wp_ajax_sort_words_with_ai', ['WordsAjaxHandler', 'handle_sort_words_with_ai']);
add_action('wp_ajax_get_all_dictionaries', ['WordsAjaxHandler', 'handle_get_all_dictionaries']);
add_action('wp_ajax_move_words_to_category', ['WordsAjaxHandler', 'handle_move_words_to_category']);
add_action('wp_ajax_copy_words_to_category', ['WordsAjaxHandler', 'handle_copy_words_to_category']);







/**
 * Проверка наличия точного перевода в Glosbe (латышский–русский).
 * Если на странице есть фраза "нет переводов" — в словаре только автоперевод.
 */
function lbp_check_glosbe_has_translation() {
    $word = isset($_POST['word']) ? trim((string) $_POST['word']) : '';
    if ($word === '') {
        wp_send_json_success(['hasExact' => null]);
        return;
    }
    $base = 'https://ru.glosbe.com/словарь-латышский-русский/';
    $url = $base . rawurlencode($word);
    $response = wp_remote_get($url, [
        'timeout' => 12,
        'redirection' => 2,
        'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]);
    if (is_wp_error($response)) {
        wp_send_json_success(['hasExact' => null]);
        return;
    }
    $body = wp_remote_retrieve_body($response);
    $no_translation = (stripos($body, 'нет переводов') !== false);
    wp_send_json_success(['hasExact' => !$no_translation]);
}
add_action('wp_ajax_check_glosbe_has_translation', 'lbp_check_glosbe_has_translation');
add_action('wp_ajax_nopriv_check_glosbe_has_translation', 'lbp_check_glosbe_has_translation');

// Проверка статуса авторизации для фронтенда (тренировка/кнопки)
function lbp_check_logged_in() {
    wp_send_json_success([
        'is_logged_in' => is_user_logged_in(),
        'user_id' => get_current_user_id(),
    ]);
}
add_action('wp_ajax_check_logged_in', 'lbp_check_logged_in');
add_action('wp_ajax_nopriv_check_logged_in', 'lbp_check_logged_in');

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