/**
 * 聊天页面 - 与车如云对话
 */
(function() {
    var messageList = null;
    var inputField = null;
    var sendBtn = null;
    var lastMessageCount = 0;
    var syncInterval = null;

    // 表情包列表 - 常用表情分类
    var EMOJI_CATEGORIES = [
        { name: '笑脸', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕'] },
        { name: '爱心', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣','💕','💞','💓','💗','💖','💘','💝','💟','♥'] },
        { name: '手势', emojis: ['👍','👎','👊','✊','🤛','🤜','🤝','👏','🙌','🤲','🙏','💪','🤳','✌','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝'] },
        { name: '物品', emojis: ['💎','💰','🎁','🎀','🎈','🎉','🎊','🏆','🥇','🥈','🥉','⭐','🌟','✨','💫','🔥','💥','💢','💦','💨','🕐','💭','💬','📱','📷','🎵','🎶'] },
        { name: '食物', emojis: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥝','🍅','🥕','🌽','🍕','🍔','🍟','🌭','🍿','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭'] },
        { name: '动物', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌'] },
    ];

    function init() {
        console.log('[Chat] Initializing chat page');
    }

    function onPageEnter() {
        console.log('[Chat] Page entered');
        render();
        loadMessages();
        startSync();
        scrollToBottom();
    }

    function onPageLeave() {
        console.log('[Chat] Page left');
        stopSync();
        closeEmojiPicker();
    }

    function render() {
        var container = document.getElementById('page-chat');
        if (!container) return;

        container.innerHTML =
            '<div class="chat-container">' +
            '  <div class="chat-header">' +
            '    <div class="chat-avatar">💕</div>' +
            '    <div class="chat-info">' +
            '      <div class="chat-name">车如云</div>' +
            '      <div class="chat-status" id="chat-status">在线</div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="chat-messages" id="chat-messages"></div>' +
            '  <div class="chat-input-area">' +
            '    <button id="emoji-btn" class="emoji-btn" title="表情包">😊</button>' +
            '    <input type="text" id="chat-input" class="chat-input" ' +
            '           placeholder="输入消息..." maxlength="2000">' +
            '    <button id="chat-send" class="chat-send-btn">发送</button>' +
            '  </div>' +
            '  <div class="emoji-picker" id="emoji-picker" style="display:none;">' +
            '    <div class="emoji-tabs" id="emoji-tabs"></div>' +
            '    <div class="emoji-grid" id="emoji-grid"></div>' +
            '  </div>' +
            '</div>';

        messageList = document.getElementById('chat-messages');
        inputField = document.getElementById('chat-input');
        sendBtn = document.getElementById('chat-send');

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        inputField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });

        // Emoji picker
        setupEmojiPicker();
    }

    function loadMessages() {
        if (!window.API || !window.API.telegram) {
            showError('API 未加载');
            return;
        }

        window.API.telegram.getChatHistory(50).then(function(data) {
            if (data.error) {
                showError(data.error);
                return;
            }

            if (!data.linked) {
                showLinkPrompt();
                return;
            }

            renderMessages(data.messages || []);
            lastMessageCount = data.total_count || 0;
        }).catch(function(err) {
            var msg = (err && err.message) ? err.message : '加载消息失败';
            showError(msg);
        });
    }

    function renderMessages(messages) {
        if (!messageList) return;

        messageList.innerHTML = messages.map(function(msg) {
            var isUser = msg.role === 'user';
            var time = formatTime(msg.timestamp);
            return '<div class="chat-message ' + (isUser ? 'message-user' : 'message-bot') + '">' +
                '  <div class="message-bubble">' +
                '    <div class="message-content">' + escapeHtml(msg.content) + '</div>' +
                '    <div class="message-time">' + time + '</div>' +
                '  </div>' +
                '</div>';
        }).join('');

        scrollToBottom();
    }

    function sendMessage() {
        if (!inputField) return;

        var message = inputField.value.trim();
        if (!message) return;

        // Add to UI immediately (optimistic) with sending status
        appendMessage({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        }, 'sending');

        inputField.value = '';
        scrollToBottom();

        // Show typing indicator
        showTypingIndicator();

        // Send to server
        window.API.telegram.sendMessage(message).then(function(data) {
            if (data.error) {
                hideTypingIndicator();
                showError(data.error);
            } else if (data.pending_reply) {
                // AI is thinking, start polling for reply
                pollForReply();
            }
        }).catch(function(err) {
            hideTypingIndicator();
            var msg = (err && err.message) ? err.message : '发送失败';
            showError(msg);
        });
    }

    function showTypingIndicator() {
        if (!messageList) return;

        var indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'chat-message message-bot';
        indicator.innerHTML =
            '<div class="message-bubble typing-bubble">' +
            '  <span class="typing-dot"></span>' +
            '  <span class="typing-dot"></span>' +
            '  <span class="typing-dot"></span>' +
            '</div>';
        messageList.appendChild(indicator);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        var indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function pollForReply() {
        // Poll every 2 seconds for up to 30 seconds
        var attempts = 0;
        var maxAttempts = 15;

        var pollInterval = setInterval(function() {
            attempts++;

            window.API.telegram.syncMessages(lastMessageCount).then(function(data) {
                if (data.messages && data.messages.length > 0) {
                    // Check if last message is from bot
                    var lastMsg = data.messages[data.messages.length - 1];
                    if (lastMsg.role === 'assistant' || lastMsg.role === 'bot') {
                        hideTypingIndicator();
                        data.messages.forEach(function(msg) {
                            appendMessage(msg);
                        });
                        lastMessageCount = data.total_count;
                        clearInterval(pollInterval);
                        return;
                    }
                }

                if (attempts >= maxAttempts) {
                    hideTypingIndicator();
                    clearInterval(pollInterval);
                    appendMessage({
                        role: 'bot',
                        content: '车如云正在思考，请稍后再试...',
                        timestamp: new Date().toISOString()
                    });
                }
            }).catch(function() {
                // Silent fail, continue polling
            });
        }, 2000);
    }

    function appendMessage(msg, status) {
        if (!messageList) return;

        var isUser = msg.role === 'user';
        var time = formatTime(msg.timestamp);
        var statusIcon = '';

        if (isUser && status) {
            var icons = {
                'sending': '⏳',
                'sent': '✓',
                'delivered': '✓✓',
                'failed': '❌'
            };
            statusIcon = '<span class="message-status">' + (icons[status] || '') + '</span>';
        }

        var div = document.createElement('div');
        div.className = 'chat-message ' + (isUser ? 'message-user' : 'message-bot');
        div.innerHTML =
            '<div class="message-bubble">' +
            '  <div class="message-content">' + escapeHtml(msg.content) + '</div>' +
            '  <div class="message-meta">' +
            '    <span class="message-time">' + time + '</span>' +
            statusIcon +
            '  </div>' +
            '</div>';
        messageList.appendChild(div);
        scrollToBottom();
    }

    function syncNewMessages() {
        window.API.telegram.syncMessages(lastMessageCount).then(function(data) {
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(appendMessage);
                lastMessageCount = data.total_count;
            }
        }).catch(function() {
            // Silent fail for background sync
        });
    }

    function startSync() {
        // Fast sync (2 seconds) when on chat page
        syncInterval = setInterval(syncNewMessages, 2000);
    }

    function stopSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    function scrollToBottom() {
        if (messageList) {
            messageList.scrollTop = messageList.scrollHeight;
        }
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        var date = new Date(timestamp);
        return date.getHours().toString().padStart(2, '0') + ':' +
               date.getMinutes().toString().padStart(2, '0');
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showError(msg) {
        if (!messageList) return;
        messageList.innerHTML = '<div class="chat-error">' + msg + '</div>';
    }

    function showLinkPrompt() {
        if (!messageList) return;
        messageList.innerHTML =
            '<div class="chat-link-prompt">' +
            '  <p>💬 请先关联 Telegram 账号</p>' +
            '  <p>在设置页面输入你的 Telegram ID</p>' +
            '</div>';
    }

    // ===== Emoji Picker =====
    var currentEmojiCategory = 0;

    function setupEmojiPicker() {
        var emojiBtn = document.getElementById('emoji-btn');
        if (!emojiBtn) return;

        emojiBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleEmojiPicker();
        });

        // Render emoji tabs
        var tabsContainer = document.getElementById('emoji-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = EMOJI_CATEGORIES.map(function(cat, i) {
                return '<div class="emoji-tab' + (i === 0 ? ' active' : '') + '" data-cat="' + i + '">' + cat.name + '</div>';
            }).join('');

            tabsContainer.addEventListener('click', function(e) {
                var tab = e.target.closest('.emoji-tab');
                if (tab) {
                    var catIndex = parseInt(tab.getAttribute('data-cat'), 10);
                    switchEmojiCategory(catIndex);
                }
            });
        }

        // Render first category
        renderEmojiGrid(0);

        // Close picker when clicking outside
        document.addEventListener('click', function(e) {
            var picker = document.getElementById('emoji-picker');
            var btn = document.getElementById('emoji-btn');
            if (picker && !picker.contains(e.target) && !btn.contains(e.target)) {
                closeEmojiPicker();
            }
        });
    }

    function toggleEmojiPicker() {
        var picker = document.getElementById('emoji-picker');
        if (!picker) return;

        if (picker.style.display === 'none') {
            picker.style.display = 'block';
        } else {
            picker.style.display = 'none';
        }
    }

    function closeEmojiPicker() {
        var picker = document.getElementById('emoji-picker');
        if (picker) picker.style.display = 'none';
    }

    function switchEmojiCategory(index) {
        currentEmojiCategory = index;

        // Update tab styles
        var tabs = document.querySelectorAll('.emoji-tab');
        tabs.forEach(function(tab, i) {
            if (i === index) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        renderEmojiGrid(index);
    }

    function renderEmojiGrid(categoryIndex) {
        var grid = document.getElementById('emoji-grid');
        if (!grid) return;

        var category = EMOJI_CATEGORIES[categoryIndex];
        if (!category) return;

        grid.innerHTML = category.emojis.map(function(emoji) {
            return '<span class="emoji-item" data-emoji="' + emoji + '">' + emoji + '</span>';
        }).join('');

        grid.addEventListener('click', function(e) {
            var item = e.target.closest('.emoji-item');
            if (item) {
                var emoji = item.getAttribute('data-emoji');
                insertEmoji(emoji);
            }
        });
    }

    function insertEmoji(emoji) {
        if (!inputField) return;

        var currentValue = inputField.value;
        var cursorPos = inputField.selectionStart || currentValue.length;
        inputField.value = currentValue.substring(0, cursorPos) + emoji + currentValue.substring(cursorPos);

        // Move cursor after emoji
        var newPos = cursorPos + emoji.length;
        inputField.setSelectionRange(newPos, newPos);
        inputField.focus();
    }

    // Export
    window.PageChat = {
        init: init,
        onPageEnter: onPageEnter,
        onPageLeave: onPageLeave
    };
})();
