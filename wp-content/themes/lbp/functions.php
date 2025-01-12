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

    public static function handle_get_words_by_category() {
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
    }
}

// Привязка метода AJAX-обработчика
add_action('wp_ajax_get_dictionary_words', ['WordsAjaxHandler', 'handle_get_user_words']);
add_action('wp_ajax_nopriv_get_dictionary_words', ['WordsAjaxHandler', 'handle_get_user_words']);


// Привязка метода AJAX-обработчика
add_action('wp_ajax_get_words_by_category', ['WordsAjaxHandler', 'handle_get_words_by_category']);
add_action('wp_ajax_nopriv_get_words_by_category', ['WordsAjaxHandler', 'handle_get_words_by_category']);





// functions.php или в отдельном плагине
add_action('rest_api_init', function () {
    register_rest_route('whisper/v1', '/upload', [
        'methods' => 'POST',
        'callback' => 'handle_whisper_upload',
    ]);
});

function handle_whisper_upload(\WP_REST_Request $request) {
    // Проверяем наличие файла
    if (empty($_FILES['audio'])) {
        return new WP_REST_Response(['error' => 'No audio file'], 400);
    }

    $file = $_FILES['audio'];
    $audioData = file_get_contents($file['tmp_name']);

    // Получаем язык и подсказку из запроса
    $language = $request->get_param('language') ?: null;
    $prompt = $request->get_param('prompt') ?: null;

    // Вызвать OpenAI Whisper API
    $text = whisper_api_call($audioData, $language, $prompt);

    return ['recognizedText' => $text];
}

function whisper_api_call($audioData, $language = null, $prompt = null) {
    $api_url = 'https://api.openai.com/v1/audio/transcriptions';
    $api_key = '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'; // Замените на ваш ключ API OpenAI

    // Уникальный boundary для multipart/form-data
    $boundary = wp_generate_password(24, false);
    $delimiter = '----WebKitFormBoundary' . $boundary;

    // Создаём тело запроса
    $body = '--' . $delimiter . "\r\n";
    $body .= 'Content-Disposition: form-data; name="file"; filename="audio.wav"' . "\r\n";
    $body .= "Content-Type: audio/wav\r\n\r\n";
    $body .= $audioData . "\r\n";
    $body .= '--' . $delimiter . "\r\n";
    $body .= 'Content-Disposition: form-data; name="model"' . "\r\n\r\n";
    $body .= 'whisper-1' . "\r\n";

    // Добавляем язык, если указан
    if ($language) {
        $body .= '--' . $delimiter . "\r\n";
        $body .= 'Content-Disposition: form-data; name="language"' . "\r\n\r\n";
        $body .= $language . "\r\n";
    }

    // Добавляем подсказку, если указана
    if ($prompt) {
        $body .= '--' . $delimiter . "\r\n";
        $body .= 'Content-Disposition: form-data; name="prompt"' . "\r\n\r\n";
        $body .= $prompt . "\r\n";
    }

    $body .= '--' . $delimiter . '--';

    // Указываем заголовки для запроса
    $headers = [
        'Authorization' => 'Bearer ' . $api_key,
        'Content-Type'  => 'multipart/form-data; boundary=' . $delimiter,
    ];

    // Отправляем запрос через wp_remote_post
    $response = wp_remote_post($api_url, [
        'method'    => 'POST',
        'headers'   => $headers,
        'body'      => $body,
        'timeout'   => 60, // Увеличиваем таймаут для больших аудио
    ]);

    // Обрабатываем ответ
    if (is_wp_error($response)) {
        error_log('Whisper API Error: ' . $response->get_error_message());
        return new WP_REST_Response(['error' => 'Whisper API request failed.'], 500);
    }

    $response_body = wp_remote_retrieve_body($response);
    $json = json_decode($response_body, true);

    if (isset($json['error'])) {
        error_log('Whisper API Error: ' . $json['error']['message']);
        return new WP_REST_Response(['error' => $json['error']['message']], 500);
    }

    // Возвращаем текст транскрипции
    return $json['text'] ?? 'No transcription found.';
}







// NOTE: 8 - before `wp_print_head_scripts`
add_action( 'wp_head', 'myajax_data', 8 );
function myajax_data(){
    $data = [
        'url' => admin_url( 'admin-ajax.php' ),
    ];
    ?>
    <script id="myajax_data">
      window.myajax = <?= wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ?>
    </script>
    <?php
}
?>
