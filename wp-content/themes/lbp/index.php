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
        class Custom_Nav_Walker extends Walker_Nav_Menu {
            // Start Element Output
            function start_el(&$output, $item, $depth = 0, $args = array(), $id = 0) {
                $classes = empty($item->classes) ? array() : (array) $item->classes;
                $class_names = join(' ', apply_filters('nav_menu_css_class', array_filter($classes), $item));

                $class_names = ' class="' . esc_attr($class_names) . '"';
                $output .= '<li id="menu-item-'. $item->ID . '"' . $class_names .'>';

                $attributes  = ! empty( $item->attr_title ) ? ' title="'  . esc_attr( $item->attr_title ) .'"' : '';
                $attributes .= ! empty( $item->target )     ? ' target="' . esc_attr( $item->target     ) .'"' : '';
                $attributes .= ! empty( $item->xfn )        ? ' rel="'    . esc_attr( $item->xfn        ) .'"' : '';
                $attributes .= ! empty( $item->url )        ? ' href="'   . esc_attr( $item->url        ) .'"' : '';

                $item_output = $args->before;
                $item_output .= '<a'. $attributes .'>';
                $item_output .= '<h2><span class="wrap-h2">';
                $item_output .= $args->link_before . apply_filters('the_title', $item->title, $item->ID) . $args->link_after;
                $item_output .= '<span class="small">(B2)</span></span></h2>';

                  $item_output .= '<div class="image-container cursor-effect-mask-container">';

                    // Custom Field Output
                    $custom_field = get_field('logo', $item);
                    if ($custom_field) {
                        $item_output .= '<img src="' . esc_url($custom_field['url']) . '" alt="' . esc_attr($custom_field['alt']) . '" class="menu-langs-img">';
                    }

                    $item_output .= '<svg class="line-animation" viewBox="0 0 100 100">
                        <rect x="2" y="2" width="96" height="96" rx="5" ry="5" class="line"></rect>
                    </svg>';

                  $item_output .= '<div class="cursor-effect-mask">';
                  $custom_field = get_field('logo_effect', $item);
                  if ($custom_field) {
                      $item_output .= '<img src="' . esc_url($custom_field['url']) . '" alt="' . esc_attr($custom_field['alt']) . '">';
                  }
                  $item_output .= '</div>';

                  $item_output .= '</div>';
                $item_output .= '</a>';

                $item_output .= $args->after;

                $output .= apply_filters('walker_nav_menu_start_el', $item_output, $item, $depth, $args);
            }
        }

        // Use the custom walker in your wp_nav_menu
        wp_nav_menu(array(
            'theme_location' => 'menu-langs', // Используйте слаг меню
            'menu_id'        => 'menu-langs', // Произвольный ID для HTML
            'menu_class'     => 'menu-langs', // Произвольный класс для HTML
            'walker'         => new Custom_Nav_Walker()
        ));
        ?>

    </div>

    <?php get_footer(); ?>
</div>

</body>
</html>