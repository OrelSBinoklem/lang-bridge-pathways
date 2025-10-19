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
<header class="site-header <?=$isBright ? '__bright' : '__dark'?>" style="background: rgb(<?=$skyColor?>);">

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
            <button id="menu-toggle" class="menu-toggle" aria-controls="primary-menu" aria-expanded="false">
                <span class="menu-icon">☰</span> Menu
            </button>
            <?php
            wp_nav_menu(array(
                'theme_location' => 'menu-1',
                'menu_id'        => 'primary-menu',
            ));
            ?>
        </nav>

        <!-- React Header Container -->
        <div id="react-header-root" class="react-header-container"></div>

    </div>

<script>
// Закрытие меню при клике вне его
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const primaryMenu = document.getElementById('primary-menu');
    
    if (menuToggle && primaryMenu) {
        // Обработчик клика вне меню
        document.addEventListener('click', function(event) {
            if (!menuToggle.contains(event.target) && !primaryMenu.contains(event.target)) {
                // Закрываем меню только если оно открыто
                const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
                if (isOpen) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                    primaryMenu.classList.remove('open');
                }
            }
        });
    }
});
</script>

</header>
</body>
</html>