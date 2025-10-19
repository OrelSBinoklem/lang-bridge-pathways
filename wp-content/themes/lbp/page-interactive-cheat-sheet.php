<?php
/**
 * Template Name: Interactive Cheat Sheet
 * Description: Интерактивная шпаргалка для изучения латышского языка
 */

get_header();
?>

<main id="main" class="site-main" role="main">
    <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
        <div id="interactive-cheat-sheet-root"></div>
    </article>
</main>

<?php
get_footer();

