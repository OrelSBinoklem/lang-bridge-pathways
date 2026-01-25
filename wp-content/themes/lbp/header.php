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
            <?php 
            // Проверяем разные способы определения страницы словаря
            $is_dictionary_page = false;
            
            // Способ 1: проверка шаблона
            if (is_page_template('page-dictionary.php')) {
                $is_dictionary_page = true;
            }
            
            // Способ 2: проверка по slug страницы
            if (is_page() && get_page_template_slug() === 'page-dictionary.php') {
                $is_dictionary_page = true;
            }
            
            // Способ 3: проверка по URL
            if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'dictionary') !== false) {
                $is_dictionary_page = true;
            }
            
            // Способ 4: проверка наличия элемента react-app-dictionary на странице
            if (isset($_POST) || isset($_GET)) {
                $is_dictionary_page = true; // Временно показываем всегда для тестирования
            }
            ?>
            
        </div>


        <!-- React Header Container -->
        <div id="react-header-root" class="react-header-container"></div>

        <nav class="site-navigation <?=$isBright ? '__dark' : ''?>">
            <button id="menu-toggle" class="menu-toggle" aria-controls="primary-menu" aria-expanded="false">
                <span class="menu-icon">☰</span><span class="menu-text"> Menu</span>
            </button>
            <?php
            wp_nav_menu(array(
                'theme_location' => 'menu-1',
                'menu_id'        => 'primary-menu',
            ));
            ?>
        </nav>

    </div>

<!-- Модальное окно выбора языка -->
<div id="language-modal" class="language-modal">
    <div class="language-modal-overlay"></div>
    <div class="language-modal-content">
        <button class="language-modal-close" aria-label="Закрыть">×</button>
        <h2>Выберите язык</h2>
        <div class="language-banners">
            <?php
            // Получаем элементы меню menu-langs
            $menu_items = wp_get_nav_menu_items(wp_get_nav_menu_object('menu-langs'));
            
            if (!$menu_items) {
                // Пробуем получить через theme_location
                $locations = get_nav_menu_locations();
                if (isset($locations['menu-langs'])) {
                    $menu_items = wp_get_nav_menu_items($locations['menu-langs']);
                }
            }
            
            if ($menu_items) {
                foreach ($menu_items as $item) {
                    $post_id = $item->object_id;
                    $logo = get_field('logo', $item); // Пробуем получить из элемента меню
                    if (!$logo) {
                        $logo = get_field('logo', $post_id); // Если нет, получаем из страницы
                    }
                    $logo_effect = get_field('logo_effect', $item);
                    if (!$logo_effect) {
                        $logo_effect = get_field('logo_effect', $post_id);
                    }
                    
                    // Получаем код языка - пробуем разные поля
                    $lang_code = get_field('learn_lang', $post_id);
                    if (!$lang_code) {
                        // Пробуем из URL или slug
                        $url = parse_url($item->url, PHP_URL_PATH);
                        if (strpos($url, 'latvieshu') !== false || strpos($url, 'latviesh') !== false) {
                            $lang_code = 'LV';
                        } elseif (strpos($url, 'english') !== false || strpos($url, 'angl') !== false) {
                            $lang_code = 'EN';
                        } else {
                            $lang_code = 'LV'; // По умолчанию
                        }
                    }
                    
                    // Получаем уровень - пробуем из элемента меню и из страницы
                    $level = get_field('level', $item) ?: get_field('level', $post_id);
                    $level_text = '';
                    if ($level) {
                        $levels = [1 => 'A1', 2 => 'A2', 3 => 'B1', 4 => 'B2', 5 => 'C1', 6 => 'C2'];
                        $level_text = $levels[$level] ?? '';
                    }
                    // Если уровня нет, пробуем получить из названия (например "B2" в скобках в title)
                    if (!$level_text && strpos($item->title, '(') !== false) {
                        if (preg_match('/\(([A-C][12])\)/', $item->title, $matches)) {
                            $level_text = $matches[1];
                        }
                    }
                    // Если всё равно нет, используем значение по умолчанию из оригинального кода - "B2"
                    if (!$level_text) {
                        $level_text = 'B2';
                    }
                    
                    if ($logo) {
                        ?>
                        <div class="language-banner menu-langs-banner" data-lang="<?php echo esc_attr($lang_code); ?>" data-url="<?php echo esc_url($item->url); ?>">
                            <div class="language-banner-inner">
                                <h2><span class="wrap-h2"><?php echo esc_html($item->title); ?><span class="small">(<?php echo esc_html($level_text); ?>)</span></span></h2>
                                <div class="image-container cursor-effect-mask-container">
                                    <img src="<?php echo esc_url($logo['url'] ?? $logo); ?>" 
                                         alt="<?php echo esc_attr($logo['alt'] ?? $item->title); ?>" 
                                         class="menu-langs-img">
                                    <svg class="line-animation" viewBox="0 0 100 100">
                                        <rect x="2" y="2" width="96" height="96" rx="5" ry="5" class="line"></rect>
                                    </svg>
                                    <?php if ($logo_effect): ?>
                                    <div class="cursor-effect-mask">
                                        <img src="<?php echo esc_url($logo_effect['url'] ?? $logo_effect); ?>" 
                                             alt="<?php echo esc_attr($logo_effect['alt'] ?? ''); ?>">
                                    </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                        <?php
                    }
                }
            }
            ?>
        </div>
    </div>
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
    
    // Модальное окно выбора языка
    const langModal = document.getElementById('language-modal');
    const langBtn = document.getElementById('language-selector-btn');
    const langClose = langModal?.querySelector('.language-modal-close');
    const langBanners = langModal?.querySelectorAll('.language-banner');
    const currentLangCode = document.querySelector('.current-lang-code');
    
    // Получаем выбранный язык из куки или LV по умолчанию
    function getSelectedLang() {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        return cookies['selected_lang'] || 'LV';
    }
    
    // Сохраняем язык в куки и переходим на страницу словаря
    function setLanguage(lang, url) {
        document.cookie = `selected_lang=${lang}; path=/; max-age=31536000`; // 1 год
        if (currentLangCode) {
            currentLangCode.textContent = lang;
        }
        // Закрываем модальное окно
        langModal?.classList.remove('active');
        // Переходим на страницу словаря если есть URL, иначе перезагружаем
        if (url) {
            window.location.href = url;
        } else {
            window.location.reload();
        }
    }
    
    // Открываем модальное окно
    if (langBtn) {
        langBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langModal?.classList.add('active');
        });
    }
    
    // Закрываем модальное окно
    if (langClose) {
        langClose.addEventListener('click', function() {
            langModal?.classList.remove('active');
        });
    }
    
    // Закрываем при клике на overlay
    if (langModal) {
        langModal.addEventListener('click', function(e) {
            if (e.target.classList.contains('language-modal-overlay')) {
                langModal.classList.remove('active');
            }
        });
    }
    
    // Обработка выбора языка
    if (langBanners) {
        langBanners.forEach(banner => {
            banner.addEventListener('click', function() {
                const lang = this.dataset.lang;
                const url = this.dataset.url;
                console.log('Language banner clicked:', lang, 'URL:', url);
                setLanguage(lang, url);
            });
        });
    }
    
    // Инициализируем текущий язык при загрузке
    const currentLang = getSelectedLang();
    if (currentLangCode) {
        currentLangCode.textContent = currentLang;
    }
    
    // Режим ответов в тренировке: type | select (куки lbp_training_answer_mode, 1 неделя)
    const TRAINING_MODE_KEY = 'lbp_training_answer_mode';
    const TRAINING_MODE_MAX_AGE = 7 * 24 * 60 * 60;
    function getTrainingModeCookie() {
        const m = document.cookie.match(new RegExp('(^|;)\\s*' + TRAINING_MODE_KEY + '=([^;]+)'));
        const v = m ? m[2].trim().toLowerCase() : null;
        return (v === 'select' || v === 'type') ? v : null;
    }
    function setTrainingModeCookie(mode) {
        document.cookie = TRAINING_MODE_KEY + '=' + mode + '; path=/; max-age=' + TRAINING_MODE_MAX_AGE + '; SameSite=Lax';
    }

    // Добавляем переключатель режима тренировки и мобильную кнопку языка в меню
    function addMobileLangButton() {
        const primaryMenu = document.getElementById('primary-menu');
        if (!primaryMenu) return;
        if (document.getElementById('default-mobile-lang-controls')) return;

        // Переключатель режима (до кнопки языка)
        const toggleItem = document.createElement('li');
        toggleItem.className = 'menu-item-mobile-controls';
        toggleItem.id = 'training-mode-toggle';
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'mobile-controls-wrapper training-mode-toggle-wrap';
        const current = getTrainingModeCookie();
        const isSelect = current === 'select' || (!current && window.innerWidth <= 768);
        if (!current) setTrainingModeCookie(isSelect ? 'select' : 'type');
        const btnType = document.createElement('button');
        btnType.type = 'button';
        btnType.className = 'training-mode-toggle-btn' + (isSelect ? '' : ' is-active');
        btnType.textContent = 'Ввод слов';
        btnType.title = 'Ввод вручную';
        const btnSelect = document.createElement('button');
        btnSelect.type = 'button';
        btnSelect.className = 'training-mode-toggle-btn' + (isSelect ? ' is-active' : '');
        btnSelect.textContent = 'Выбор слов';
        btnSelect.title = 'Выбор из предложенных';
        function setActive(select) {
            btnType.classList.toggle('is-active', !select);
            btnSelect.classList.toggle('is-active', select);
            setTrainingModeCookie(select ? 'select' : 'type');
            window.dispatchEvent(new CustomEvent('training-answer-mode-changed', { detail: { mode: select ? 'select' : 'type' } }));
        }
        btnType.addEventListener('click', function(e) { e.stopPropagation(); setActive(false); });
        btnSelect.addEventListener('click', function(e) { e.stopPropagation(); setActive(true); });
        toggleWrap.appendChild(btnType);
        toggleWrap.appendChild(btnSelect);
        toggleItem.appendChild(toggleWrap);

        // Кнопка языка
        const mobileLangItem = document.createElement('li');
        mobileLangItem.className = 'menu-item-mobile-controls';
        mobileLangItem.id = 'default-mobile-lang-controls';
        const wrapper = document.createElement('div');
        wrapper.className = 'mobile-controls-wrapper';
        const langButton = document.createElement('button');
        langButton.className = 'mobile-lang-btn';
        langButton.innerHTML = `🌐 <span class="current-lang-code-mobile">${currentLang}</span>`;
        langButton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (langModal) langModal.classList.add('active');
        });
        wrapper.appendChild(langButton);
        mobileLangItem.appendChild(wrapper);

        primaryMenu.appendChild(mobileLangItem);
        primaryMenu.insertBefore(toggleItem, mobileLangItem);
    }
    
    // Пробуем добавить несколько раз с разными задержками
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addMobileLangButton);
    } else {
        addMobileLangButton();
    }
    
    setTimeout(addMobileLangButton, 50);
    setTimeout(addMobileLangButton, 200);
    setTimeout(addMobileLangButton, 500);
    setTimeout(addMobileLangButton, 1000);
});
</script>

</header>
</body>
</html>