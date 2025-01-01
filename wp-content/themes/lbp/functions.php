<?php
require "system/migrations.php";
require "system/dictionaries_to_db.php";

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




?>
