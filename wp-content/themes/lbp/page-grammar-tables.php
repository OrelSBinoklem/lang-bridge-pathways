<?php
/**
 * Template Name: Grammar Tables Gallery
 * Description: Галерея грамматических таблиц для изучения латышского языка
 */

get_header();
?>

<main id="main" class="site-main" role="main">
    <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
        <div id="grammar-tables-gallery-root"></div>
    </article>
</main>

<?php
get_footer();

