<?php
/*
Template Name: Dictionary
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

        <?php
        // Функция getLanguageLevel() уже объявлена в template-helpers.php
        $dictionary_id = get_field('id');
        ?>

        <div id="react-app-dictionary" data-id="<?=$dictionary_id?>"></div><!-- #react-app-dictionary -->


    </div>

    <?php get_footer(); ?>
</div>

</body>
</html>