<?php

function register_custom_admin_menu() {
    add_menu_page(
        'Управление словарями',
        'Словари',
        'manage_options',
        'lbp-dictionaries',
        'lbp_dictionaries_admin_page',
        'dashicons-book-alt',
        20
    );
}

add_action('admin_menu', 'register_custom_admin_menu');

function lbp_dictionaries_admin_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Недостаточно прав');
    }

    lbp_dictionaries_handle_post_actions();

    $dictionaries = DictionaryAdminService::get_all_dictionaries();
    $import_nonce = wp_create_nonce('lbp_dictionary_import');
    $delete_nonce = wp_create_nonce('lbp_dictionary_delete');
    ?>
    <div class="wrap">
        <h1>Управление словарями</h1>

        <?php lbp_dictionaries_render_notices(); ?>

        <div class="card" style="max-width:960px;padding:16px 20px;margin-top:16px;">
            <h2 style="margin-top:0;">Импорт из JSON</h2>
            <p>Загрузите файл в формате тематического словаря (<code>category</code> → <code>sub_catgories</code> → <code>words</code>).</p>
            <form method="post" enctype="multipart/form-data">
                <?php wp_nonce_field('lbp_dictionary_import', 'lbp_dictionary_import_nonce'); ?>
                <input type="hidden" name="lbp_dictionary_action" value="import">

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="json_file">JSON-файл</label></th>
                        <td><input type="file" name="json_file" id="json_file" accept=".json,application/json" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dict_name">Название</label></th>
                        <td><input type="text" name="dict_name" id="dict_name" class="regular-text" required placeholder="Русско-Английский (Американский) Тематический"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dict_lang">lang</label></th>
                        <td><input type="text" name="dict_lang" id="dict_lang" value="RU" maxlength="10" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dict_learn_lang">learn_lang</label></th>
                        <td><input type="text" name="dict_learn_lang" id="dict_learn_lang" value="EN" maxlength="10" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dict_level">level</label></th>
                        <td><input type="number" name="dict_level" id="dict_level" value="1" min="1" max="6" style="width:80px;"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dict_max_level">maxLevel</label></th>
                        <td><input type="number" name="dict_max_level" id="dict_max_level" value="6" min="1" max="6" style="width:80px;"></td>
                    </tr>
                    <tr>
                        <th scope="row">Опции</th>
                        <td>
                            <label><input type="checkbox" name="dict_auto_levels" value="1" checked> Авто level/maxLevel из JSON</label><br>
                            <label><input type="checkbox" name="dict_sound" value="1" checked> sound (аудио)</label>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Импортировать в БД', 'primary', 'submit', false); ?>
            </form>
        </div>

        <h2 style="margin-top:32px;">Словари в базе</h2>
        <?php if (!$dictionaries) : ?>
            <p>Словарей пока нет.</p>
        <?php else : ?>
            <table class="widefat striped" style="max-width:1100px;">
                <thead>
                    <tr>
                        <th style="width:50px;">ID</th>
                        <th>Название</th>
                        <th>Языки</th>
                        <th>Уровни</th>
                        <th>Слов (meta)</th>
                        <th>Слов (БД)</th>
                        <th>Категорий</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($dictionaries as $dict) :
                    $id = (int) $dict['id'];
                    $db_words = DictionaryAdminService::count_words_in_db($id);
                    $db_cats = DictionaryAdminService::count_categories_in_db($id);
                    $export_url = wp_nonce_url(
                        admin_url('admin-post.php?action=lbp_export_dictionary&dictionary_id=' . $id),
                        'lbp_export_dictionary_' . $id
                    );
                    ?>
                    <tr>
                        <td><?php echo esc_html((string) $id); ?></td>
                        <td><strong><?php echo esc_html($dict['name']); ?></strong></td>
                        <td><?php echo esc_html($dict['lang'] . ' → ' . $dict['learn_lang']); ?></td>
                        <td><?php echo esc_html($dict['level'] . '–' . $dict['maxLevel']); ?></td>
                        <td><?php echo esc_html((string) $dict['words']); ?></td>
                        <td><?php echo esc_html((string) $db_words); ?></td>
                        <td><?php echo esc_html((string) $db_cats); ?></td>
                        <td>
                            <a class="button button-secondary" href="<?php echo esc_url($export_url); ?>">Экспорт JSON</a>
                            <form method="post" style="display:inline;margin-left:4px;" onsubmit="return confirm('Удалить словарь «<?php echo esc_js($dict['name']); ?>» (ID <?php echo $id; ?>) со всеми категориями, словами и прогрессом пользователей?');">
                                <?php wp_nonce_field('lbp_dictionary_delete', 'lbp_dictionary_delete_nonce'); ?>
                                <input type="hidden" name="lbp_dictionary_action" value="delete">
                                <input type="hidden" name="dictionary_id" value="<?php echo esc_attr((string) $id); ?>">
                                <button type="submit" class="button button-link-delete">Удалить</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>
    <?php
}

function lbp_dictionaries_handle_post_actions() {
    if (!isset($_POST['lbp_dictionary_action'])) {
        return;
    }

    $action = sanitize_text_field(wp_unslash($_POST['lbp_dictionary_action']));

    if ($action === 'import') {
        if (!isset($_POST['lbp_dictionary_import_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['lbp_dictionary_import_nonce'])), 'lbp_dictionary_import')) {
            lbp_dictionaries_set_notice('error', 'Ошибка безопасности (nonce).');
            return;
        }

        if (empty($_FILES['json_file']['tmp_name'])) {
            lbp_dictionaries_set_notice('error', 'Выберите JSON-файл.');
            return;
        }

        $file = $_FILES['json_file'];
        if (!empty($file['error'])) {
            lbp_dictionaries_set_notice('error', 'Ошибка загрузки файла: ' . (int) $file['error']);
            return;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'json') {
            lbp_dictionaries_set_notice('error', 'Допустим только файл .json');
            return;
        }

        $json = file_get_contents($file['tmp_name']);
        if ($json === false) {
            lbp_dictionaries_set_notice('error', 'Не удалось прочитать загруженный файл.');
            return;
        }

        $meta = [
            'name' => sanitize_text_field(wp_unslash($_POST['dict_name'] ?? '')),
            'lang' => sanitize_text_field(wp_unslash($_POST['dict_lang'] ?? '')),
            'learn_lang' => sanitize_text_field(wp_unslash($_POST['dict_learn_lang'] ?? '')),
            'level' => (int) ($_POST['dict_level'] ?? 1),
            'maxLevel' => (int) ($_POST['dict_max_level'] ?? 6),
            'sound' => !empty($_POST['dict_sound']),
            'auto_levels' => !empty($_POST['dict_auto_levels']),
            'use_json_word_count' => true,
        ];

        $result = DictionaryAdminService::import_from_json($json, $meta);
        if (is_wp_error($result)) {
            lbp_dictionaries_set_notice('error', $result->get_error_message());
            return;
        }

        lbp_dictionaries_set_notice(
            'success',
            sprintf('Словарь импортирован. ID: %d', (int) $result)
        );
        return;
    }

    if ($action === 'delete') {
        if (!isset($_POST['lbp_dictionary_delete_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['lbp_dictionary_delete_nonce'])), 'lbp_dictionary_delete')) {
            lbp_dictionaries_set_notice('error', 'Ошибка безопасности (nonce).');
            return;
        }

        $dictionary_id = (int) ($_POST['dictionary_id'] ?? 0);
        $result = DictionaryAdminService::delete_dictionary($dictionary_id);
        if (is_wp_error($result)) {
            lbp_dictionaries_set_notice('error', $result->get_error_message());
            return;
        }

        lbp_dictionaries_set_notice('success', sprintf('Словарь ID %d удалён.', $dictionary_id));
    }
}

function lbp_dictionaries_set_notice($type, $message) {
    set_transient('lbp_dictionary_admin_notice', ['type' => $type, 'message' => $message], 30);
}

function lbp_dictionaries_render_notices() {
    $notice = get_transient('lbp_dictionary_admin_notice');
    if (!$notice) {
        return;
    }
    delete_transient('lbp_dictionary_admin_notice');
    $class = $notice['type'] === 'success' ? 'notice-success' : 'notice-error';
    echo '<div class="notice ' . esc_attr($class) . ' is-dismissible"><p>' . esc_html($notice['message']) . '</p></div>';
}

function lbp_handle_export_dictionary_download() {
    if (!current_user_can('manage_options')) {
        wp_die('Недостаточно прав');
    }

    $dictionary_id = (int) ($_GET['dictionary_id'] ?? 0);
    if (!$dictionary_id || !isset($_GET['_wpnonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'lbp_export_dictionary_' . $dictionary_id)) {
        wp_die('Ошибка безопасности');
    }

    $dict = DictionaryAdminService::get_dictionary($dictionary_id);
    if (!$dict) {
        wp_die('Словарь не найден');
    }

    $tree = DictionaryAdminService::export_to_json_tree($dictionary_id);
    if (is_wp_error($tree)) {
        wp_die(esc_html($tree->get_error_message()));
    }

    $slug = sanitize_file_name($dict['name']);
    if ($slug === '') {
        $slug = 'dictionary';
    }
    $filename = $slug . '-' . $dictionary_id . '.json';
    $json = wp_json_encode($tree, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    nocache_headers();
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($json));
    echo $json;
    exit;
}

add_action('admin_post_lbp_export_dictionary', 'lbp_handle_export_dictionary_download');

function resolve_dictionary_json_path($src) {
    $theme_path = get_template_directory() . $src;
    if (is_readable($theme_path)) {
        return $theme_path;
    }
    $public_path = ABSPATH . 'dictionaries/' . basename($src);
    if (is_readable($public_path)) {
        return $public_path;
    }
    return $theme_path;
}

function add_words_from_json($json_file, $lang, $learn_lang, $name, $words, $level, $maxLevel, $sound) {
    $json_data = file_get_contents($json_file);
    if ($json_data === false) {
        throw new RuntimeException('Cannot read JSON file: ' . $json_file);
    }
    $data = json_decode($json_data, true);
    if (!is_array($data)) {
        throw new RuntimeException('Invalid JSON in file: ' . $json_file);
    }

    DictionaryAdminService::import_from_json($data, [
        'name' => $name,
        'lang' => $lang,
        'learn_lang' => $learn_lang,
        'words' => $words,
        'level' => $level,
        'maxLevel' => $maxLevel,
        'sound' => $sound,
        'use_json_word_count' => false,
    ]);
}

function add_words_recursion($data, $id_dictionary, $parent_category_id = null, $learn_lang) {
    global $wpdb;
    $indexWord = 0;

    if (!is_array($data)) {
        return;
    }

    foreach ($data as $item) {
        if (!is_array($item)) {
            continue;
        }
        $isCategory1 = isset($item['category']) || isset($item['sub_category']);

        if ($isCategory1) {
            $table_name = $wpdb->prefix . 'd_categories';
            $wpdb->insert(
                $table_name,
                [
                    'dictionary_id' => $id_dictionary,
                    'name' => $item['category'] ?? $item['sub_category'],
                    'parent_id' => $parent_category_id,
                ],
                ['%d', '%s', '%d']
            );

            $current_category_id = $wpdb->insert_id;

            add_words_recursion($item['sub_catgories'] ?? $item['catgories'] ?? $item['words'], $id_dictionary, $current_category_id, $learn_lang);
        } else {
            $table_name = $wpdb->prefix . 'd_words';
            $wpdb->insert(
                $table_name,
                [
                    'dictionary_id' => $id_dictionary,
                    'word' => $item['word'],
                    'learn_lang' => $learn_lang,
                    'is_phrase' => count(preg_split("/[\s,]+/", $item['word'])) > 1 ? 1 : 0,
                    'translation_1' => is_array($item['translated']) ? $item['translated'][0] : $item['translated'],
                    'translation_2' => is_array($item['translated']) && isset($item['translated'][1]) ? $item['translated'][1] : null,
                    'translation_3' => is_array($item['translated']) && isset($item['translated'][2]) ? $item['translated'][2] : null,
                    'difficult_translation' => $item['difficult_translation'] ?? null,
                    'sound_url' => $item['sound'] ?? null,
                    'level' => $item['level'],
                    'maxLevel' => $item['maxLevel'],
                    'type' => $item['type'] ?? null,
                    'gender' => $item['gender'] ?? null,
                    'order' => ++$indexWord,
                ],
                ['%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%d']
            );

            $id_word = $wpdb->insert_id;

            if ($parent_category_id !== null) {
                $table_name = $wpdb->prefix . 'd_word_category';

                $result = $wpdb->insert(
                    $table_name,
                    ['word_id' => $id_word, 'category_id' => $parent_category_id],
                    ['%d', '%d']
                );

                if ($result === false) {
                    error_log('Insert into word_category failed: ' . $wpdb->last_error);
                    return false;
                }
            }

            $table_name = $wpdb->prefix . 'unique_words';
            $sql = $wpdb->prepare("SELECT COUNT(*) FROM $table_name WHERE word = %s AND lang = %s", $item['word'], $learn_lang);
            if ($wpdb->get_var($sql) == 0) {
                $wpdb->insert(
                    $table_name,
                    ['word' => $item['word'], 'lang' => $learn_lang],
                    ['%s', '%s']
                );
            }
        }
    }
}
