// miniapp.html main script
// ===== Telegram Web App Init =====
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#7B2D8E'); } catch(e) {}
    try { tg.setBackgroundColor('#EDE7F6'); } catch(e) {}
}

// ===== API Base URL =====
// Mini App 通过 Telegram 服务器加载，需要使用完整 URL
const API_BASE = window.location.origin;
var authToken = localStorage.getItem('auth_token') || '';
var currentCharacterId = '';

function authHeaders() {
    var headers = {};
    if (authToken) {
        headers['Authorization'] = 'Bearer ' + authToken;
    }
    return headers;
}

// ===== Toast System =====
function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// ===== Page Navigation =====
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

    var page = document.getElementById('page-' + pageName);
    if (page) page.classList.add('active');

    var navBtn = document.querySelector('.nav-item[data-page="' + pageName + '"]');
    if (navBtn) navBtn.classList.add('active');

    var titles = { home: '车如云', gallery: '照片相册', quota: '额度监控', settings: '设置', skills: '技能管理', game: '车如云物语', farm: '农场' };
    var headerTitle = titles[pageName] || '车如云';
    document.querySelector('.header h1').textContent = headerTitle;
    
    // 游戏页面隐藏 header，其他页面显示
    var header = document.querySelector('.header');
    if (pageName === 'game') {
        header.style.display = 'none';
    } else {
        header.style.display = '';
    }

    if (pageName === 'gallery') loadGallery();
    if (pageName === 'skills') loadSkills();
    if (pageName === 'quota') loadQuota();
    if (pageName === 'game') initGameIfNeeded();
}

// ===== Stats =====
async function loadStats() {
    try {
        const response = await fetch(API_BASE + '/api/stats', { headers: authHeaders() });
        const data = await response.json();
        document.getElementById('selfie-count').textContent = data.selfie_count || 0;
        document.getElementById('user-count').textContent = data.user_photo_count || 0;
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// ===== Selfie Upload =====
let selectedFiles = [];

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const previewGrid = document.getElementById('preview-grid');

uploadArea.addEventListener('click', function() { fileInput.click(); });

uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); });

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', function(e) {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    selectedFiles = Array.from(files).filter(function(f) {
        var type = f.type.toLowerCase();
        var name = f.name.toLowerCase();
        return type.startsWith('image/') ||
               name.endsWith('.jpg') || name.endsWith('.jpeg') ||
               name.endsWith('.png') || name.endsWith('.gif') ||
               name.endsWith('.webp') || name.endsWith('.heic');
    });
    if (selectedFiles.length === 0) {
        showToast('请选择图片文件', 'error');
        return;
    }

    previewGrid.innerHTML = '';
    selectedFiles.forEach(function(file, index) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = '<img src="' + e.target.result + '" alt="preview">' +
                '<button class="remove-btn" onclick="removeFile(' + index + ')">&times;</button>';
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });

    previewSection.classList.add('active');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    if (selectedFiles.length === 0) {
        previewSection.classList.remove('active');
    } else {
        fileInput.value = '';
        handleFiles(selectedFiles);
    }
}

async function uploadPhotos() {
    if (selectedFiles.length === 0) return;

    document.getElementById('loading').classList.add('active');
    document.getElementById('upload-btn').disabled = true;

    try {
        var base64Photos = await Promise.all(selectedFiles.map(function(file) {
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() { resolve(reader.result); };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }));

        var response = await fetch(API_BASE + '/api/upload-selfies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ photos: base64Photos })
        });

        var result = await response.json();

        if (result.success) {
            showToast('上传成功！', 'success');
            selectedFiles = [];
            previewSection.classList.remove('active');
            fileInput.value = '';
            loadGallery();
            loadStats();
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('上传失败：' + (error.message || '请重试'), 'error');
    } finally {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('upload-btn').disabled = false;
    }
}

// ===== Gallery =====
async function loadGallery() {
    var grid = document.getElementById('gallery-grid');
    var loading = document.getElementById('gallery-loading');

    loading.classList.add('active');

    try {
        var response = await fetch(API_BASE + '/api/selfies?character_id=' + (currentCharacterId || ''), { headers: authHeaders() });
        var data = await response.json();

        if (data.selfies && data.selfies.length > 0) {
            grid.innerHTML = '';
            data.selfies.forEach(function(item) {
                var div = document.createElement('div');
                div.className = 'gallery-item';
                div.innerHTML = '<img src="' + API_BASE + item.url + '" alt="selfie">' +
                    '<div class="delete-overlay">' +
                    '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    '</div>';

                var pressTimer = null;
                div.addEventListener('touchstart', function(e) {
                    pressTimer = setTimeout(function() {
                        showImageModal(item.url, item.filename);
                    }, 500);
                });
                div.addEventListener('touchend', function() { clearTimeout(pressTimer); });
                div.addEventListener('touchmove', function() { clearTimeout(pressTimer); });

                // Desktop: click to view, then delete option
                div.addEventListener('click', function() {
                    showImageModal(item.url, item.filename);
                });

                grid.appendChild(div);
            });
        } else {
            grid.innerHTML = '<div class="empty-state">' +
                '<div class="empty-state-icon">' +
                '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                '</div>' +
                '<div class="empty-state-text">还没有照片</div></div>';
        }
    } catch (error) {
        console.error('Load gallery error:', error);
        showToast('加载相册失败', 'error');
    } finally {
        loading.classList.remove('active');
    }
}

// ===== Image Modal =====
var currentModalFilename = null;

function showImageModal(url, filename) {
    currentModalFilename = filename;
    document.getElementById('modal-image').src = API_BASE + url;
    document.getElementById('image-modal').classList.add('active');
}

document.getElementById('modal-close-btn').addEventListener('click', function() {
    document.getElementById('image-modal').classList.remove('active');
    currentModalFilename = null;
});

document.getElementById('modal-delete-btn').addEventListener('click', async function() {
    if (!currentModalFilename) return;
    try {
        var response = await fetch(API_BASE + '/api/delete-selfie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ filename: currentModalFilename })
        });
        if (response.ok) {
            showToast('照片已删除', 'success');
            document.getElementById('image-modal').classList.remove('active');
            currentModalFilename = null;
            loadGallery();
            loadStats();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        showToast('删除失败', 'error');
    }
});

document.getElementById('image-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
        currentModalFilename = null;
    }
});

// ===== Chatlog Import =====
var chatlogUploadArea = document.getElementById('chatlog-upload-area');
var chatlogFileInput = document.getElementById('chatlog-file-input');
var chatlogPreviewSection = document.getElementById('chatlog-preview-section');
var chatlogPartnerInput = document.getElementById('chat-partner-input');
var selectedChatlogFile = null;

chatlogUploadArea.addEventListener('click', function() { chatlogFileInput.click(); });

chatlogUploadArea.addEventListener('dragover', function(e) { e.preventDefault(); });

chatlogUploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    var files = e.dataTransfer.files;
    if (files.length > 0) handleChatlogFile(files[0]);
});

chatlogFileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) handleChatlogFile(e.target.files[0]);
});

function handleChatlogFile(file) {
    selectedChatlogFile = file;
    document.getElementById('chatlog-filename').textContent = file.name;
    chatlogPreviewSection.classList.add('active');
}

async function analyzeChatlog() {
    if (!selectedChatlogFile) return;

    var partnerName = chatlogPartnerInput.value.trim() || '对方';

    document.getElementById('chatlog-loading').classList.add('active');
    document.getElementById('analyze-chatlog-btn').disabled = true;
    document.getElementById('chatlog-loading-text').textContent = '正在读取聊天记录...';

    try {
        var fileContent = await selectedChatlogFile.text();

        document.getElementById('chatlog-loading-text').textContent = '正在分析人物性格和关系...';

        var response = await fetch(API_BASE + '/api/analyze-chatlog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ content: fileContent, partner: partnerName })
        });

        if (!response.ok) throw new Error('Analysis failed');

        var result = await response.json();

        if (result.success) {
            showToast('已了解' + partnerName + '！', 'success');
            displayChatlogResult(partnerName, result);

            selectedChatlogFile = null;
            chatlogPreviewSection.classList.remove('active');
            chatlogFileInput.value = '';
            chatlogPartnerInput.value = '';
        } else {
            throw new Error(result.error || '分析失败');
        }
    } catch (error) {
        console.error('Chatlog analysis error:', error);
        showToast('分析失败：' + (error.message || '请重试'), 'error');
    } finally {
        document.getElementById('chatlog-loading').classList.remove('active');
        document.getElementById('analyze-chatlog-btn').disabled = false;
    }
}

function displayChatlogResult(partnerName, result) {
    var resultDiv = document.getElementById('chatlog-result');
    var contentDiv = document.getElementById('chatlog-result-content');
    var analysis = result.analysis || {};

    var html = '';
    html += '<div class="result-section"><div class="result-section-title">' + partnerName + '的性格</div>' +
        '<div class="result-section-content">' + (analysis.personality || '未知') + '</div></div>';
    html += '<div class="result-section"><div class="result-section-title">你们的关系</div>' +
        '<div class="result-section-content">' + (analysis.relationship_pattern || '未知') + '</div></div>';
    html += '<div class="result-section"><div class="result-section-title">常见话题</div>' +
        '<div class="result-section-content">' + ((analysis.common_topics || []).join('、') || '未知') + '</div></div>';
    html += '<div class="result-section"><div class="result-section-title">关心方式</div>' +
        '<div class="result-section-content">' + (analysis.care_patterns || '未知') + '</div></div>';
    html += '<div class="result-badge">分析了 ' + (result.message_count || 0) + ' 条消息</div>';

    contentDiv.innerHTML = html;
    resultDiv.classList.add('active');
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ===== Video Import =====
var videoUploadArea = document.getElementById('video-upload-area');
var videoFileInput = document.getElementById('video-file-input');
var videoPreviewSection = document.getElementById('video-preview-section');
var selectedVideoFile = null;

videoUploadArea.addEventListener('click', function() { videoFileInput.click(); });

videoFileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        selectedVideoFile = e.target.files[0];
        document.getElementById('video-filename').textContent = selectedVideoFile.name;
        var sizeMB = (selectedVideoFile.size / 1024 / 1024).toFixed(1);
        document.getElementById('video-filesize').textContent = '大小: ' + sizeMB + ' MB';
        videoPreviewSection.classList.add('active');
    }
});

async function analyzeVideo() {
    if (!selectedVideoFile) return;

    if (selectedVideoFile.size > 500 * 1024 * 1024) {
        showToast('文件太大，最大500MB', 'error');
        return;
    }

    var videoType = document.getElementById('video-type-select').value;

    document.getElementById('video-loading').classList.add('active');
    document.getElementById('analyze-video-btn').disabled = true;
    document.getElementById('video-loading-text').textContent = '正在上传视频...';

    try {
        var formData = new FormData();
        formData.append('video', selectedVideoFile);
        formData.append('type', videoType);

        document.getElementById('video-loading-text').textContent = '正在上传视频...';

        var response = await fetch(API_BASE + '/api/analyze-video', {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });

        var result = await response.json();

        if (result.success) {
            showToast(videoType + '视频分析完成！', 'success');
            displayVideoResult(videoType, result);

            selectedVideoFile = null;
            videoPreviewSection.classList.remove('active');
            videoFileInput.value = '';
        } else {
            throw new Error(result.error || '分析失败');
        }
    } catch (error) {
        console.error('Video analysis error:', error);
        showToast('分析失败：' + (error.message || '请重试'), 'error');
    } finally {
        document.getElementById('video-loading').classList.remove('active');
        document.getElementById('analyze-video-btn').disabled = false;
    }
}

function displayVideoResult(videoType, result) {
    var resultDiv = document.getElementById('video-result');
    var contentDiv = document.getElementById('video-result-content');
    var analysis = result.analysis || {};

    var html = '';
    html += '<div class="result-section"><div class="result-section-title">说话风格</div>' +
        '<div class="result-section-content">' + (analysis.speaking_style || '未知') + '</div></div>';

    var traits = analysis.personality_traits || [];
    if (traits.length) {
        html += '<div class="result-section"><div class="result-section-title">性格特点</div>' +
            '<div class="result-section-content">' + traits.map(function(t) { return '&bull; ' + t; }).join('<br>') + '</div></div>';
    }

    var catchphrases = analysis.catchphrases || [];
    if (catchphrases.length) {
        html += '<div class="result-section"><div class="result-section-title">口头禅</div>' +
            '<div class="result-section-content">' + catchphrases.join('、') + '</div></div>';
    }

    if (videoType === '剧情') {
        var dialogues = analysis.key_dialogues || [];
        if (dialogues.length) {
            html += '<div class="result-section"><div class="result-section-title">经典台词</div>' +
                '<div class="result-section-content" style="font-style:italic;">' +
                dialogues.map(function(d) { return '\u300C' + d + '\u300D'; }).join('<br>') + '</div></div>';
        }
    }

    html += '<div class="result-section"><div class="result-section-title">情感表达</div>' +
        '<div class="result-section-content">' + (analysis.emotional_expression || '未知') + '</div></div>';
    html += '<div class="result-badge">分析结果已保存，车如云会学习这些说话风格</div>';

    contentDiv.innerHTML = html;
    resultDiv.classList.add('active');
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ===== Settings / Login =====
var isLoggedIn = false;
var isAdmin = false;

// 切换登录/注册表单
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-title').textContent = '用户注册';
}

function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('auth-title').textContent = '用户登录';
}

// 用户注册
async function registerUser() {
    var username = document.getElementById('reg-username').value.trim();
    var password = document.getElementById('reg-password').value;
    var chatId = document.getElementById('reg-chatid').value.trim();

    if (!username || !password || !chatId) {
        showToast('请填写所有必填项', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('密码长度至少6位', 'error');
        return;
    }

    try {
        var resp = await fetch(API_BASE + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username, 
                password: password,
                chat_id: chatId 
            })
        });
        var result = await resp.json();

        if (result.success) {
            isLoggedIn = true;
            isAdmin = result.is_admin || false;
            authToken = result.token || '';
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('username', result.username);
            localStorage.setItem('is_admin', isAdmin ? '1' : '0');
            document.getElementById('auth-card').style.display = 'none';
            document.getElementById('welcome-banner').style.display = '';
            document.getElementById('config-area').style.display = 'block';
            showToast('注册成功！欢迎 ' + result.username, 'success');
            updateAdminUI();
            loadStats();
        } else {
            showToast(result.error || '注册失败', 'error');
        }
    } catch (e) {
        showToast('连接失败: ' + e.message, 'error');
    }
}

// 用户登录
async function loginUser() {
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;

    if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return;
    }

    try {
        var resp = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username, 
                password: password 
            })
        });
        var result = await resp.json();

        if (result.success) {
            isLoggedIn = true;
            isAdmin = result.is_admin || false;
            authToken = result.token || '';
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('username', result.username);
            localStorage.setItem('is_admin', isAdmin ? '1' : '0');
            document.getElementById('auth-card').style.display = 'none';
            document.getElementById('welcome-banner').style.display = '';
            document.getElementById('config-area').style.display = 'block';
            showToast('登录成功！欢迎回来 ' + result.username, 'success');
            updateAdminUI();
            loadStats();
        } else {
            showToast(result.error || '登录失败', 'error');
        }
    } catch (e) {
        showToast('连接失败: ' + e.message, 'error');
    }
}

async function loadCurrentConfig() {
    try {
        var resp = await fetch(API_BASE + '/api/config', { headers: authHeaders() });
        var result = await resp.json();
        if (result.success) {
            var cfg = result.config;
            document.getElementById('cfg-chatid').value = cfg.chat_id || '';
            document.getElementById('cfg-aibase').value = cfg.ai_api_base || '';
            document.getElementById('cfg-publicurl').value = cfg.public_url || '';
        }
    } catch (e) {
        console.error('加载配置失败', e);
    }
}

async function saveConfig() {
    var data = {};
    var token = document.getElementById('cfg-token').value;
    var chatid = document.getElementById('cfg-chatid').value;
    var aikey = document.getElementById('cfg-aikey').value;
    var aibase = document.getElementById('cfg-aibase').value;
    var publicurl = document.getElementById('cfg-publicurl').value;
    var newpass = document.getElementById('cfg-newpass').value;

    if (token) data.telegram_token = token;
    if (chatid) data.chat_id = chatid;
    if (aikey) data.ai_api_key = aikey;
    if (aibase) data.ai_api_base = aibase;
    if (publicurl) data.public_url = publicurl;
    if (newpass) data.admin_password = newpass;

    if (Object.keys(data).length === 0) {
        showToast('没有要保存的修改', 'info');
        return;
    }

    try {
        var resp = await fetch(API_BASE + '/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(data)
        });
        var result = await resp.json();

        if (result.success) {
            showToast(result.message || '配置已保存', 'success');
            document.getElementById('cfg-token').value = '';
            document.getElementById('cfg-aikey').value = '';
            document.getElementById('cfg-newpass').value = '';
            // 如果修改了 public_url，提示用户刷新页面
            if (publicurl) {
                showToast('服务器地址已更新，请刷新 Mini App 生效', 'success');
            }
        } else {
            showToast(result.error || '保存失败', 'error');
        }
    } catch (e) {
        showToast('保存失败', 'error');
    }
}

function logoutAdmin() {
    isLoggedIn = false;
    isAdmin = false;
    authToken = '';
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    document.getElementById('auth-card').style.display = 'block';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('welcome-banner').style.display = 'none';
    document.getElementById('config-area').style.display = 'none';
    document.getElementById('admin-config-area').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-chatid').value = '';
    showToast('已退出登录', 'info');
}

function updateAdminUI() {
    var adminArea = document.getElementById('admin-config-area');
    var statusText = document.getElementById('login-status-text');
    if (isAdmin) {
        adminArea.style.display = 'block';
        statusText.textContent = '已登录为管理员';
    } else {
        adminArea.style.display = 'none';
        statusText.textContent = '已登录';
    }
}

// ===== Skills Management =====
async function loadSkills() {
    var listDiv = document.getElementById('skills-list');
    var loadingDiv = document.getElementById('skills-loading');

    loadingDiv.classList.add('active');
    listDiv.innerHTML = '';

    try {
        var resp = await fetch(API_BASE + '/api/skills?character_id=' + (currentCharacterId || ''), { headers: authHeaders() });
        var data = await resp.json();

        var skills = data.skills || [];

        if (skills.length === 0) {
            listDiv.innerHTML = '<div class="skills-empty">' +
                '<div class="skills-empty-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
                '</div>' +
                '<div class="skills-empty-text">还没有安装任何技能</div></div>';
            loadingDiv.classList.remove('active');
            return;
        }

        // Group by category
        var grouped = {};
        skills.forEach(function(skill) {
            var cat = skill.category || '其他';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(skill);
        });

        var html = '';
        var categories = Object.keys(grouped).sort();
        categories.forEach(function(cat) {
            html += '<div class="skill-category-title">' + escapeHtml(cat) + '</div>';
            grouped[cat].forEach(function(skill) {
                var skillId = skill.id || skill.name || '';
                var skillName = skill.name || '未知技能';
                var skillDesc = skill.description || skill.desc || '';
                var skillVersion = skill.version ? 'v' + skill.version : '';
                var enabled = skill.enabled !== false;

                html += '<div class="skill-card">';
                html += '  <div class="skill-card-header">';
                html += '    <div class="skill-card-info">';
                html += '      <div class="skill-card-name">';
                html += '        ' + escapeHtml(skillName);
                if (skillVersion) {
                    html += '        <span class="skill-version">' + escapeHtml(skillVersion) + '</span>';
                }
                html += '      </div>';
                if (skillDesc) {
                    html += '    <div class="skill-card-desc" title="' + escapeHtml(skillDesc) + '">' + escapeHtml(skillDesc) + '</div>';
                }
                html += '    </div>';
                html += '    <div class="skill-card-actions">';
                if (isAdmin) {
                    html += '      <label class="toggle-switch">';
                    html += '        <input type="checkbox"' + (enabled ? ' checked' : '') + ' onchange="toggleSkill(\'' + escapeJs(skillId) + '\', this.checked)">';
                    html += '        <span class="toggle-slider"></span>';
                    html += '      </label>';
                    html += '      <button class="btn-uninstall" onclick="uninstallSkill(\'' + escapeJs(skillId) + '\')">卸载</button>';
                } else {
                    html += '      <span style="font-size:0.8rem;color:' + (enabled ? 'var(--success)' : 'var(--text-muted)') + '">' + (enabled ? '已启用' : '已禁用') + '</span>';
                }
                html += '    </div>';
                html += '  </div>';
                html += '</div>';
            });
        });

        listDiv.innerHTML = html;
    } catch (error) {
        console.error('Load skills error:', error);
        listDiv.innerHTML = '<div class="skills-empty">' +
            '<div class="skills-empty-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
            '</div>' +
            '<div class="skills-empty-text">加载失败: ' + escapeHtml(error.message) + '</div></div>';
    } finally {
        loadingDiv.classList.remove('active');
    }
}

async function toggleSkill(skillId, enabled) {
    try {
        var resp = await fetch(API_BASE + '/api/skills/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ skill_id: skillId, enabled: enabled, character_id: currentCharacterId })
        });
        var result = await resp.json();
        if (result.success) {
            showToast(enabled ? '已启用' : '已禁用', 'success');
        } else {
            showToast(result.error || '操作失败', 'error');
            loadSkills();
        }
    } catch (error) {
        console.error('Toggle skill error:', error);
        showToast('操作失败', 'error');
        loadSkills();
    }
}

async function installSkillFromInput() {
    var input = document.getElementById('skill-name-input');
    var btn = document.getElementById('install-skill-btn');
    var skillName = input.value.trim();

    if (!skillName) {
        showToast('请输入技能名称', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '安装中...';

    try {
        var resp = await fetch(API_BASE + '/api/skills/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ skill_name: skillName })
        });
        var result = await resp.json();

        if (result.success) {
            showToast('已安装: ' + skillName, 'success');
            input.value = '';
            loadSkills();
        } else {
            showToast(result.error || '安装失败', 'error');
        }
    } catch (error) {
        console.error('Install skill error:', error);
        showToast('安装失败，请检查网络', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '安装';
    }
}

async function uninstallSkill(skillId) {
    if (!confirm('确定要卸载这个技能吗？')) return;

    try {
        var resp = await fetch(API_BASE + '/api/skills/uninstall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ skill_id: skillId })
        });
        var result = await resp.json();

        if (result.success) {
            showToast('已卸载', 'success');
            loadSkills();
        } else {
            showToast(result.error || '卸载失败', 'error');
        }
    } catch (error) {
        console.error('Uninstall skill error:', error);
        showToast('卸载失败', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeJs(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Allow Enter key to trigger install
document.getElementById('skill-name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        installSkillFromInput();
    }
});

// ===== Quota Monitoring =====
async function loadQuota() {
    var loadingDiv = document.getElementById('quota-loading');
    var errorDiv = document.getElementById('quota-error');
    var contentDiv = document.getElementById('quota-content');

    // Set current month
    var now = new Date();
    var monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    document.getElementById('quota-month').textContent = now.getFullYear() + '年' + monthNames[now.getMonth()];

    loadingDiv.classList.add('active');
    errorDiv.classList.remove('active');
    contentDiv.style.display = 'none';

    try {
        var response = await fetch(API_BASE + '/api/quota', { headers: authHeaders() });
        var data = await response.json();

        if (!data.success) throw new Error(data.error || 'API error');

        loadingDiv.classList.remove('active');
        contentDiv.style.display = 'block';

        // Parse items array from API
        var items = data.items || [];
        var itemMap = {};
        items.forEach(function(item) { itemMap[item.name] = item; });

        // API Requests
        var apiItem = itemMap['API 请求'] || {};
        updateQuotaCard('api', apiItem.used || 0, apiItem.limit || 1, function(v, l) {
            return v.toLocaleString() + ' <span>/ ' + l.toLocaleString() + '</span>';
        });

        // CPU
        var cpuItem = itemMap['CPU 用量'] || {};
        updateQuotaCard('cpu', cpuItem.used || 0, cpuItem.limit || 1, function(v, l) {
            return v.toLocaleString() + ' <span>' + (cpuItem.unit || '') + ' / ' + l.toLocaleString() + (cpuItem.unit || '') + '</span>';
        });

        // Memory
        var memItem = itemMap['内存用量'] || {};
        updateQuotaCard('mem', memItem.used || 0, memItem.limit || 1, function(v, l) {
            return v.toLocaleString() + ' <span>' + (memItem.unit || '') + ' / ' + l.toLocaleString() + (memItem.unit || '') + '</span>';
        });

        // Network
        var netItem = itemMap['网络流量'] || {};
        updateQuotaCard('net', netItem.used || 0, netItem.limit || 1, function(v, l) {
            return v + ' <span>' + (netItem.unit || '') + ' / ' + l + (netItem.unit || '') + '</span>';
        });

        // AI requests count
        document.getElementById('quota-ai-count').innerHTML = (data.ai_requests || 0) + ' <span>次</span>';
        document.getElementById('quota-img-count').innerHTML = (data.image_generations || 0) + ' <span>次</span>';

        // Overall status
        var statusEl = document.getElementById('quota-overall-status');
        if (statusEl) {
            var statusMap = { ok: '✅ 运行正常', warning: '⚠️ 额度偏高', critical: '🔴 即将耗尽', shutdown: '🚫 已停止' };
            statusEl.textContent = statusMap[data.status] || statusMap['ok'];
            statusEl.className = 'quota-overall-status ' + (data.status || 'ok');
        }

    } catch (error) {
        console.error('Load quota error:', error);
        loadingDiv.classList.remove('active');
        errorDiv.querySelector('.quota-error-text').textContent = '无法加载额度信息: ' + (error.message || '未知错误');
        errorDiv.classList.add('active');
    }
}

function updateQuotaCard(id, used, limit, formatFn) {
    var percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    var status = 'ok';
    if (percent >= 80) status = 'critical';
    else if (percent >= 60) status = 'warning';

    var statusText = { ok: '正常', warning: '警告', critical: '危险' };

    var bar = document.getElementById('quota-' + id + '-bar');
    var valueEl = document.getElementById('quota-' + id + '-value');
    var statusEl = document.getElementById('quota-' + id + '-status');

    // Animate bar
    setTimeout(function() {
        bar.style.width = percent.toFixed(1) + '%';
    }, 100);

    bar.className = 'quota-progress-bar ' + status;
    valueEl.innerHTML = formatFn(used, limit);
    statusEl.className = 'quota-status ' + status;
    statusEl.innerHTML = '<div class="quota-status-dot"></div>' + statusText[status];
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    i = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ===== Character System =====
async function loadCharacters() {
    var listDiv = document.getElementById('character-list');
    listDiv.innerHTML = '<div class="character-loading">加载中...</div>';
    
    try {
        var resp = await fetch(API_BASE + '/api/characters', { headers: authHeaders() });
        var data = await resp.json();
        
        if (!data.success) throw new Error(data.error);
        
        var characters = data.characters || [];
        var current = data.current;
        
        currentCharacterId = current || '';
        
        if (characters.length === 0) {
            listDiv.innerHTML = '<div class="character-loading">暂无可用角色</div>';
            return;
        }
        
        var html = '';
        characters.forEach(function(char) {
            var isActive = char.id === current;
            var initial = char.name ? char.name.charAt(0) : '?';
            
            html += '<div class="character-item' + (isActive ? ' active' : '') + '" onclick="switchCharacter(\'' + char.id + '\')">';
            html += '  <div class="character-avatar" style="background: ' + (char.theme_color || 'var(--gradient-purple)') + '">' + initial + '</div>';
            html += '  <div class="character-info">';
            html += '    <div class="character-name">' + escapeHtml(char.name) + '</div>';
            html += '    <div class="character-source">' + escapeHtml(char.source || '自定义角色') + '</div>';
            html += '  </div>';
            if (isActive) {
                html += '  <svg class="character-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            }
            html += '</div>';
        });
        
        listDiv.innerHTML = html;
    } catch (error) {
        console.error('Load characters error:', error);
        listDiv.innerHTML = '<div class="character-loading">加载失败: ' + escapeHtml(error.message) + '</div>';
    }
}

async function switchCharacter(characterId) {
    try {
        var resp = await fetch(API_BASE + '/api/characters/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ character_id: characterId })
        });
        var result = await resp.json();
        
        if (result.success) {
            showToast('已切换到: ' + (result.character?.name || characterId), 'success');
            loadCharacters(); // 刷新列表
        } else {
            showToast(result.error || '切换失败', 'error');
        }
    } catch (error) {
        console.error('Switch character error:', error);
        showToast('切换失败', 'error');
    }
}

// ===== Init =====
// 检查是否已登录（从 localStorage 恢复会话）
function checkAutoLogin() {
    var savedToken = localStorage.getItem('auth_token');
    var savedUsername = localStorage.getItem('username');
    var savedAdmin = localStorage.getItem('is_admin');
    
    if (savedToken && savedUsername) {
        isAdmin = savedAdmin === '1';
        // 验证 token 是否有效
        authToken = savedToken;
        fetch(API_BASE + '/api/stats', { headers: authHeaders() })
            .then(function(resp) {
                if (resp.ok) {
                    isLoggedIn = true;
                    document.getElementById('auth-card').style.display = 'none';
                    document.getElementById('welcome-banner').style.display = '';
                    document.getElementById('config-area').style.display = 'block';
                    showToast('欢迎回来 ' + savedUsername, 'success');
                    updateAdminUI();
                    loadStats();
                } else {
                    // Token 无效，清除本地存储
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('username');
                    localStorage.removeItem('is_admin');
                    authToken = '';
                    isAdmin = false;
                }
            })
            .catch(function() {
                // 网络错误，保留 token 稍后重试
            });
    }
}

checkAutoLogin();

// ===== Farm Game Functions =====
var farmData = null;
var cropTypes = null;
var selectedSeed = null;

function loadFarm() {
    if (!isLoggedIn) return;
    
    fetch(API_BASE + '/api/game/farm', { headers: authHeaders() })
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            if (data.success) {
                farmData = data.farm;
                cropTypes = data.crop_types;
                renderFarm();
                renderSeedShop();
                renderInventory(data.inventory);
                updateFarmUI();
            } else {
                console.error('加载农场失败:', data.error);
            }
        })
        .catch(function(e) {
            console.error('农场API错误:', e);
        });
    
    // 加载角色位置
    loadCharacterLocation();
}

function loadCharacterLocation() {
    fetch(API_BASE + '/api/game/character/location', { headers: authHeaders() })
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            if (data.success) {
                var loc = data.location;
                var locText = loc ? '📍 ' + (loc.location || '未知') + ' - ' + (loc.activity || '') : '📍 不在';
                document.getElementById('character-location').textContent = locText;
                
                // 更新亲密度
                if (data.relationship) {
                    var hearts = data.relationship.hearts || 0;
                    var heartStr = '';
                    for (var i = 0; i < 10; i++) {
                        heartStr += i < hearts ? '❤️' : '♡';
                    }
                    document.getElementById('character-hearts').textContent = heartStr;
                }
            }
        });
}

function renderFarm() {
    var grid = document.getElementById('farm-grid');
    grid.innerHTML = '';
    
    // 6x4 网格
    for (var y = 0; y < 4; y++) {
        for (var x = 0; x < 6; x++) {
            var tile = document.createElement('div');
            tile.className = 'farm-tile';
            tile.dataset.x = x;
            tile.dataset.y = y;
            tile.onclick = function() { onTileClick(this); };
            
            // 检查是否有作物
            var crop = findCrop(x, y);
            if (crop) {
                var cropInfo = getCropInfo(crop.crop_type);
                var emoji = cropInfo ? cropInfo.emoji : '🌱';
                var stage = crop.growth_stage || 0;
                
                // 添加生长阶段样式
                tile.classList.add('has-crop');
                tile.classList.add('crop-stage-' + stage);
                
                // 根据阶段显示不同大小
                var stageEmojis = {
                    0: '·',      // 种子 - 小点
                    1: '🌱',     // 发芽
                    2: '🌿',     // 生长
                    3: emoji     // 成熟 - 显示实际作物
                };
                
                tile.textContent = stageEmojis[stage] || emoji;
                
                if (crop.is_harvestable) {
                    tile.classList.add('ready');
                    tile.textContent = emoji; // 成熟显示实际作物
                }
            } else {
                tile.classList.add('empty');
            }
            
            grid.appendChild(tile);
        }
    }
    
    // 更新天气效果
    updateSceneWeather();
}

function findCrop(x, y) {
    if (!farmData || !farmData.crops) return null;
    for (var i = 0; i < farmData.crops.length; i++) {
        if (farmData.crops[i].tile_x == x && farmData.crops[i].tile_y == y) {
            return farmData.crops[i];
        }
    }
    return null;
}

function getCropInfo(cropType) {
    if (!cropTypes) return null;
    for (var i = 0; i < cropTypes.length; i++) {
        if (cropTypes[i].id == cropType) return cropTypes[i];
    }
    return null;
}

function onTileClick(tile) {
    var x = parseInt(tile.dataset.x);
    var y = parseInt(tile.dataset.y);
    var crop = findCrop(x, y);
    
    if (crop && crop.is_harvestable) {
        // 收获
        harvestCrop(x, y);
    } else if (!crop && selectedSeed) {
        // 种植
        plantCrop(x, y, selectedSeed);
    } else if (!crop) {
        showToast('请先在商店选择种子', 'info');
    }
}

function plantCrop(x, y, cropType) {
    fetch(API_BASE + '/api/game/plant', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ x: x, y: y, crop_type: cropType })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('种下了！', 'success');
            loadFarm();
        } else {
            showToast(data.error || '种植失败', 'error');
        }
    });
}

function harvestCrop(x, y) {
    fetch(API_BASE + '/api/game/harvest', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ x: x, y: y })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('收获 ' + data.emoji + ' ' + data.crop_name, 'success');
            loadFarm();
        } else {
            showToast(data.error || '收获失败', 'error');
        }
    });
}

function renderSeedShop() {
    var shop = document.getElementById('seed-shop');
    shop.innerHTML = '';
    
    if (!cropTypes) return;
    
    cropTypes.forEach(function(crop) {
        var item = document.createElement('div');
        item.className = 'shop-item';
        item.onclick = function() { buySeed(crop.id); };
        item.innerHTML = 
            '<div style="font-size:1.5rem">' + crop.emoji + '</div>' +
            '<div style="font-size:0.7rem;margin-top:4px">' + crop.name + '</div>' +
            '<div style="font-size:0.7rem;color:var(--warning)">💰' + crop.seed_price + '</div>';
        shop.appendChild(item);
    });
}

function buySeed(cropType) {
    fetch(API_BASE + '/api/game/buy-seed', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ crop_type: cropType, quantity: 1 })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('购买成功！点击农田种植', 'success');
            selectedSeed = cropType;
            loadFarm();
        } else {
            showToast(data.error || '购买失败', 'error');
        }
    });
}

function renderInventory(items) {
    var inv = document.getElementById('inventory');
    
    if (!items || items.length == 0) {
        inv.innerHTML = '<div style="text-align: center; color: var(--text-muted); grid-column: span 4; font-size: 0.85rem;">空空如也</div>';
        return;
    }
    
    inv.innerHTML = '';
    items.forEach(function(item) {
        var div = document.createElement('div');
        div.className = 'inventory-item';
        
        var cropInfo = getCropInfo(item.item_id);
        var emoji = cropInfo ? cropInfo.emoji : '📦';
        var name = cropInfo ? cropInfo.name : item.item_id;
        
        div.innerHTML = 
            '<div style="font-size:1.2rem">' + emoji + '</div>' +
            '<div style="font-size:0.65rem">' + name + '</div>' +
            '<div style="font-size:0.65rem;color:var(--text-muted)">x' + item.quantity + '</div>';
        
        // 点击出售
        div.onclick = function() { sellCrop(item.item_id, item.quantity); };
        inv.appendChild(div);
    });
}

function sellCrop(cropType, quantity) {
    if (!confirm('出售这个作物？')) return;
    
    fetch(API_BASE + '/api/game/sell', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ crop_type: cropType, quantity: 1 })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message, 'success');
            loadFarm();
        } else {
            showToast(data.error || '出售失败', 'error');
        }
    });
}

function updateFarmUI() {
    if (farmData) {
        document.getElementById('farm-name').textContent = farmData.farm_name || '我的农场';
        document.getElementById('farm-money').textContent = '💰 ' + (farmData.money || 0);
    }
}

function refreshFarm() {
    showToast('刷新中...', 'info');
    loadFarm();
}

// ===== Game Chat Functions =====
function sendGameChat() {
    var input = document.getElementById('game-chat-input');
    var message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    
    // 显示用户消息
    var chatBox = document.getElementById('game-chat-box');
    chatBox.innerHTML += '<div style="text-align:right;margin:4px 0;"><span style="background:var(--gradient-purple);color:white;padding:6px 12px;border-radius:12px;display:inline-block;font-size:0.85rem;">' + escapeHtml(message) + '</span></div>';
    chatBox.innerHTML += '<div id="chat-loading" style="text-align:center;color:var(--text-muted);font-size:0.8rem;">...</div>';
    chatBox.scrollTop = chatBox.scrollHeight;
    
    fetch(API_BASE + '/api/game/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: message })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        // 移除加载提示
        var loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        
        if (data.success) {
            chatBox.innerHTML += '<div style="margin:4px 0;"><span style="background:var(--card-bg);padding:6px 12px;border-radius:12px;display:inline-block;font-size:0.85rem;box-shadow:2px 2px 4px var(--shadow-color);">' + escapeHtml(data.response) + '</span></div>';
            
            // 更新亲密度
            loadCharacterLocation();
        } else {
            chatBox.innerHTML += '<div style="color:#F44336;font-size:0.8rem;">...（沉默）</div>';
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(function() {
        var loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        chatBox.innerHTML += '<div style="color:#F44336;font-size:0.8rem;">...网络问题。</div>';
    });
}

// 回车发送
document.addEventListener('keydown', function(e) {
    if (e.target.id === 'game-chat-input' && e.key === 'Enter') {
        sendGameChat();
    }
});

// ===== Gift Functions =====
function renderGiftArea(items) {
    var giftArea = document.getElementById('gift-area');
    
    if (!items || items.length == 0) {
        giftArea.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">收获作物后可以送给车如云</div>';
        return;
    }
    
    giftArea.innerHTML = '';
    var giftItems = items.filter(function(item) { return item.item_type === 'crop'; });
    
    if (giftItems.length == 0) {
        giftArea.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">没有可以送的作物</div>';
        return;
    }
    
    giftItems.forEach(function(item) {
        var cropInfo = getCropInfo(item.item_id);
        var emoji = cropInfo ? cropInfo.emoji : '📦';
        var name = cropInfo ? cropInfo.name : item.item_id;
        
        var div = document.createElement('div');
        div.className = 'shop-item';
        div.style.display = 'inline-block';
        div.style.margin = '4px';
        div.style.verticalAlign = 'top';
        div.innerHTML = 
            '<div style="font-size:1.2rem">' + emoji + '</div>' +
            '<div style="font-size:0.65rem">' + name + '</div>' +
            '<div style="font-size:0.6rem;color:var(--text-muted)">x' + item.quantity + '</div>' +
            '<div style="font-size:0.6rem;color:var(--success)">送出</div>';
        
        div.onclick = function() { sendGift(item.item_type, item.item_id); };
        giftArea.appendChild(div);
    });
}

function sendGift(itemType, itemId) {
    fetch(API_BASE + '/api/game/gift', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ item_type: itemType, item_id: itemId })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            var reactionEmoji = {love: '😍', like: '😊', neutral: '😐', dislike: '😕', hate: '😤'};
            var emoji = reactionEmoji[data.reaction] || '😐';
            showToast(emoji + ' ' + data.response, 'success');
            loadFarm();
        } else {
            showToast(data.error || '送礼失败', 'error');
        }
    });
}

// 更新 renderInventory 调用 renderGiftArea
var _origRenderInventory = renderInventory;
renderInventory = function(items) {
    _origRenderInventory(items);
    renderGiftArea(items);
};

// ===== Heart Event Functions =====
function checkHeartEvents() {
    if (!isLoggedIn) return;
    
    fetch(API_BASE + '/api/game/events/heart', { headers: authHeaders() })
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            var hint = document.getElementById('event-hint');
            if (data.success && data.events && data.events.length > 0) {
                // 显示事件提示
                if (hint) hint.style.display = 'block';
                // 自动弹出第一个事件
                showHeartEvent(data.events[0]);
            } else {
                if (hint) hint.style.display = 'none';
            }
        });
}

function showHeartEvent(event) {
    var modal = document.getElementById('heart-event-modal');
    document.getElementById('event-title').textContent = '💕 ' + (event.title || '心级事件');
    document.getElementById('event-description').textContent = event.description || '';
    document.getElementById('event-dialogue').innerHTML = '<div style="text-align:center;color:var(--text-muted);">加载中...</div>';
    document.getElementById('event-rewards').textContent = '';
    
    modal.style.display = 'flex';
    
    // 触发事件
    fetch(API_BASE + '/api/game/events/trigger', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ event_id: event.id })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            var evt = data.event;
            var dialogueHtml = '';
            
            if (evt.dialogue && evt.dialogue.length > 0) {
                evt.dialogue.forEach(function(line) {
                    var isPlayer = line.speaker !== 'chayewoon';
                    var align = isPlayer ? 'right' : 'left';
                    var bgColor = isPlayer ? 'var(--gradient-purple)' : 'var(--card-bg)';
                    var textColor = isPlayer ? 'white' : 'var(--text)';
                    var name = isPlayer ? '学长' : '车如云';
                    dialogueHtml += '<div style="text-align:' + align + ';margin:6px 0;">';
                    dialogueHtml += '<div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px;">' + name + '</div>';
                    dialogueHtml += '<span style="background:' + bgColor + ';color:' + textColor + ';padding:8px 12px;border-radius:12px;display:inline-block;font-size:0.85rem;max-width:80%;">' + escapeHtml(line.text) + '</span>';
                    dialogueHtml += '</div>';
                });
            }
            
            document.getElementById('event-dialogue').innerHTML = dialogueHtml;
            
            // 显示奖励
            var rewards = evt.rewards || {};
            var rewardText = [];
            if (rewards.hearts) rewardText.push('❤️ +' + rewards.hearts + ' 亲密度');
            if (rewards.item) rewardText.push('🎁 ' + rewards.item);
            if (rewardText.length > 0) {
                document.getElementById('event-rewards').textContent = rewardText.join('  ');
            }
            
            // 更新亲密度显示
            if (data.relationship) {
                var hearts = data.relationship.hearts || 0;
                var heartStr = '';
                for (var i = 0; i < 10; i++) {
                    heartStr += i < hearts ? '❤️' : '♡';
                }
                document.getElementById('character-hearts').textContent = heartStr;
            }
        }
    });
}

function closeEventModal() {
    document.getElementById('heart-event-modal').style.display = 'none';
}

// ===== Weather System =====
var currentWeather = 'sunny';
var weatherEmojis = { sunny: '☀️', rainy: '🌧️', cloudy: '☁️', snowy: '❄️', windy: '💨' };
var weatherNames = { sunny: '晴天', rainy: '雨天', cloudy: '多云', snowy: '下雪', windy: '大风' };

function updateWeather() {
    // 简单天气系统（基于时间的伪随机，每天变化）
    var hour = new Date().getHours();
    var day = new Date().getDate();
    var seed = (day * 31 + Math.floor(hour / 6)) % 100;
    
    if (seed < 55) currentWeather = 'sunny';
    else if (seed < 70) currentWeather = 'cloudy';
    else if (seed < 82) currentWeather = 'rainy';
    else if (seed < 90) currentWeather = 'windy';
    else currentWeather = 'rainy';
    
    // 更新天气图标
    var weatherIcon = document.getElementById('weather-icon');
    var weatherName = document.getElementById('weather-name');
    if (weatherIcon) weatherIcon.textContent = weatherEmojis[currentWeather] || '☀️';
    if (weatherName) weatherName.textContent = weatherNames[currentWeather] || '晴天';
}

function updateSceneWeather() {
    var scene = document.getElementById('farm-scene');
    if (!scene) return;
    
    // 移除旧天气类
    scene.classList.remove('weather-rainy');
    
    // 根据天气添加效果
    if (currentWeather === 'rainy') {
        scene.classList.add('weather-rainy');
    }
}

// ===== Daily Reward Functions =====
function checkDailyStatus() {
    if (!isLoggedIn) return;
    
    fetch(API_BASE + '/api/game/daily/check', { headers: authHeaders() })
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            var btn = document.getElementById('daily-btn');
            if (data.success && data.claimed) {
                btn.textContent = '✅ 已签到';
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            }
        });
}

function claimDaily() {
    fetch(API_BASE + '/api/game/daily/claim', {
        method: 'POST',
        headers: authHeaders()
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message, 'success');
            var btn = document.getElementById('daily-btn');
            btn.textContent = '✅ 已签到';
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            loadFarm(); // 刷新金币
        } else {
            showToast(data.message || '签到失败', 'error');
        }
    });
}

// ===== Cooking Functions =====
function loadRecipes() {
    if (!isLoggedIn) return;
    
    fetch(API_BASE + '/api/game/recipes', { headers: authHeaders() })
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            if (data.success) {
                renderRecipes(data.recipes);
            }
        });
}

function renderRecipes(recipes) {
    var list = document.getElementById('recipe-list');
    if (!recipes || recipes.length == 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-muted);grid-column:span 2;font-size:0.85rem;">暂无配方</div>';
        return;
    }
    
    list.innerHTML = '';
    recipes.forEach(function(r) {
        var div = document.createElement('div');
        div.className = 'shop-item';
        div.style.opacity = r.can_cook ? '1' : '0.5';
        
        // 解析材料
        var ingText = '';
        try {
            var ings = JSON.parse(r.ingredients);
            ingText = ings.map(function(i) { return getCropInfo(i.crop) ? getCropInfo(i.crop).emoji + 'x' + i.qty : i.crop; }).join(' ');
        } catch(e) {}
        
        div.innerHTML = 
            '<div style="font-size:1.3rem">' + r.emoji + '</div>' +
            '<div style="font-size:0.7rem;font-weight:600">' + r.name + '</div>' +
            '<div style="font-size:0.6rem;color:var(--text-muted)">' + ingText + '</div>' +
            (r.can_cook ? '<div style="font-size:0.6rem;color:var(--success)">可烹饪</div>' : '<div style="font-size:0.6rem;color:#F44336">材料不足</div>');
        
        if (r.can_cook) {
            div.onclick = function() { cookRecipe(r.id); };
        }
        
        list.appendChild(div);
    });
}

function cookRecipe(recipeId) {
    fetch(API_BASE + '/api/game/cook', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ recipe_id: recipeId })
    })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
        if (data.success) {
            showToast(data.message, 'success');
            loadFarm();
            loadRecipes();
        } else {
            showToast(data.error || '烹饪失败', 'error');
        }
    });
}

// 在 loadFarm 中调用天气和事件检查
var _origLoadFarm = loadFarm;
loadFarm = function() {
    _origLoadFarm();
    updateWeather();
    checkHeartEvents();
    checkDailyStatus();
    loadRecipes();
};

// 页面切换时加载农场
var originalSwitchPage = switchPage;
switchPage = function(page) {
    originalSwitchPage(page);
    if (page == 'farm') {
        loadFarm();
        // 每30秒自动刷新（更新作物生长）
        if (window._farmAutoRefresh) clearInterval(window._farmAutoRefresh);
        window._farmAutoRefresh = setInterval(function() {
            if (document.getElementById('page-farm').style.display !== 'none') {
                loadFarm();
            } else {
                clearInterval(window._farmAutoRefresh);
            }
        }, 30000);
    }
};
// ===== Game Page Integration =====
var gameInstance = null;
var gameInitialized = false;

function initGameIfNeeded() {
    if (gameInitialized) {
        if (gameInstance) gameInstance.resize();
        return;
    }
    
    // 延迟两帧确保 DOM 已完全渲染（页面 display:flex 后才有尺寸）
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            try {
                gameInstance = new Game('game-canvas');
                gameInitialized = true;

                // 保险：再 resize 一次确保尺寸正确
                setTimeout(function() {
                    if (gameInstance) gameInstance.resize();
                }, 100);

                // 场景名称映射
            var sceneNames = { farm: '🌾 农场', rooftop: '🌆 天台', cafe: '☕ 咖啡厅' };
            var sceneLabel = document.getElementById('game-scene-label');
            
            // 场景切换回调
            gameInstance.onSceneChange(function(sceneName) {
                if (sceneLabel) {
                    sceneLabel.textContent = sceneNames[sceneName] || sceneName;
                }
            });
            
            // NPC 交互回调
            gameInstance.onInteract(function(npcName) {
                console.log('[Game] 与 ' + npcName + ' 交互');
            });
            
            // 种植回调
            gameInstance.onPlant(function(data) {
                console.log('[Game] 种植:', data);
                fetch(API_BASE + '/api/game/plant', {
                    method: 'POST',
                    headers: Object.assign({}, authHeaders(), { 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ x: data.x, y: data.y, crop_type: data.seedId })
                }).catch(function() {});
            });
            
            // 收获回调
            gameInstance.onHarvest(function(data) {
                console.log('[Game] 收获:', data);
                fetch(API_BASE + '/api/game/harvest', {
                    method: 'POST',
                    headers: Object.assign({}, authHeaders(), { 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ x: data.x, y: data.y })
                }).then(function(r) { return r.json(); })
                .then(function(result) {
                    if (result.success) {
                        loadGameData(); // 刷新金币
                    }
                }).catch(function() {});
            });
            
            // 加载游戏数据
            loadGameData();
            
            console.log('[Game] 初始化完成');
        } catch (e) {
            console.error('[Game] 初始化失败:', e);
            var container = document.getElementById('game-container');
            if (container) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;padding:20px;text-align:center;"><div><p style="font-size:48px;margin-bottom:12px;">🎮</p><p>游戏加载失败</p><p style="font-size:12px;color:#999;margin-top:8px;">' + e.message + '</p></div></div>';
            }
        }
        });
    });
}

function loadGameData() {
    // 从后端加载玩家数据更新 HUD
    fetch(API_BASE + '/api/game/farm', { headers: authHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success && data.farm) {
                var goldEl = document.getElementById('game-gold');
                if (goldEl) goldEl.textContent = data.farm.money || 0;
            }
        })
        .catch(function() {});
    
    fetch(API_BASE + '/api/game/relationship', { headers: authHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success && data.relationship) {
                var heartsEl = document.getElementById('game-hearts');
                if (heartsEl) heartsEl.textContent = data.relationship.hearts || 0;
            }
        })
        .catch(function() {});
}
</script>
