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

        /*$current_user_id = get_current_user_id();
        $dictionary_id = get_field('id'); // ID словаря

        $words_status_by_dict = get_user_word_status_by_dictionary($current_user_id, $dictionary_id);

        if (!empty($words_status_by_dict)) {
            foreach ($words_status_by_dict as $word_status) {
                echo 'Слово: ' . $word_status['word'] . ' — ';
                echo $word_status['is_learned'] ? 'Выучено' : 'Не выучено';
                echo '<br>';
            }
        } else {
            echo 'Нет слов для изучения в выбранном словаре.';
        }*/
        $dictionary_id = get_field('id');
        ?>

        <div id="react-app-dictionary" data-id="<?=$dictionary_id?>"></div><!-- #react-app-dictionary -->


    </div>

    <?php get_footer(); ?>
</div>

</body>
</html>