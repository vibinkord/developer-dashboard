const API_BASE = 'https://9c361e9itb.execute-api.us-east-1.amazonaws.com/dev';

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function formatDuration(sec) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatReview(text) {
    let output = escapeHtml(text);
    output = output.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, _lang, code) => `<pre>${code.trim()}</pre>`);
    output = output.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    output = output.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/^###?\s+(.+)$/gm, '<h3>$1</h3>');
    output = output.replace(/^(\d+\.\s+[A-Z][^\n]*?)$/gm, '<h3>$1</h3>');
    output = output.replace(/\n{2,}/g, '</p><p>');
    output = output.replace(/\n/g, '<br>');
    return `<p>${output}</p>`;
}

function getStoredUser() {
    const rawUser = localStorage.getItem('developerUser');
    if (!rawUser) {
        return null;
    }

    try {
        return JSON.parse(rawUser);
    } catch (error) {
        console.error('Unable to parse developerUser', error);
        return null;
    }
}

function isLoggedIn() {
    return localStorage.getItem('loggedIn') === 'true';
}

function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('developerUser');
    window.location.href = 'login.html';
}

function setStatusMessage(container, message, kind = 'loading') {
    if (!container) {
        return;
    }

    const className = kind === 'error' ? 'error-message' : 'loading';
    container.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
}
function setLoading(elId, btnId, label) {
    const button = document.getElementById(btnId);
    const target = document.getElementById(elId);

    if (button) {
        button.disabled = true;
    }

    if (target) {
        target.innerHTML = `
            <div class="status-msg">
                <span class="ascii-loader">[ &gt;&gt;&gt; ]</span>
                <span>${escapeHtml(label)}</span>
            </div>`;
    }
}

function setError(elId, btnId, msg) {
    const button = document.getElementById(btnId);
    const target = document.getElementById(elId);

    if (button) {
        button.disabled = false;
    }

    if (target) {
        target.innerHTML = `
            <div class="status-msg error">
                <span>ERR //</span>
                <span>${escapeHtml(msg)}</span>
            </div>`;
    }
}

function clearLoading(btnId) {
    const button = document.getElementById(btnId);
    if (button) {
        button.disabled = false;
    }
}

function tickClock() {
    const clock = document.getElementById('clock');
    if (!clock) {
        return;
    }

    const date = new Date();
    const time = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
        .map(number => String(number).padStart(2, '0'))
        .join(':');

    clock.textContent = `${time} UTC`;
}

function initClock() {
    if (!document.getElementById('clock')) {
        return;
    }

    tickClock();
    setInterval(tickClock, 1000);
}

function syncEditor() {
    const codeInput = document.getElementById('codeInput');
    const lineGutter = document.getElementById('lineGutter');
    const codeStats = document.getElementById('codeStats');

    if (!codeInput || !lineGutter || !codeStats) {
        return;
    }

    const lines = codeInput.value.split('\n').length || 1;
    lineGutter.textContent = Array.from({ length: lines }, (_, index) => index + 1).join('\n');
    codeStats.textContent = `${lines} line${lines === 1 ? '' : 's'} \u00b7 ${codeInput.value.length} chars`;
}

function initCodeWorkbench() {
    const codeInput = document.getElementById('codeInput');
    const lineGutter = document.getElementById('lineGutter');

    if (!codeInput || !lineGutter) {
        return;
    }

    codeInput.addEventListener('input', syncEditor);
    codeInput.addEventListener('scroll', () => {
        lineGutter.scrollTop = codeInput.scrollTop;
    });

    codeInput.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            reviewCode();
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            const start = codeInput.selectionStart;
            const end = codeInput.selectionEnd;
            codeInput.value = `${codeInput.value.substring(0, start)}    ${codeInput.value.substring(end)}`;
            codeInput.selectionStart = codeInput.selectionEnd = start + 4;
            syncEditor();
        }
    });

    syncEditor();
}

function renderDeveloperScan(containerId, data, options = {}) {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    const github = data.github || {};
    const leetcode = data.leetcode || {};
    const codeforces = data.codeforces || {};
    const persona = Array.isArray(data.persona) ? data.persona : [];
    const githubUsername = github.username || options.github || '';
    const githubProfile = github.profile || github.profile_url || (githubUsername ? `https://github.com/${encodeURIComponent(githubUsername)}` : '#');
    const avatarUrl = github.avatar || (githubUsername ? `https://github.com/${encodeURIComponent(githubUsername)}.png?size=240` : '');

    container.innerHTML = `
        <div class="scan-card ${options.compact ? 'scan-card-compact' : ''}">
            <div class="scan-top">
                <div class="scan-avatar">
                    <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(github.name || githubUsername || 'Developer')}" onerror="this.style.display='none'">
                </div>
                <div class="scan-copy">
                    <div class="scan-kicker">${escapeHtml(options.kicker || 'developer intelligence')}</div>
                    <div class="scan-name">${escapeHtml(github.name || options.title || 'Developer')}</div>
                    <div class="scan-username">@${escapeHtml(githubUsername || 'profile')}</div>
                    ${options.description ? `<p class="scan-summary">${escapeHtml(options.description)}</p>` : ''}
                    ${githubProfile && githubProfile !== '#' ? `<a class="gh-link" href="${escapeHtml(githubProfile)}" target="_blank" rel="noopener">Open GitHub profile &rarr;</a>` : ''}
                </div>
            </div>

            <div class="scan-stats">
                <div class="scan-stat">
                    <div class="scan-stat-label">Followers</div>
                    <div class="scan-stat-value">${github.followers ?? 0}</div>
                </div>
                <div class="scan-stat">
                    <div class="scan-stat-label">Repositories</div>
                    <div class="scan-stat-value">${github.repos ?? github.public_repos ?? 0}</div>
                </div>
                <div class="scan-stat">
                    <div class="scan-stat-label">LeetCode Solved</div>
                    <div class="scan-stat-value">${leetcode.totalSolved ?? 0}</div>
                </div>
                <div class="scan-stat">
                    <div class="scan-stat-label">Codeforces Rating</div>
                    <div class="scan-stat-value">${codeforces.rating ?? 'N/A'}</div>
                </div>
                <div class="scan-stat">
                    <div class="scan-stat-label">Codeforces Rank</div>
                    <div class="scan-stat-value">${escapeHtml(codeforces.rank || 'N/A')}</div>
                </div>
                <div class="scan-stat">
                    <div class="scan-stat-label">Persona Tags</div>
                    <div class="scan-stat-value">${persona.length}</div>
                </div>
            </div>

            <div class="persona-list">
                ${persona.length ? persona.map(personaTag => `<div class="persona-badge">${escapeHtml(personaTag)}</div>`).join('') : '<div class="placeholder">persona engine warming up</div>'}
            </div>
        </div>`;
}

function renderReadmeStats(containerId, github) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    if (!github) {
        container.innerHTML = '<div class="placeholder">connect a GitHub handle to preview README stats</div>';
        return;
    }

    const encoded = encodeURIComponent(github);
    const statsUrl = `https://github-readme-stats.vercel.app/api?username=${encoded}&show_icons=true&theme=tokyonight`;
    const langsUrl = `https://github-readme-stats.vercel.app/api/top-langs/?username=${encoded}&layout=compact&theme=tokyonight`;

    container.innerHTML = `
        <div class="readme-grid">
            <div class="readme-card">
                <div class="readme-card-label">README STATS</div>
                <img data-orig="${statsUrl}" src="${statsUrl}" alt="GitHub stats for ${escapeHtml(github)}" onerror="readmeImgFallback(this, '${encoded}')">
            </div>
            <div class="readme-card">
                <div class="readme-card-label">TOP LANGUAGES</div>
                <img data-orig="${langsUrl}" src="${langsUrl}" alt="Top languages for ${escapeHtml(github)}" onerror="readmeImgFallback(this, '${encoded}')">
            </div>
        </div>`;
}

function readmeImgFallback(imgEl, githubEncoded) {
    // First, attempt to retry the image by using an optional proxy URL the owner can set
    try {
        const orig = imgEl.dataset && imgEl.dataset.orig;
        if (window && window.README_PROXY && orig) {
            // avoid infinite loop: replace onerror handler and try proxy
            imgEl.onerror = () => {
                // final fallback if proxy also fails
                try {
                    const github = decodeURIComponent(githubEncoded || '');
                    const container = document.createElement('div');
                    container.className = 'placeholder';
                    container.innerHTML = `Unable to load stats — <a href="https://github.com/${escapeHtml(github)}" target="_blank" rel="noopener">Open GitHub profile</a>`;
                    imgEl.replaceWith(container);
                } catch (e) {
                    imgEl.style.display = 'none';
                }
            };

            imgEl.src = `${window.README_PROXY.replace(/\/$/, '')}?url=${encodeURIComponent(orig)}`;
            return;
        }

        // If no proxy is configured, show a friendly placeholder linking to the GitHub profile
        const github = decodeURIComponent(githubEncoded || '');
        const container = document.createElement('div');
        container.className = 'placeholder';
        container.innerHTML = `Unable to load stats — <a href="https://github.com/${escapeHtml(github)}" target="_blank" rel="noopener">Open GitHub profile</a>`;
        imgEl.replaceWith(container);
    } catch (e) {
        imgEl.style.display = 'none';
    }
}

async function scanDeveloper(github, leetcode, codeforces) {
    const githubHandle = String(github || '').trim();
    const leetcodeHandle = String(leetcode || '').trim();
    const codeforcesHandle = String(codeforces || '').trim();

    if (!githubHandle || !leetcodeHandle || !codeforcesHandle) {
        throw new Error('all three handles are required');
    }

    const params = new URLSearchParams({
        github: githubHandle,
        leetcode: leetcodeHandle,
        codeforces: codeforcesHandle
    });

    const response = await fetch(`${API_BASE}/scan?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`status ${response.status}`);
    }

    const data = await response.json();

    if (data && data.error) {
        throw new Error(data.error);
    }

    return data;
}

async function getProfile() {
    try {
        const usernameInput = document.getElementById('username');
        const result = document.getElementById('result');

        if (!usernameInput || !result) {
            console.error('[Get Profile] Missing DOM elements');
            return;
        }

        const username = usernameInput.value?.trim() || '';
        if (!username) {
            setError('result', 'ghBtn', 'username required');
            return;
        }

        setLoading('result', 'ghBtn', `scanning github://${escapeHtml(username)}...`);

        const response = await fetch(`${API_BASE}/github?username=${encodeURIComponent(username)}`);

        if (!response.ok) {
            throw new Error(`status ${response.status}`);
        }

        const body = await response.json();

        if (!body || body.error) {
            throw new Error((body && body.error) || 'user not found');
        }

        const avatarUrl = body.avatar || `https://github.com/${encodeURIComponent(username)}.png?size=240`;
        result.innerHTML = `
            <div class="result-block">
                <div class="gh-card">
                    <div class="gh-avatar">
                        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(body.name || username)}" onerror="this.style.display='none'">
                    </div>
                    <div>
                        <div class="gh-name">${escapeHtml(body.name || username)}</div>
                        <div class="gh-username">${escapeHtml(body.username || username)}</div>
                        <div class="gh-stats">
                            <div>
                                <div class="gh-stat-label">Followers</div>
                                <div class="gh-stat-value">${body.followers ?? '—'}</div>
                            </div>
                            <div>
                                <div class="gh-stat-label">Repos</div>
                                <div class="gh-stat-value">${body.repos ?? body.public_repos ?? '—'}</div>
                            </div>
                        </div>
                        ${body.profile || body.profile_url ? `<a class="gh-link" href="${escapeHtml(body.profile || body.profile_url)}" target="_blank" rel="noopener">Visit Profile &rarr;</a>` : ''}
                    </div>
                </div>
            </div>`;

        clearLoading('ghBtn');
    } catch (error) {
        setError('result', 'ghBtn', error?.message || 'Failed to fetch profile');
        console.error('[Get Profile] Error:', error);
    }
}

async function getContests() {
    try {
        const button = document.getElementById('contestBtn');
        const result = document.getElementById('contestResult');

        if (!button || !result) {
            console.error('[Contests] Missing DOM elements');
            return;
        }

        setLoading('contestResult', 'contestBtn', 'fetching upcoming contests...');

        const response = await fetch(`${API_BASE}/contests`);

        if (!response.ok) {
            throw new Error(`status ${response.status}`);
        }

        const contests = await response.json();

        if (!Array.isArray(contests) || contests.length === 0) {
            throw new Error('no contests returned');
        }

        const cards = contests.slice(0, 8).map(contest => {
            const phaseClass = `phase-${contest.phase || 'default'}`;
            return `
                <div class="contest-card">
                    <div class="contest-phase ${phaseClass}">${escapeHtml(contest.phase || 'PENDING')}</div>
                    <div class="contest-name">${escapeHtml(contest.name || 'Untitled')}</div>
                    <div class="contest-duration">
                        DURATION
                        <b>${formatDuration(contest.duration || 0)}</b>
                    </div>
                </div>`;
        }).join('');

        result.innerHTML = `
            <div class="result-block">
                <div class="contest-rail">${cards}</div>
            </div>`;

        clearLoading('contestBtn');
    } catch (error) {
        setError('contestResult', 'contestBtn', error?.message || 'Failed to fetch contests');
        console.error('[Contests] Error:', error);
    }
}

async function reviewCode() {
    const codeInput = document.getElementById('codeInput');
    const reviewResult = document.getElementById('reviewResult');
    const reviewStat = document.getElementById('reviewStat');
    const reviewButton = document.getElementById('reviewBtn');

    if (!codeInput || !reviewResult || !reviewStat || !reviewButton) {
        return;
    }

    const code = codeInput.value.trim();

    if (!code) {
        reviewResult.innerHTML = '<div class="status-msg error inline"><span>ERR //</span><span>paste some code first</span></div>';
        return;
    }

    reviewButton.disabled = true;
    reviewStat.textContent = 'analyzing...';
    reviewResult.innerHTML = `
        <div class="empty-output">
            <div class="icon" style="animation: blink 1.4s infinite;">AI</div>
            <h4>Groq is thinking...</h4>
            <p>Your code is being analyzed. This usually takes 2&ndash;5 seconds.</p>
        </div>`;

    try {
        const response = await fetch(`${API_BASE}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            throw new Error(`status ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const reviewText = data.review || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        reviewResult.innerHTML = formatReview(reviewText);
        reviewStat.textContent = `${reviewText.length} chars`;
    } catch (error) {
        reviewResult.innerHTML = `<div class="status-msg error inline"><span>ERR //</span><span>${escapeHtml(error.message)}</span></div>`;
        reviewStat.textContent = 'error';
    } finally {
        reviewButton.disabled = false;
    }
}

async function fetchLeetCodeStats() {
    try {
        const input = document.getElementById('leetcodeUsername');
        const result = document.getElementById('leetcodeResult');
        const button = document.getElementById('leetBtn');

        if (!input || !result || !button) {
            console.error('[LeetCode] Missing DOM elements');
            return;
        }

        const username = input.value?.trim() || '';

        if (!username) {
            result.innerHTML = '<div class="error-message">Enter a username</div>';
            return;
        }

        result.innerHTML = '<div class="loading">Fetching developer analytics...</div>';
        button.disabled = true;

        const response = await fetch(`${API_BASE}/leetcode?username=${encodeURIComponent(username)}`);

        if (!response.ok) {
            throw new Error(`status ${response.status}`);
        }

        const data = await response.json();

        if (data?.error) {
            throw new Error(data.error);
        }

        result.innerHTML = `
            <div class="leetcode-card">
                <h3>${escapeHtml(username)}</h3>
                <div class="leetcode-stats">
                    <div class="stat-box">Total Solved<span>${data.totalSolved ?? 0}</span></div>
                    <div class="stat-box">Easy<span>${data.easySolved ?? 0}</span></div>
                    <div class="stat-box">Medium<span>${data.mediumSolved ?? 0}</span></div>
                    <div class="stat-box">Hard<span>${data.hardSolved ?? 0}</span></div>
                    <div class="stat-box">Ranking<span>${data.ranking ?? '—'}</span></div>
                    <div class="stat-box">Acceptance<span>${data.acceptanceRate ?? '—'}%</span></div>
                </div>
            </div>`;
    } catch (error) {
        const result = document.getElementById('leetcodeResult');
        if (result) {
            result.innerHTML = `<div class="error-message">Failed to fetch LeetCode stats: ${escapeHtml(error?.message || 'Unknown error')}</div>`;
        }
        console.error('[LeetCode] Error:', error);
    } finally {
        const button = document.getElementById('leetBtn');
        if (button) {
            button.disabled = false;
        }
    }
}

function parseMaybeJson(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    try {
        return JSON.parse(trimmed);
    } catch (error) {
        return value;
    }
}

function unwrapApiResponse(payload) {
    let current = payload;

    for (let depth = 0; depth < 3; depth += 1) {
        if (typeof current === 'string') {
            const parsed = parseMaybeJson(current);
            if (parsed === current) {
                break;
            }

            current = parsed;
            continue;
        }

        if (current && typeof current === 'object' && typeof current.body === 'string') {
            const parsedBody = parseMaybeJson(current.body);
            if (parsedBody !== current.body) {
                current = parsedBody;
                continue;
            }
        }

        break;
    }

    return current;
}

function extractLinkedInPostText(payload) {
    const data = unwrapApiResponse(payload);

    if (!data) {
        return '';
    }

    if (typeof data === 'string') {
        return data.trim();
    }

    if (typeof data !== 'object') {
        return String(data).trim();
    }

    const candidate = data.result ?? data.error ?? data.message ?? data.body;

    if (typeof candidate === 'string') {
        const parsedCandidate = parseMaybeJson(candidate);
        if (parsedCandidate && typeof parsedCandidate === 'object') {
            return extractLinkedInPostText(parsedCandidate);
        }

        return candidate.trim();
    }

    if (candidate != null) {
        return String(candidate).trim();
    }

    return '';
}

async function handleSignup(event) {
    if (event) {
        event.preventDefault();
    }

    const message = document.getElementById('signupMsg');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const githubInput = document.getElementById('github');
    const leetcodeInput = document.getElementById('leetcode');
    const codeforcesInput = document.getElementById('codeforces');

    if (!message || !nameInput || !emailInput || !passwordInput || !githubInput || !leetcodeInput || !codeforcesInput) {
        return;
    }

    const user = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        github: githubInput.value.trim(),
        leetcode: leetcodeInput.value.trim(),
        codeforces: codeforcesInput.value.trim()
    };

    if (!user.name || !user.email || !user.password || !user.github || !user.leetcode || !user.codeforces) {
        setStatusMessage(message, 'fill out every signup field to continue', 'error');
        return;
    }

    localStorage.setItem('developerUser', JSON.stringify(user));
    localStorage.setItem('loggedIn', 'true');

    setStatusMessage(message, 'account created. redirecting to dashboard...');
    window.location.href = 'dashboard.html';
}

async function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }

    const message = document.getElementById('loginMsg');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (!message || !emailInput || !passwordInput) {
        return;
    }

    const storedUser = getStoredUser();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!storedUser) {
        setStatusMessage(message, 'no saved account found. create one first.', 'error');
        return;
    }

    if (storedUser.email !== email || storedUser.password !== password) {
        setStatusMessage(message, 'invalid email or password', 'error');
        return;
    }

    localStorage.setItem('loggedIn', 'true');
    setStatusMessage(message, 'login successful. opening dashboard...');
    window.location.href = 'dashboard.html';
}

function updatePasswordUI() {
    const passwordInput = document.getElementById('password');
    const strength = document.getElementById('passwordStrength');

    if (!passwordInput || !strength) {
        return;
    }

    const password = passwordInput.value;
    let label = 'strength: weak';

    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
        label = 'strength: strong';
    } else if (password.length >= 8 && ((/[A-Z]/.test(password) && /[a-z]/.test(password)) || /\d/.test(password))) {
        label = 'strength: medium';
    }

    strength.textContent = label;
}

async function loadMyDashboard() {
    try {
        const user = getStoredUser();
        const heading = document.getElementById('dashboardHeading');
        const subtitle = document.getElementById('dashboardSubtitle');
        const meta = document.getElementById('sessionMeta');
        const result = document.getElementById('myDashboardResult');
        const stats = document.getElementById('readmeStats');

        if (!user) {
            if (result) {
                result.innerHTML = '<div class="error-message">No saved session found. Please log in again.</div>';
            }
            return;
        }

    if (heading) {
        heading.textContent = `welcome back, ${user.name || 'developer'}`;
    }

    if (subtitle) {
        subtitle.textContent = 'your personal intelligence layer is loading from the saved localStorage profile.';
    }

    if (meta) {
        meta.innerHTML = `
            <span class="profile-chip">${escapeHtml(user.email)}</span>
            <span class="profile-chip">GitHub ${escapeHtml(user.github)}</span>
            <span class="profile-chip">LeetCode ${escapeHtml(user.leetcode)}</span>
            <span class="profile-chip">Codeforces ${escapeHtml(user.codeforces)}</span>`;
    }

    if (result) {
        result.innerHTML = '<div class="loading">loading saved developer intelligence...</div>';
    }

    const data = await scanDeveloper(user.github, user.leetcode, user.codeforces);
    renderDeveloperScan('myDashboardResult', data, {
        title: user.name,
        kicker: 'my dashboard',
        description: 'Auto-loaded from the saved session. No username re-entry required.'
    });
    renderReadmeStats('readmeStats', user.github);
    } catch (error) {
        const result = document.getElementById('myDashboardResult');
        const stats = document.getElementById('readmeStats');
        if (result) {
            result.innerHTML = `<div class="error-message">Failed to load dashboard: ${escapeHtml(error?.message || 'Unknown error')}</div>`;
        }
        if (stats) {
            stats.innerHTML = '';
        }
        console.error('[Load Dashboard] Error:', error);
    }
    console.log(user);
}

function initAuthPage() {
    try {
        if (isLoggedIn()) {
            window.location.href = 'dashboard.html';
            return;
        }

        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');

        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
            const pwd = document.getElementById('password');
            if (pwd) {
                pwd.addEventListener('input', updatePasswordUI);
                updatePasswordUI();
            }
        }

        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    } catch (error) {
        console.error('[Auth Page Init] Error:', error);
    }
}

function initDashboardPage() {
    try {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        initClock();
        initCodeWorkbench();

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    getProfile();
                }
            });
        }

        const dashboardUser = getStoredUser();
        if (dashboardUser) {
            const githubInput = document.getElementById('scanGithub');
            const leetcodeInput = document.getElementById('scanLeetcode');
            const codeforcesInput = document.getElementById('scanCodeforces');

            if (githubInput && !githubInput.value) {
                githubInput.value = dashboardUser.github || '';
            }
            if (leetcodeInput && !leetcodeInput.value) {
                leetcodeInput.value = dashboardUser.leetcode || '';
            }
            if (codeforcesInput && !codeforcesInput.value) {
                codeforcesInput.value = dashboardUser.codeforces || '';
            }
        }

        loadMyDashboard();
    } catch (error) {
        console.error('[Dashboard Init] Error:', error);
        window.location.href = 'login.html';
    }
}

function initExploreForm() {
    const exploreButton = document.getElementById('exploreScanBtn');
    const exploreForm = document.getElementById('exploreForm');

    if (!exploreForm) {
        return;
    }

    exploreForm.addEventListener('submit', async event => {
        event.preventDefault();

        const github = document.getElementById('exploreGithub');
        const leetcode = document.getElementById('exploreLeetcode');
        const codeforces = document.getElementById('exploreCodeforces');

        if (!github || !leetcode || !codeforces) {
            return;
        }

        const githubHandle = github.value.trim();
        const leetcodeHandle = leetcode.value.trim();
        const codeforcesHandle = codeforces.value.trim();

        if (!githubHandle || !leetcodeHandle || !codeforcesHandle) {
            setStatusMessage(document.getElementById('exploreStatus'), 'enter all three handles to scan a developer', 'error');
            return;
        }

        if (exploreButton) {
            exploreButton.disabled = true;
        }

        setStatusMessage(document.getElementById('exploreStatus'), 'scanning developer identity...');

        try {
            const data = await scanDeveloper(githubHandle, leetcodeHandle, codeforcesHandle);
            renderDeveloperScan('exploreResult', data, {
                title: githubHandle,
                kicker: 'explore developers',
                description: 'Search any public profile without touching the saved session.'
            });
            setStatusMessage(document.getElementById('exploreStatus'), 'scan complete');
        } catch (error) {
            const exploreResult = document.getElementById('exploreResult');
            if (exploreResult) {
                exploreResult.innerHTML = `<div class="error-message">${escapeHtml(error.message)}</div>`;
            }
            setStatusMessage(document.getElementById('exploreStatus'), error.message, 'error');
        } finally {
            if (exploreButton) {
                exploreButton.disabled = false;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body?.dataset.page || '';

    if (page === 'dashboard') {
        initDashboardPage();
        initExploreForm();
    }

    if (page === 'login' || page === 'signup') {
        initAuthPage();
    }

    if (document.getElementById('leetcodeUsername')) {
        const leetcodeUsername = document.getElementById('leetcodeUsername');
        leetcodeUsername.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                fetchLeetCodeStats();
            }
        });
    }
});