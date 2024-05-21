<?php
/**
 * Twenty Twenty-Four functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package Twenty Twenty-Four
 * @since Twenty Twenty-Four 1.0
 */

/**
 * Register block styles.
 */

if ( ! function_exists( 'twentytwentyfour_block_styles' ) ) :
	/**
	 * Register custom block styles
	 *
	 * @since Twenty Twenty-Four 1.0
	 * @return void
	 */
	function twentytwentyfour_block_styles() {

		register_block_style(
			'core/details',
			array(
				'name'         => 'arrow-icon-details',
				'label'        => __( 'Arrow icon', 'twentytwentyfour' ),
				/*
				 * Styles for the custom Arrow icon style of the Details block
				 */
				'inline_style' => '
				.is-style-arrow-icon-details {
					padding-top: var(--wp--preset--spacing--10);
					padding-bottom: var(--wp--preset--spacing--10);
				}

				.is-style-arrow-icon-details summary {
					list-style-type: "\2193\00a0\00a0\00a0";
				}

				.is-style-arrow-icon-details[open]>summary {
					list-style-type: "\2192\00a0\00a0\00a0";
				}',
			)
		);
		register_block_style(
			'core/post-terms',
			array(
				'name'         => 'pill',
				'label'        => __( 'Pill', 'twentytwentyfour' ),
				/*
				 * Styles variation for post terms
				 * https://github.com/WordPress/gutenberg/issues/24956
				 */
				'inline_style' => '
				.is-style-pill a,
				.is-style-pill span:not([class], [data-rich-text-placeholder]) {
					display: inline-block;
					background-color: var(--wp--preset--color--base-2);
					padding: 0.375rem 0.875rem;
					border-radius: var(--wp--preset--spacing--20);
				}

				.is-style-pill a:hover {
					background-color: var(--wp--preset--color--contrast-3);
				}',
			)
		);
		register_block_style(
			'core/list',
			array(
				'name'         => 'checkmark-list',
				'label'        => __( 'Checkmark', 'twentytwentyfour' ),
				/*
				 * Styles for the custom checkmark list block style
				 * https://github.com/WordPress/gutenberg/issues/51480
				 */
				'inline_style' => '
				ul.is-style-checkmark-list {
					list-style-type: "\2713";
				}

				ul.is-style-checkmark-list li {
					padding-inline-start: 1ch;
				}',
			)
		);
		register_block_style(
			'core/navigation-link',
			array(
				'name'         => 'arrow-link',
				'label'        => __( 'With arrow', 'twentytwentyfour' ),
				/*
				 * Styles for the custom arrow nav link block style
				 */
				'inline_style' => '
				.is-style-arrow-link .wp-block-navigation-item__label:after {
					content: "\2197";
					padding-inline-start: 0.25rem;
					vertical-align: middle;
					text-decoration: none;
					display: inline-block;
				}',
			)
		);
		register_block_style(
			'core/heading',
			array(
				'name'         => 'asterisk',
				'label'        => __( 'With asterisk', 'twentytwentyfour' ),
				'inline_style' => "
				.is-style-asterisk:before {
					content: '';
					width: 1.5rem;
					height: 3rem;
					background: var(--wp--preset--color--contrast-2, currentColor);
					clip-path: path('M11.93.684v8.039l5.633-5.633 1.216 1.23-5.66 5.66h8.04v1.737H13.2l5.701 5.701-1.23 1.23-5.742-5.742V21h-1.737v-8.094l-5.77 5.77-1.23-1.217 5.743-5.742H.842V9.98h8.162l-5.701-5.7 1.23-1.231 5.66 5.66V.684h1.737Z');
					display: block;
				}

				/* Hide the asterisk if the heading has no content, to avoid using empty headings to display the asterisk only, which is an A11Y issue */
				.is-style-asterisk:empty:before {
					content: none;
				}

				.is-style-asterisk:-moz-only-whitespace:before {
					content: none;
				}

				.is-style-asterisk.has-text-align-center:before {
					margin: 0 auto;
				}

				.is-style-asterisk.has-text-align-right:before {
					margin-left: auto;
				}

				.rtl .is-style-asterisk.has-text-align-left:before {
					margin-right: auto;
				}",
			)
		);
	}
endif;

add_action( 'init', 'twentytwentyfour_block_styles' );

/**
 * Enqueue block stylesheets.
 */

if ( ! function_exists( 'twentytwentyfour_block_stylesheets' ) ) :
	/**
	 * Enqueue custom block stylesheets
	 *
	 * @since Twenty Twenty-Four 1.0
	 * @return void
	 */
	function twentytwentyfour_block_stylesheets() {
		/**
		 * The wp_enqueue_block_style() function allows us to enqueue a stylesheet
		 * for a specific block. These will only get loaded when the block is rendered
		 * (both in the editor and on the front end), improving performance
		 * and reducing the amount of data requested by visitors.
		 *
		 * See https://make.wordpress.org/core/2021/12/15/using-multiple-stylesheets-per-block/ for more info.
		 */
		wp_enqueue_block_style(
			'core/button',
			array(
				'handle' => 'twentytwentyfour-button-style-outline',
				'src'    => get_parent_theme_file_uri( 'assets/css/button-outline.css' ),
				'ver'    => wp_get_theme( get_template() )->get( 'Version' ),
				'path'   => get_parent_theme_file_path( 'assets/css/button-outline.css' ),
			)
		);
	}
endif;

add_action( 'init', 'twentytwentyfour_block_stylesheets' );

/**
 * Register pattern categories.
 */

if ( ! function_exists( 'twentytwentyfour_pattern_categories' ) ) :
	/**
	 * Register pattern categories
	 *
	 * @since Twenty Twenty-Four 1.0
	 * @return void
	 */
	function twentytwentyfour_pattern_categories() {

		register_block_pattern_category(
			'twentytwentyfour_page',
			array(
				'label'       => _x( 'Pages', 'Block pattern category', 'twentytwentyfour' ),
				'description' => __( 'A collection of full page layouts.', 'twentytwentyfour' ),
			)
		);
	}
endif;

add_action( 'init', 'twentytwentyfour_pattern_categories' );

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