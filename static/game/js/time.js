/**
 * NxSiran Game - Time System (v0.8)
 * Game day/night cycle, seasons, crop growth timing
 * 1 real second = 1 game minute, so 1 game day = 24 real minutes
 */
(function () {
    'use strict';

    var _gameTickInterval = null;
    var TICK_MS = 1000; // 1 second per tick = 1 game minute
    var _lastHour = -1;

    function init() {
        // Initialize hour tracking
        var state = GameState.getState();
        _lastHour = state.gameHour || 8;

        // Start game tick
        _gameTickInterval = setInterval(tick, TICK_MS);
    }

    function tick() {
        var state = GameState.getState();
        if (state.status !== 'playing') return;

        // Update crop growth (also advances gameMinute/gameHour internally)
        GameState.dispatch({ type: 'TICK' });

        // Check if hour changed
        var newState = GameState.getState();
        var currentHour = newState.gameHour || 0;
        if (currentHour !== _lastHour) {
            _lastHour = currentHour;

            // Notify schedule system of hour change
            if (window.GameSchedule) {
                GameSchedule.onTimeChange(currentHour);
            }

            // Update HUD time display
            if (window.GameHUD && typeof GameHUD.updateTimeDisplay === 'function') {
                GameHUD.updateTimeDisplay(currentHour);
            }
        }

        // Re-render crops that changed
        if (window.GameRenderer) {
            GameRenderer.renderCrops(GameState.getState().crops);
        }
    }

    function getGameTime() {
        var state = GameState.getState();
        return {
            day: state.gameDay,
            season: state.season,
            weather: state.weather,
            hour: state.gameHour || 8,
            minute: state.gameMinute || 0
        };
    }

    function getGameHour() {
        var state = GameState.getState();
        return state.gameHour || 8;
    }

    function getGameMinute() {
        var state = GameState.getState();
        return state.gameMinute || 0;
    }

    function getTimeOfDay() {
        var hour = getGameHour();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    function getTimeOfDayName() {
        var names = {
            'morning': '上午',
            'afternoon': '下午',
            'evening': '傍晚',
            'night': '夜晚'
        };
        return names[getTimeOfDay()] || '';
    }

    function formatGameTime() {
        var h = getGameHour();
        var m = getGameMinute();
        var hStr = h < 10 ? '0' + h : '' + h;
        var mStr = m < 10 ? '0' + m : '' + m;
        return hStr + ':' + mStr;
    }

    function advanceDay() {
        var state = GameState.getState();
        var seasons = ['spring', 'summer', 'autumn', 'winter'];
        var seasonIdx = seasons.indexOf(state.season);
        var newDay = state.gameDay + 1;

        // Season changes every 28 days
        if (newDay % 28 === 0) {
            seasonIdx = (seasonIdx + 1) % 4;
            GameState.dispatch({ type: 'LOAD_STATE', payload: { season: seasons[seasonIdx] } });
        }

        GameState.dispatch({ type: 'LOAD_STATE', payload: { gameDay: newDay } });
    }

    function destroy() {
        clearInterval(_gameTickInterval);
    }

    window.GameTime = {
        init: init,
        tick: tick,
        getGameTime: getGameTime,
        getGameHour: getGameHour,
        getGameMinute: getGameMinute,
        getTimeOfDay: getTimeOfDay,
        getTimeOfDayName: getTimeOfDayName,
        formatGameTime: formatGameTime,
        advanceDay: advanceDay,
        destroy: destroy
    };
})();
