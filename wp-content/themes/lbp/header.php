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

    const COOLDOWN_TIER_COOKIE = 'lbp_cooldown_tier_pref';
    const COOLDOWN_TIER_MAX_AGE = 365 * 24 * 60 * 60;
    function getCooldownTierCookie() {
        const m = document.cookie.match(new RegExp('(^|;)\\s*' + COOLDOWN_TIER_COOKIE + '=([^;]+)'));
        if (!m) return 0;
        const v = parseInt(m[2].trim(), 10);
        return (v === 0 || v === 1 || v === 2) ? v : 0;
    }
    function setCooldownTierCookie(tier) {
        document.cookie = COOLDOWN_TIER_COOKIE + '=' + tier + '; path=/; max-age=' + COOLDOWN_TIER_MAX_AGE + '; SameSite=Lax';
    }

    // Увеличенный шрифт для таблиц (куки lbp_mobile_font_large, 1 неделя)
    const MOBILE_FONT_KEY = 'lbp_mobile_font_large';
    const MOBILE_FONT_MAX_AGE = 7 * 24 * 60 * 60;
    function getMobileFontCookie() {
        const m = document.cookie.match(new RegExp('(^|;)\\s*' + MOBILE_FONT_KEY + '=([^;]+)'));
        const v = m ? m[2].trim().toLowerCase() : null;
        return v === 'true';
    }
    function setMobileFontCookie(enabled) {
        document.cookie = MOBILE_FONT_KEY + '=' + (enabled ? 'true' : 'false') + '; path=/; max-age=' + MOBILE_FONT_MAX_AGE + '; SameSite=Lax';
    }

    // Переключатель откатов 3 ч | 20 ч в primary-menu (рядом с «Ввод слов / Выбор слов»). Виден только при открытой тренировке словаря.
    function ensureCooldownTierMenuToggle(primaryMenu) {
        if (!primaryMenu || document.getElementById('cooldown-tier-menu-toggle')) return;

        const cooldownLi = document.createElement('li');
        cooldownLi.className = 'menu-item-mobile-controls';
        cooldownLi.id = 'cooldown-tier-menu-toggle';
        const cooldownWrap = document.createElement('div');
        cooldownWrap.className = 'mobile-controls-wrapper training-mode-toggle-wrap';
        const btn3h = document.createElement('button');
        btn3h.type = 'button';
        btn3h.className = 'training-mode-toggle-btn';
        btn3h.setAttribute('data-cooldown-tier', '2');
        btn3h.textContent = '3 ч';
        btn3h.title = 'Упрощённая: 3 часа между первым и вторым баллом';
        const btn20 = document.createElement('button');
        btn20.type = 'button';
        btn20.className = 'training-mode-toggle-btn';
        btn20.setAttribute('data-cooldown-tier', '0');
        btn20.textContent = '20 ч';
        btn20.title = 'Стандарт: 20 часов между первым и вторым баллом';
            function syncCooldownToggleUi(detail) {
                const on = !!(detail && detail.categoryIds && detail.categoryIds.length);
                cooldownLi.classList.toggle('cooldown-tier-menu-visible', on);
            if (!on) {
                btn3h.classList.remove('is-active');
                btn20.classList.remove('is-active');
                return;
            }
            const tier = typeof detail.dominantCooldownTier === 'number' ? detail.dominantCooldownTier : getCooldownTierCookie();
            btn3h.classList.toggle('is-active', tier === 2);
            btn20.classList.toggle('is-active', tier === 0);
        }
        function postCooldownTier(tier) {
            const scope = window.lbpExamenTrainingMenuScope;
            const m = window.myajax;
            if (!m) {
                alert('Страница не готова.');
                return;
            }
            if (!m.is_logged_in) {
                alert('Войдите в аккаунт, чтобы менять режим откатов.');
                return;
            }
            if (!scope || !scope.categoryIds || !scope.categoryIds.length) {
                alert('Сначала откройте тренировку и выберите категорию.');
                return;
            }
            setCooldownTierCookie(tier);
            if (scope) scope.dominantCooldownTier = tier;
            syncCooldownToggleUi({ categoryIds: scope.categoryIds, dominantCooldownTier: tier });
            window.dispatchEvent(new CustomEvent('lbp-training-cooldown-tier-changed', { detail: { tier: tier } }));
            if (tier === 2) {
                alert('Упрощённый режим: между первым и вторым баллом откат 3 часа (сохранено в браузере). Режим «Учу» при этом не включается.');
            } else {
                alert('Стандартный режим: между первым и вторым баллом откат 20 часов (сохранено в браузере).');
            }
        }
        btn3h.addEventListener('click', function(e) { e.stopPropagation(); postCooldownTier(2); });
        btn20.addEventListener('click', function(e) { e.stopPropagation(); postCooldownTier(0); });
        cooldownWrap.appendChild(btn3h);
        cooldownWrap.appendChild(btn20);
        cooldownLi.appendChild(cooldownWrap);
        cooldownLi.__lbpSyncCooldownUi = syncCooldownToggleUi;

        if (!window.__lbpCooldownScopeListener) {
            window.__lbpCooldownScopeListener = true;
            window.addEventListener('lbp-examen-training-scope', function(ev) {
                window.lbpExamenTrainingMenuScope = ev.detail;
                window.lbpLastExamenTrainingScopeDetail = ev.detail;
                const li = document.getElementById('cooldown-tier-menu-toggle');
                if (!li || typeof li.__lbpSyncCooldownUi !== 'function') return;
                li.__lbpSyncCooldownUi(ev.detail);
            });
        }

        const fontItem = document.getElementById('mobile-font-toggle');
        const langItem = document.getElementById('default-mobile-lang-controls');
        if (fontItem && fontItem.parentNode === primaryMenu) {
            primaryMenu.insertBefore(cooldownLi, fontItem);
        } else if (langItem && langItem.parentNode === primaryMenu) {
            primaryMenu.insertBefore(cooldownLi, langItem);
        } else {
            primaryMenu.appendChild(cooldownLi);
        }

        if (typeof cooldownLi.__lbpSyncCooldownUi === 'function') {
            cooldownLi.__lbpSyncCooldownUi(window.lbpLastExamenTrainingScopeDetail || null);
        }
    }

    // Добавляем переключатель режима тренировки и мобильную кнопку языка в меню
    function addMobileLangButton() {
        const primaryMenu = document.getElementById('primary-menu');
        if (!primaryMenu) return;

        if (!document.getElementById('default-mobile-lang-controls')) {

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

        // Кнопка увеличенного шрифта
        const fontItem = document.createElement('li');
        fontItem.className = 'menu-item-mobile-controls';
        fontItem.id = 'mobile-font-toggle';
        const fontWrap = document.createElement('div');
        fontWrap.className = 'mobile-controls-wrapper';
        const fontButton = document.createElement('button');
        fontButton.type = 'button';
        fontButton.className = 'mobile-font-toggle-btn';
        const isMobileFontEnabled = getMobileFontCookie() || (!document.cookie.match(new RegExp('(^|;)\\s*' + MOBILE_FONT_KEY + '=')) && window.innerWidth <= 768);
        if (!document.cookie.match(new RegExp('(^|;)\\s*' + MOBILE_FONT_KEY + '='))) {
            setMobileFontCookie(isMobileFontEnabled);
        }
        fontButton.classList.toggle('is-active', isMobileFontEnabled);
        fontButton.innerHTML = '<span class="font-checkbox">' + (isMobileFontEnabled ? '✓' : '') + '</span> <span class="font-label">Увеличенный шрифт</span>';
        fontButton.title = 'Увеличенный шрифт';
        fontButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const newState = !fontButton.classList.contains('is-active');
            fontButton.classList.toggle('is-active', newState);
            fontButton.querySelector('.font-checkbox').textContent = newState ? '✓' : '';
            setMobileFontCookie(newState);
            window.dispatchEvent(new CustomEvent('mobile-font-changed', { detail: { enabled: newState } }));
        });
        fontWrap.appendChild(fontButton);
        fontItem.appendChild(fontWrap);

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
        primaryMenu.insertBefore(fontItem, mobileLangItem);
        }

        ensureCooldownTierMenuToggle(primaryMenu);
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