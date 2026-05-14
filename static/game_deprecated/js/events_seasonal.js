/**
 * NxSiran Game - Seasonal & Weather Events System (v0.8)
 * Weather effects on gameplay, seasonal limited-time events
 */
(function () {
    'use strict';

    // ── Weather Effects on Gameplay ─────────────────────────────
    var WEATHER_EFFECTS = {
        'sunny':  { cropGrowthMultiplier: 1.0, desc: '晴朗的天气，作物正常生长' },
        'rainy':  { cropGrowthMultiplier: 1.5, desc: '下雨了！作物生长速度+50%' },
        'cloudy': { cropGrowthMultiplier: 0.9, desc: '阴天，作物生长稍慢' },
        'snowy':  { cropGrowthMultiplier: 0.5, desc: '下雪了！作物生长速度-50%' },
        'stormy': { cropGrowthMultiplier: 0.3, desc: '暴风雨！注意保护作物', sellPriceMultiplier: 0.8 }
    };

    // ── Seasonal Events ─────────────────────────────────────────
    var SEASONAL_EVENTS = {
        'spring': {
            name: '春日花见',
            desc: '樱花盛开的季节',
            icon: '\uD83C\uDF38',
            bonusCrop: 'strawberry',
            specialShopItem: { id: 'flower_bouquet', name: '樱花束', emoji: '\uD83D\uDC90', price: 300, affection: 6 },
            eventDialogue: '...（看着樱花）...奶奶也喜欢樱花。'
        },
        'summer': {
            name: '盛夏祭典',
            desc: '夏日庆典开始了！',
            icon: '\uD83C\uDF86',
            bonusCrop: 'watermelon',
            specialShopItem: { id: 'fan', name: '手绘团扇', emoji: '\uD83E\uDEAD', price: 200, affection: 4 },
            eventDialogue: '...祭典...（停顿）...不想去。'
        },
        'autumn': {
            name: '红叶物语',
            desc: '秋天的校园格外美丽',
            icon: '\uD83C\uDF42',
            bonusCrop: 'pumpkin',
            specialShopItem: { id: 'scarf', name: '围巾', emoji: '\uD83E\uDDE3', price: 350, affection: 7 },
            eventDialogue: '...（踩落叶）...秋天...适合跑步。'
        },
        'winter': {
            name: '初雪之约',
            desc: '今年的第一场雪',
            icon: '\u2744\uFE0F',
            bonusCrop: null,
            specialShopItem: { id: 'mitten', name: '暖手宝', emoji: '\uD83E\uDDE4', price: 250, affection: 5 },
            eventDialogue: '...（伸出手接雪花）...（小声）...冷。'
        }
    };

    // ── Internal State ──────────────────────────────────────────
    var _currentSeason = null;
    var _lastShownSeason = null;
    var _weatherDialogueCooldown = 0;
    var WEATHER_DIALOGUE_COOLDOWN_MS = 120000; // 2 minutes cooldown

    // Weather-triggered dialogue pool for 车如云
    var WEATHER_DIALOGUES = {
        'rainy': [
            '...下雨了。',
            '...（看着窗外）...训练取消。',
            '...雨天...适合睡觉。',
            '...（微微皱眉）...跑道会湿。'
        ],
        'snowy': [
            '...下雪了。',
            '...（盯着雪景）...很安静。',
            '...冬天...跑步很冷。',
            '...（缩了缩脖子）...风好大。'
        ],
        'stormy': [
            '...暴风雨...（沉默）。',
            '...（看着窗外闪电）...。',
            '...今天不出门了。',
            '...（皱眉）...训练场会被淹。'
        ],
        'cloudy': [
            '...阴天。',
            '...（抬头看天）...要下雨了吗。',
            '...没有太阳...有点闷。'
        ],
        'sunny': [
            '...天气不错。',
            '...（眯眼）...阳光太刺眼。',
            '...适合训练的天气。'
        ]
    };

    // ── Init ────────────────────────────────────────────────────
    function init() {
        var state = GameState.getState();
        _currentSeason = state.season || 'spring';
        _lastShownSeason = _currentSeason;

        // Apply weather effects on init
        applyWeatherEffects(state.weather);

        // Show seasonal banner if game just started
        showSeasonalBanner(_currentSeason);

        // Subscribe to weather changes
        GameState.subscribe(function (state, prev, action) {
            if (action.type === 'UPDATE_WEATHER') {
                applyWeatherEffects(action.weather);
                showWeatherNotice(action.weather);

                // v0.9: Play weather change SFX
                if (window.GameAudio) {
                    GameAudio.playWeatherChange(action.weather);
                }

                // v0.9: Switch BGM to rain track on rainy/stormy weather
                if (window.GameAudio && (action.weather === 'rainy' || action.weather === 'stormy')) {
                    GameAudio.playBGM('rain');
                } else if (window.GameAudio && (action.weather === 'sunny' || action.weather === 'cloudy')) {
                    GameAudio.playPreviousBGM();
                }
            }
            if (action.type === 'LOAD_STATE') {
                var newSeason = state.season || 'spring';
                if (newSeason !== _currentSeason) {
                    _currentSeason = newSeason;
                    showSeasonalBanner(newSeason);

                    // v0.9: Play season change SFX
                    if (window.GameAudio) {
                        GameAudio.playSeasonChange();
                    }
                }
            }
        });
    }

    // ── Weather Effects ─────────────────────────────────────────
    function getWeatherEffect(weather) {
        return WEATHER_EFFECTS[weather] || WEATHER_EFFECTS['sunny'];
    }

    function applyWeatherEffects(weather) {
        var effect = getWeatherEffect(weather);
        GameState.dispatch({
            type: 'LOAD_STATE',
            payload: { weatherEffects: effect }
        });
    }

    function showWeatherNotice(weather) {
        var effect = getWeatherEffect(weather);
        if (!effect || weather === 'sunny') return;

        if (window.GameHUD && typeof GameHUD.showToast === 'function') {
            GameHUD.showToast(effect.desc, 'info', 4000);
        }

        // Check for special weather dialogue
        checkSpecialWeatherDialogue(weather);
    }

    // ── Seasonal Events ─────────────────────────────────────────
    function getSeasonalEvent(season) {
        return SEASONAL_EVENTS[season] || null;
    }

    function showSeasonalBanner(season) {
        if (season === _lastShownSeason && _lastShownSeason !== null) return;
        _lastShownSeason = season;

        var event = getSeasonalEvent(season);
        if (!event) return;

        // Remove existing banner if any
        var existing = document.getElementById('seasonal-banner');
        if (existing) existing.remove();

        var banner = document.createElement('div');
        banner.id = 'seasonal-banner';
        banner.className = 'seasonal-banner';
        banner.innerHTML =
            '<div class="seasonal-banner-icon">' + event.icon + '</div>' +
            '<div class="seasonal-banner-content">' +
                '<div class="seasonal-banner-title">' + event.name + '</div>' +
                '<div class="seasonal-banner-desc">' + event.desc + '</div>' +
            '</div>' +
            '<button class="seasonal-banner-close" title="关闭">\u00D7</button>';

        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(function () {
            banner.classList.add('seasonal-banner-visible');
        });

        // Close button
        var closeBtn = banner.querySelector('.seasonal-banner-close');
        closeBtn.addEventListener('click', function () {
            dismissBanner(banner);
        });

        // Auto dismiss after 6 seconds
        setTimeout(function () {
            dismissBanner(banner);
        }, 6000);
    }

    function dismissBanner(banner) {
        if (!banner || !banner.parentNode) return;
        banner.classList.remove('seasonal-banner-visible');
        banner.classList.add('seasonal-banner-exit');
        setTimeout(function () {
            if (banner.parentNode) banner.remove();
        }, 500);
    }

    // ── Weather Dialogue ────────────────────────────────────────
    function checkSpecialWeatherDialogue(weather) {
        var now = Date.now();
        if (now - _weatherDialogueCooldown < WEATHER_DIALOGUE_COOLDOWN_MS) return;

        // 30% chance to trigger weather dialogue
        if (Math.random() > 0.3) return;

        _weatherDialogueCooldown = now;

        var dialogues = WEATHER_DIALOGUES[weather];
        if (!dialogues || dialogues.length === 0) return;

        var text = dialogues[Math.floor(Math.random() * dialogues.length)];

        if (window.GameHUD && typeof GameHUD.showToast === 'function') {
            GameHUD.showToast('\uD83D\uDCDE \u8F66\u5982\u4E91\uFF1A' + text, 'special', 5000);
        }
    }

    // ── Bonus Crop ──────────────────────────────────────────────
    function getActiveBonusCrop() {
        var event = getSeasonalEvent(_currentSeason);
        return event ? event.bonusCrop : null;
    }

    function getSeasonalShopItem() {
        var event = getSeasonalEvent(_currentSeason);
        return event ? event.specialShopItem : null;
    }

    function getSeasonalDialogue() {
        var event = getSeasonalEvent(_currentSeason);
        return event ? event.eventDialogue : null;
    }

    // ── Helpers ─────────────────────────────────────────────────
    function getCurrentSeason() {
        return _currentSeason;
    }

    function getSeasonName(season) {
        var names = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
        return names[season] || season;
    }

    // ── Export ──────────────────────────────────────────────────
    window.GameSeasonalEvents = {
        WEATHER_EFFECTS: WEATHER_EFFECTS,
        SEASONAL_EVENTS: SEASONAL_EVENTS,
        init: init,
        getWeatherEffect: getWeatherEffect,
        getSeasonalEvent: getSeasonalEvent,
        showSeasonalBanner: showSeasonalBanner,
        checkSpecialWeatherDialogue: checkSpecialWeatherDialogue,
        getActiveBonusCrop: getActiveBonusCrop,
        getSeasonalShopItem: getSeasonalShopItem,
        getSeasonalDialogue: getSeasonalDialogue,
        getCurrentSeason: getCurrentSeason,
        getSeasonName: getSeasonName
    };
})();
