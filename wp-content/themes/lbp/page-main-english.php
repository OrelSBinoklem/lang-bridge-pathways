<?php
/*
Template Name: Main English Page
*/
?>

<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php wp_title(); ?></title>
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="wrap">
    <?php get_header(); ?>

    <div class="site-content">

        <div id="react-app"></div><!-- #react-app -->

        <?php
        if (have_posts()) :
            while (have_posts()) : the_post();
                the_title('<h1>', '</h1>');
                the_content();
            endwhile;
        else :
            echo '<p>No posts found.</p>';
        endif;
        ?>
    </div>

    <?php get_footer(); ?>
</div>

</body>
</html>