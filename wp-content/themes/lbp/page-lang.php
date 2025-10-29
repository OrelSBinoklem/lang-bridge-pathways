<?php
/*
Template Name: Lang
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
        <?php get_template_part('template-parts/lang-content'); ?>
    </div>

    <?php get_footer(); ?>
</div>

</body>
</html>
