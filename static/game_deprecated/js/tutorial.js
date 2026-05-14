/**
 * NxSiran Game - Tutorial System (v1.0)
 * New player onboarding with spotlight guidance
 */
(function () {
    'use strict';

    // ── Tutorial Steps ──────────────────────────────────────────
    var TUTORIAL_STEPS = [
        {
            id: 'welcome',
            title: '欢迎来到恋爱至上主义区域',
            text: '你是新叶男子高中的转学生。今天是你第一天上学。',
            target: null,
            action: 'next'
        },
        {
            id: 'movement',
            title: '移动',
            text: '使用 WASD 或方向键移动角色，也可以点击屏幕上的方向键。',
            target: '#dpad',
            action: 'highlight'
        },
        {
            id: 'farm',
            title: '你的农场',
            text: '这是你的农场！点击土地可以种植作物。',
            target: '#game-viewport',
            action: 'highlight'
        },
        {
            id: 'shop',
            title: '商店',
            text: '在商店购买种子，然后回到农场种植。',
            target: '#action-buttons',
            action: 'highlight'
        },
        {
            id: 'npc',
            title: '车如云',
            text: '他是田径部的王牌——车如云。试着和他对话吧！',
            target: '#emotion-panel',
            action: 'highlight'
        },
        {
            id: 'quests',
            title: '每日任务',
            text: '完成每日任务可以获得金币和经验奖励。',
            target: '.quest-btn',
            action: 'highlight'
        },
        {
            id: 'story',
            title: '剧情模式',
            text: '点击故事按钮，开始你的恋爱故事吧！',
            target: '.action-fab[title="剧情"]',
            action: 'highlight'
        }
    ];

    var STORAGE_KEY = 'game_tutorial_completed';
    var currentStep = -1;
    var overlayEl = null;
    var cardEl = null;
    var spotlightEl = null;
    var dotsEl = null;
    var isActive = false;

    // ── Initialize ──────────────────────────────────────────────
    function init() {
        if (isCompleted()) {
            console.log('[Tutorial] Already completed, skipping');
            return;
        }

        // Wait for game to fully load before starting tutorial
        var checkLoaded = function () {
            var loading = document.getElementById('loading-screen');
            if (!loading || loading.style.display === 'none') {
                // Small delay so the game UI is fully rendered
                setTimeout(function () {
                    startTutorial();
                }, 800);
            } else {
                setTimeout(checkLoaded, 300);
            }
        };

        // Also listen for the loading screen being hidden
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    var loading = document.getElementById('loading-screen');
                    if (!loading || loading.style.display === 'none') {
                        observer.disconnect();
                        setTimeout(function () {
                            startTutorial();
                        }, 800);
                    }
                }
            });
        });

        var loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            observer.observe(loadingScreen, { attributes: true });
        }

        checkLoaded();
    }

    // ── Start Tutorial ──────────────────────────────────────────
    function startTutorial() {
        if (isActive) return;

        createOverlay();
        currentStep = 0;
        isActive = true;
        showStep(currentStep);
        console.log('[Tutorial] Started');
    }

    // ── Create Overlay DOM ──────────────────────────────────────
    function createOverlay() {
        // Full screen dark overlay
        overlayEl = document.createElement('div');
        overlayEl.className = 'tutorial-overlay';
        overlayEl.style.display = 'none';

        // Spotlight element (positioned over target)
        spotlightEl = document.createElement('div');
        spotlightEl.className = 'tutorial-spotlight';
        spotlightEl.style.display = 'none';

        // Tutorial card
        cardEl = document.createElement('div');
        cardEl.className = 'tutorial-card';
        cardEl.innerHTML =
            '<div class="tutorial-title"></div>' +
            '<div class="tutorial-text"></div>' +
            '<div class="tutorial-dots"></div>' +
            '<div class="tutorial-actions">' +
            '<button class="tutorial-btn tutorial-skip-btn">跳过</button>' +
            '<button class="tutorial-btn tutorial-next-btn">下一步</button>' +
            '</div>';

        // Bind card buttons
        var skipBtn = cardEl.querySelector('.tutorial-skip-btn');
        var nextBtn = cardEl.querySelector('.tutorial-next-btn');
        skipBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            skipTutorial();
        });
        nextBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            nextStep();
        });

        // Click overlay to advance (except on spotlight)
        overlayEl.addEventListener('click', function (e) {
            if (e.target === overlayEl) {
                nextStep();
            }
        });

        dotsEl = cardEl.querySelector('.tutorial-dots');

        document.body.appendChild(overlayEl);
        document.body.appendChild(spotlightEl);
        document.body.appendChild(cardEl);
    }

    // ── Show Step ───────────────────────────────────────────────
    function showStep(index) {
        if (index < 0 || index >= TUTORIAL_STEPS.length) {
            completeTutorial();
            return;
        }

        var step = TUTORIAL_STEPS[index];

        // Update card content
        var titleEl = cardEl.querySelector('.tutorial-title');
        var textEl = cardEl.querySelector('.tutorial-text');
        titleEl.textContent = step.title;
        textEl.textContent = step.text;

        // Update next button text
        var nextBtn = cardEl.querySelector('.tutorial-next-btn');
        nextBtn.textContent = (index === TUTORIAL_STEPS.length - 1) ? '完成' : '下一步';

        // Update dots
        updateDots(index);

        // Show overlay
        overlayEl.style.display = 'block';

        // Position spotlight on target
        if (step.target) {
            var targetEl = document.querySelector(step.target);
            if (targetEl) {
                positionSpotlight(targetEl);
                spotlightEl.style.display = 'block';
            } else {
                // Fallback: center spotlight
                positionSpotlightCenter();
                spotlightEl.style.display = 'block';
            }
        } else {
            // No target, hide spotlight
            spotlightEl.style.display = 'none';
        }

        // Animate card in
        cardEl.style.display = 'flex';
        cardEl.classList.remove('tutorial-card-enter');
        // Force reflow
        void cardEl.offsetWidth;
        cardEl.classList.add('tutorial-card-enter');
    }

    // ── Position Spotlight ──────────────────────────────────────
    function positionSpotlight(targetEl) {
        var rect = targetEl.getBoundingClientRect();
        var padding = 8;

        spotlightEl.style.position = 'fixed';
        spotlightEl.style.left = (rect.left - padding) + 'px';
        spotlightEl.style.top = (rect.top - padding) + 'px';
        spotlightEl.style.width = (rect.width + padding * 2) + 'px';
        spotlightEl.style.height = (rect.height + padding * 2) + 'px';
        spotlightEl.style.borderRadius = '12px';
        spotlightEl.style.zIndex = '9500';
    }

    function positionSpotlightCenter() {
        var size = 120;
        spotlightEl.style.position = 'fixed';
        spotlightEl.style.left = '50%';
        spotlightEl.style.top = '40%';
        spotlightEl.style.width = size + 'px';
        spotlightEl.style.height = size + 'px';
        spotlightEl.style.marginLeft = (-size / 2) + 'px';
        spotlightEl.style.marginTop = (-size / 2) + 'px';
        spotlightEl.style.borderRadius = '50%';
        spotlightEl.style.zIndex = '9500';
    }

    // ── Update Progress Dots ────────────────────────────────────
    function updateDots(activeIndex) {
        if (!dotsEl) return;
        dotsEl.innerHTML = '';

        for (var i = 0; i < TUTORIAL_STEPS.length; i++) {
            var dot = document.createElement('span');
            dot.className = 'tutorial-dot' + (i === activeIndex ? ' active' : '');
            dotsEl.appendChild(dot);
        }
    }

    // ── Next Step ───────────────────────────────────────────────
    function nextStep() {
        if (!isActive) return;
        currentStep++;
        if (currentStep >= TUTORIAL_STEPS.length) {
            completeTutorial();
        } else {
            showStep(currentStep);
        }
    }

    // ── Skip Tutorial ───────────────────────────────────────────
    function skipTutorial() {
        console.log('[Tutorial] Skipped by user');
        completeTutorial();
    }

    // ── Complete Tutorial ───────────────────────────────────────
    function completeTutorial() {
        isActive = false;
        currentStep = -1;

        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch (e) {
            // localStorage may be unavailable
        }

        // Animate out
        if (cardEl) {
            cardEl.classList.remove('tutorial-card-enter');
            cardEl.classList.add('tutorial-card-exit');
        }

        setTimeout(function () {
            if (overlayEl) {
                overlayEl.style.display = 'none';
            }
            if (spotlightEl) {
                spotlightEl.style.display = 'none';
            }
            if (cardEl) {
                cardEl.style.display = 'none';
                cardEl.classList.remove('tutorial-card-exit');
            }
        }, 300);

        console.log('[Tutorial] Completed');
    }

    // ── Check Completion ────────────────────────────────────────
    function isCompleted() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    // ── Reset Tutorial (for debugging) ──────────────────────────
    function resetTutorial() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // ignore
        }
        console.log('[Tutorial] Reset - will show on next load');
    }

    // ── Export ──────────────────────────────────────────────────
    window.GameTutorial = {
        init: init,
        startTutorial: startTutorial,
        showStep: showStep,
        nextStep: nextStep,
        skipTutorial: skipTutorial,
        completeTutorial: completeTutorial,
        isCompleted: isCompleted,
        resetTutorial: resetTutorial
    };
})();
