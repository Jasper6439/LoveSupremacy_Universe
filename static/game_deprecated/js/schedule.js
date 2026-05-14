/**
 * NxSiran Game - Character Schedule System (v0.8)
 * 车如云's daily schedule based on game time, weather modifications
 */
(function () {
    'use strict';

    // ── 车如云's Daily Schedule ─────────────────────────────────
    // Game hours 6-22 (6am to 10pm), disciplined athlete routine
    var SCHEDULE = {
        6:  { location: 'track',      activity: '晨跑训练', mood: 'focused',  expression: 'default', available: true },
        7:  { location: 'track',      activity: '晨跑训练', mood: 'focused',  expression: 'default', available: true },
        8:  { location: 'school',     activity: '上课中',   mood: 'neutral',  expression: 'default', available: false },
        9:  { location: 'school',     activity: '上课中',   mood: 'neutral',  expression: 'default', available: false },
        10: { location: 'school',     activity: '上课中',   mood: 'neutral',  expression: 'default', available: false },
        11: { location: 'school',     activity: '上课中',   mood: 'neutral',  expression: 'default', available: false },
        12: { location: 'cafeteria',  activity: '午餐时间', mood: 'hungry',   expression: 'default', available: true },
        13: { location: 'rooftop',    activity: '天台独处', mood: 'lonely',   expression: 'thinking', available: true },
        14: { location: 'school',     activity: '上课中',   mood: 'neutral',  expression: 'default', available: false },
        15: { location: 'school',     activity: '上课中',   mood: 'neutral',  expression: 'default', available: false },
        16: { location: 'track',      activity: '田径训练', mood: 'serious',  expression: 'angry',   available: true },
        17: { location: 'track',      activity: '田径训练', mood: 'serious',  expression: 'angry',   available: true },
        18: { location: 'track',      activity: '田径训练', mood: 'tired',    expression: 'default', available: true },
        19: { location: 'dorm',       activity: '回宿舍',   mood: 'tired',    expression: 'sad',     available: false },
        20: { location: 'dorm',       activity: '休息',     mood: 'calm',     expression: 'default', available: false },
        21: { location: 'dorm',       activity: '休息',     mood: 'calm',     expression: 'default', available: false }
    };

    // Default schedule for hours outside 6-21
    var DEFAULT_SCHEDULE = {
        location: 'dorm',
        activity: '睡觉中',
        mood: 'calm',
        expression: 'default',
        available: false
    };

    // Weather override: bad weather forces 车如云 to stay in dorm
    var INDOOR_WEATHERS = ['rainy', 'snowy', 'stormy'];
    var INDOOR_SCHEDULE = {
        location: 'dorm',
        activity: '天气不好，在宿舍休息',
        mood: 'bored',
        expression: 'sad',
        available: true  // Can still interact, just stuck indoors
    };

    // Location display names
    var LOCATION_NAMES = {
        'track':     '田径场',
        'school':    '学校',
        'cafeteria': '食堂',
        'rooftop':   '天台',
        'dorm':      '宿舍'
    };

    // Mood modifiers for dialogue responses
    var MOOD_MODIFIERS = {
        'focused':  { responseLength: 0.7, openness: 0.3, prefix: '' },
        'neutral':  { responseLength: 1.0, openness: 0.5, prefix: '' },
        'hungry':   { responseLength: 0.8, openness: 0.6, prefix: '（嘴里嚼着饭）' },
        'lonely':   { responseLength: 1.3, openness: 0.8, prefix: '（看着远方）' },
        'serious':  { responseLength: 0.6, openness: 0.2, prefix: '（专注训练中）' },
        'tired':    { responseLength: 0.5, openness: 0.4, prefix: '（疲惫地）' },
        'calm':     { responseLength: 1.0, openness: 0.5, prefix: '' },
        'bored':    { responseLength: 1.1, openness: 0.7, prefix: '（无聊地）' },
        'sad':      { responseLength: 0.4, openness: 0.3, prefix: '（沉默）' }
    };

    // Unavailable messages based on activity
    var UNAVAILABLE_MESSAGES = {
        '上课中': '他现在在上课...等下课再来吧。',
        '回宿舍': '他已经回宿舍了，今天改天再来吧。',
        '休息':   '他正在休息，不要打扰他。',
        '睡觉中': '这个时间他应该在睡觉...'
    };

    // ── Internal State ──────────────────────────────────────────
    var _currentHour = 8;
    var _weatherOverride = false;
    var _indicatorEl = null;
    var _lastWeather = null;

    // ── Init ────────────────────────────────────────────────────
    function init() {
        var state = GameState.getState();
        _currentHour = state.gameHour || 8;
        _lastWeather = state.weather || 'sunny';

        // Create HUD indicator
        createScheduleIndicator();

        // Apply initial schedule
        updateScheduleDisplay();

        // Subscribe to state changes
        GameState.subscribe(function (state, prev, action) {
            if (action.type === 'UPDATE_WEATHER') {
                var wasOverride = _weatherOverride;
                _weatherOverride = INDOOR_WEATHERS.indexOf(action.weather) !== -1;

                if (_weatherOverride && !wasOverride) {
                    // Weather just turned bad
                    var weatherNames = { rainy: '下雨', snowy: '下雪', stormy: '暴风雨' };
                    var wName = weatherNames[action.weather] || '恶劣天气';
                    if (window.GameHUD && typeof GameHUD.showToast === 'function') {
                        GameHUD.showToast('\uD83C\uDF27\uFE0F 因为' + wName + '，车如云今天在宿舍休息', 'info', 4000);
                    }
                }

                updateScheduleDisplay();
            }
        });
    }

    // ── Schedule Query ──────────────────────────────────────────
    function getCurrentSchedule() {
        // Check weather override first
        if (_weatherOverride) {
            return INDOOR_SCHEDULE;
        }

        // Look up schedule for current hour
        var entry = SCHEDULE[_currentHour];
        if (!entry) return DEFAULT_SCHEDULE;

        // Return a copy to prevent mutation
        return {
            location: entry.location,
            activity: entry.activity,
            mood: entry.mood,
            expression: entry.expression,
            available: entry.available
        };
    }

    function isAvailable() {
        return getCurrentSchedule().available;
    }

    function getLocation() {
        return getCurrentSchedule().location;
    }

    function getActivity() {
        return getCurrentSchedule().activity;
    }

    function getMoodModifier() {
        var schedule = getCurrentSchedule();
        return MOOD_MODIFIERS[schedule.mood] || MOOD_MODIFIERS['neutral'];
    }

    function getLocationName(location) {
        return LOCATION_NAMES[location] || location;
    }

    function getUnavailableMessage() {
        var schedule = getCurrentSchedule();
        return UNAVAILABLE_MESSAGES[schedule.activity] || '他现在不在...';
    }

    // ── Time Change Handler ─────────────────────────────────────
    function onTimeChange(hour) {
        if (hour === _currentHour) return;

        var prevHour = _currentHour;
        _currentHour = hour;

        // Update NPC state
        var schedule = getCurrentSchedule();
        if (window.GameState) {
            GameState.dispatch({
                type: 'UPDATE_NPC',
                payload: {
                    id: 'chayewoon',
                    location: getLocationName(schedule.location),
                    activity: schedule.activity
                }
            });
        }

        // Update display
        updateScheduleDisplay();

        // Log for debugging
        console.log('[Schedule] 车如云 ' + prevHour + ':00 -> ' + hour + ':00 | ' +
            getLocationName(schedule.location) + ' - ' + schedule.activity);
    }

    // ── HUD Indicator ───────────────────────────────────────────
    function createScheduleIndicator() {
        var hud = document.getElementById('game-hud');
        if (!hud) return;

        var hudLeft = hud.querySelector('.hud-left');
        if (!hudLeft) return;

        _indicatorEl = document.createElement('div');
        _indicatorEl.className = 'schedule-indicator';
        _indicatorEl.id = 'schedule-indicator';
        hudLeft.appendChild(_indicatorEl);
    }

    function updateScheduleDisplay() {
        if (!_indicatorEl) return;

        var schedule = getCurrentSchedule();
        var locationName = getLocationName(schedule.location);
        var isAvail = schedule.available;

        _indicatorEl.innerHTML =
            '<span class="schedule-icon">' + (isAvail ? '\uD83D\uDCAC' : '\uD83D\uDD12') + '</span>' +
            '<span class="schedule-text">' + locationName + ' \u00B7 ' + schedule.activity + '</span>';

        _indicatorEl.className = 'schedule-indicator' + (isAvail ? '' : ' schedule-unavailable');
    }

    // ── Export ──────────────────────────────────────────────────
    window.GameSchedule = {
        SCHEDULE: SCHEDULE,
        init: init,
        getCurrentSchedule: getCurrentSchedule,
        isAvailable: isAvailable,
        getLocation: getLocation,
        getActivity: getActivity,
        getMoodModifier: getMoodModifier,
        getLocationName: getLocationName,
        getUnavailableMessage: getUnavailableMessage,
        onTimeChange: onTimeChange,
        updateScheduleDisplay: updateScheduleDisplay
    };
})();
