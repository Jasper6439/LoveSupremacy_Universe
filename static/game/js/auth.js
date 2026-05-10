/**
 * NxSiran Game - Authentication Module (v0.4)
 * Login/Register overlay with Korean BL drama aesthetic
 */
(function () {
    'use strict';

    var overlayEl = null;
    var currentTab = 'login';

    // ── Initialize ─────────────────────────────────────────────
    function init() {
        if (isLoggedIn()) {
            // Already logged in, hide login screen
            hideLoginScreen();
        } else {
            // Not logged in, show login screen
            showLoginScreen();
        }
    }

    // ── Check Login State ──────────────────────────────────────
    function isLoggedIn() {
        if (window.GameAPI && typeof GameAPI.isLoggedIn === 'function') {
            return GameAPI.isLoggedIn();
        }
        return !!localStorage.getItem('game_token');
    }

    // ── Show Login Screen ──────────────────────────────────────
    function showLoginScreen() {
        // Remove existing overlay if any
        hideLoginScreen();

        currentTab = 'login';

        // Create overlay element
        overlayEl = document.createElement('div');
        overlayEl.className = 'auth-overlay auth-fade-in';
        overlayEl.innerHTML = buildOverlayHTML();
        document.body.appendChild(overlayEl);

        // Bind events
        bindEvents();
    }

    // ── Hide Login Screen ──────────────────────────────────────
    function hideLoginScreen() {
        if (!overlayEl) return;

        overlayEl.classList.remove('auth-fade-in');
        overlayEl.classList.add('auth-fade-out');

        setTimeout(function () {
            if (overlayEl && overlayEl.parentNode) {
                overlayEl.parentNode.removeChild(overlayEl);
            }
            overlayEl = null;
        }, 400);
    }

    // ── Build Overlay HTML ─────────────────────────────────────
    function buildOverlayHTML() {
        return '' +
            '<div class="auth-card">' +
                '<div class="auth-card-inner">' +
                    '<div class="auth-title-area">' +
                        '<h1 class="auth-title">\u604B\u7231\u81F3\u4E0A\u4E3B\u4E49\u533A\u57DF</h1>' +
                        '<p class="auth-subtitle">Love Supremacy Zone</p>' +
                    '</div>' +

                    '<div class="auth-tabs">' +
                        '<button class="auth-tab active" data-tab="login">\u767B\u5F55</button>' +
                        '<button class="auth-tab" data-tab="register">\u6CE8\u518C</button>' +
                    '</div>' +

                    '<div class="auth-error" id="auth-error" style="display:none;"></div>' +

                    '<div class="auth-forms">' +
                        '<!-- Login Form -->' +
                        '<form class="auth-form" id="auth-login-form">' +
                            '<div class="auth-field">' +
                                '<input type="text" class="auth-input" id="login-username" placeholder="\u7528\u6237\u540D" autocomplete="username" required>' +
                            '</div>' +
                            '<div class="auth-field">' +
                                '<input type="password" class="auth-input" id="login-password" placeholder="\u5BC6\u7801" autocomplete="current-password" required>' +
                            '</div>' +
                            '<button type="submit" class="auth-btn" id="login-btn">\u767B\u5F55</button>' +
                        '</form>' +

                        '<!-- Register Form -->' +
                        '<form class="auth-form" id="auth-register-form" style="display:none;">' +
                            '<div class="auth-field">' +
                                '<input type="text" class="auth-input" id="register-username" placeholder="\u7528\u6237\u540D" autocomplete="username" required>' +
                            '</div>' +
                            '<div class="auth-field">' +
                                '<input type="password" class="auth-input" id="register-password" placeholder="\u5BC6\u7801" autocomplete="new-password" required>' +
                            '</div>' +
                            '<div class="auth-field">' +
                                '<input type="text" class="auth-input" id="register-chatid" placeholder="Telegram Chat ID" autocomplete="off" required>' +
                            '</div>' +
                            '<button type="submit" class="auth-btn" id="register-btn">\u6CE8\u518C</button>' +
                        '</form>' +
                    '</div>' +

                    '<div class="auth-footer">' +
                        '<p class="auth-hint">\u7EFF\u8272\u7684\u5149\u8292\u7167\u4EAE\u4E86\u8FD9\u4E2A\u4E16\u754C...</p>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    // ── Bind Events ────────────────────────────────────────────
    function bindEvents() {
        if (!overlayEl) return;

        // Tab switching
        var tabs = overlayEl.querySelectorAll('.auth-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function () {
                switchTab(this.getAttribute('data-tab'));
            });
        }

        // Login form submit
        var loginForm = overlayEl.querySelector('#auth-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var username = overlayEl.querySelector('#login-username').value.trim();
                var password = overlayEl.querySelector('#login-password').value;
                if (username && password) {
                    handleLogin(username, password);
                } else {
                    showError('\u8BF7\u586B\u5199\u7528\u6237\u540D\u548C\u5BC6\u7801');
                }
            });
        }

        // Register form submit
        var registerForm = overlayEl.querySelector('#auth-register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var username = overlayEl.querySelector('#register-username').value.trim();
                var password = overlayEl.querySelector('#register-password').value;
                var chatId = overlayEl.querySelector('#register-chatid').value.trim();
                if (username && password && chatId) {
                    handleRegister(username, password, chatId);
                } else {
                    showError('\u8BF7\u586B\u5199\u6240\u6709\u5B57\u6BB5');
                }
            });
        }
    }

    // ── Switch Tab ─────────────────────────────────────────────
    function switchTab(tab) {
        currentTab = tab;

        if (!overlayEl) return;

        // Update tab buttons
        var tabs = overlayEl.querySelectorAll('.auth-tab');
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].getAttribute('data-tab') === tab) {
                tabs[i].classList.add('active');
            } else {
                tabs[i].classList.remove('active');
            }
        }

        // Update forms
        var loginForm = overlayEl.querySelector('#auth-login-form');
        var registerForm = overlayEl.querySelector('#auth-register-form');

        if (tab === 'login') {
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
        } else {
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
        }

        // Clear error
        hideError();
    }

    // ── Handle Login ───────────────────────────────────────────
    function handleLogin(username, password) {
        if (!window.GameAPI) {
            showError('\u7CFB\u7EDF\u672A\u5C31\u7EEA\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5');
            return;
        }

        var loginBtn = overlayEl.querySelector('#login-btn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = '\u767B\u5F55\u4E2D...';
        }

        GameAPI.login(username, password).then(function (data) {
            if (data && data.token) {
                GameAPI.setToken(data.token);
                hideLoginScreen();

                // Trigger game load
                if (window.loadGame) {
                    window.loadGame();
                }
            } else {
                showError('\u767B\u5F55\u5931\u8D25\uFF0C\u672A\u83B7\u53D6\u5230 token');
                resetButton(loginBtn, '\u767B\u5F55');
            }
        }).catch(function (err) {
            showError('\u767B\u5F55\u5931\u8D25\uFF1A' + (err.message || '\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF'));
            resetButton(loginBtn, '\u767B\u5F55');
        });
    }

    // ── Handle Register ────────────────────────────────────────
    function handleRegister(username, password, chatId) {
        if (!window.GameAPI) {
            showError('\u7CFB\u7EDF\u672A\u5C31\u7EEA\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5');
            return;
        }

        var registerBtn = overlayEl.querySelector('#register-btn');
        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.textContent = '\u6CE8\u518C\u4E2D...';
        }

        GameAPI.register(username, password, chatId).then(function (data) {
            if (data && data.token) {
                GameAPI.setToken(data.token);
                hideLoginScreen();

                // Trigger game load
                if (window.loadGame) {
                    window.loadGame();
                }
            } else {
                showError('\u6CE8\u518C\u5931\u8D25\uFF0C\u672A\u83B7\u53D6\u5230 token');
                resetButton(registerBtn, '\u6CE8\u518C');
            }
        }).catch(function (err) {
            showError('\u6CE8\u518C\u5931\u8D25\uFF1A' + (err.message || '\u8BF7\u68C0\u67E5\u4FE1\u606F\u662F\u5426\u6B63\u786E'));
            resetButton(registerBtn, '\u6CE8\u518C');
        });
    }

    // ── Handle Logout ──────────────────────────────────────────
    function handleLogout() {
        if (window.GameAPI) {
            GameAPI.logout();
        }

        // Show login screen
        showLoginScreen();

        // Reload page to reset game state
        setTimeout(function () {
            window.location.reload();
        }, 500);
    }

    // ── Show Error ─────────────────────────────────────────────
    function showError(msg) {
        if (!overlayEl) return;
        var errorEl = overlayEl.querySelector('#auth-error');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
    }

    // ── Hide Error ─────────────────────────────────────────────
    function hideError() {
        if (!overlayEl) return;
        var errorEl = overlayEl.querySelector('#auth-error');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }
    }

    // ── Reset Button ───────────────────────────────────────────
    function resetButton(btn, text) {
        if (btn) {
            btn.disabled = false;
            btn.textContent = text;
        }
    }

    // ── Export ─────────────────────────────────────────────────
    window.GameAuth = {
        init: init,
        showLoginScreen: showLoginScreen,
        hideLoginScreen: hideLoginScreen,
        handleLogin: handleLogin,
        handleRegister: handleRegister,
        handleLogout: handleLogout,
        isLoggedIn: isLoggedIn
    };
})();
