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

<?php
    $skyColor = $_COOKIE['skyColor']??'51,51,51';
    $isBright = ($_COOKIE['isBright']??'true') == 'true';
?>
<header class="site-header" style="background: rgb(<?=$skyColor?>);">

    <div class="site-header-content">

        <div class="super-logo">
            <div id="super-logo-bg">
                <div class="gradient top"></div>
                <div class="gradient bottom"></div>
                <div class="gradient left" style="background: linear-gradient(to left, rgba(<?=$skyColor?>, 0), rgba(<?=$skyColor?>, 1));"></div>
                <div class="gradient right" style="background: linear-gradient(to right, rgba(<?=$skyColor?>, 0), rgba(<?=$skyColor?>, 1));"></div>
            </div>
            <?php
            if (function_exists('the_custom_logo')) {
                the_custom_logo();
            }
            ?>
        </div>

        <nav class="site-navigation <?=$isBright ? '__dark' : ''?>">
            <button id="menu-toggle" class="menu-toggle" aria-controls="primary-menu" aria-expanded="false"><?php esc_html_e('Menu', 'mytheme'); ?></button>
            <?php
            wp_nav_menu(array(
                'theme_location' => 'menu-1',
                'menu_id'        => 'primary-menu',
            ));
            ?>
        </nav>

    </div>


</header>
</body>
</html>