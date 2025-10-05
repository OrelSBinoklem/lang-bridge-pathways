<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the website, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://wordpress.org/documentation/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'lbp' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', '' );

/** Database hostname */
define( 'DB_HOST', 'MariaDB-10.4' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '#@4an(5H!@=sI5jv8`Eh_W]M;|)%Bz&5~1Hlt(Tgh$+<jza+8LC>=o]X__+@g+$U' );
define( 'SECURE_AUTH_KEY',  'f:w;#p-DYOlo8WMO[)Wkpn,@We^fQY]667LK(hfB_EA/N(m//*ca39.R-8Cc2G:c' );
define( 'LOGGED_IN_KEY',    '<t+`l=opZTs|XzM|B7J+bj5tArpd_w.@By0f3r|?B9a~D}mx)0Z+cz]I0{8|FM~y' );
define( 'NONCE_KEY',        '!?]SMFBX`d1Y4_*(zNVn#8)~Gn!`]#0s<Jt8a|g~*U9TxM(2YWpE]M~aZwh-i@h!' );
define( 'AUTH_SALT',        '&WJ&jKt+^vQrOafn{CK`drTi!]ZcA/J|cIF(UxTg!b1TN/T6P(o:R%Lc/+?pSYF9' );
define( 'SECURE_AUTH_SALT', 'BqnwQYM/O$@[)O%EMVk`3D/GE`O=`P-5t?p!v2?UB19/R?ZsjV@ROs{X`>)>3lG6' );
define( 'LOGGED_IN_SALT',   ')^5z(.%-sG~]nDS.)>{Pj).z-Ci#J=q;DFnh||hLiJQe5FrhnJq$L96n s%x)|[H' );
define( 'NONCE_SALT',       '91{bS=)G&XLxg]qgy~D%EOPrO`Kh6f{b)J_:8Pk$F3]Lvx?3B[bn|e2#yM$By{D}' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/documentation/article/debugging-in-wordpress/
 */
define( 'WP_DEBUG', true );

/* Add any custom values between this line and the "stop editing" line. */



/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
