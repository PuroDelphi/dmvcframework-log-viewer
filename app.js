// State
const state = {
    config: null,
    logsByTag: {}, // { tagName: [logEntries] }
    logFiles: [], // Discovered log files from API
    detectedTags: new Set(),
    currentTab: null,
    currentFilter: 'all',
    searchQuery: '',
    isPaused: false,
    autoScroll: true,
    updateIntervalId: null
};

// Helper to get full URL
function getUrl(path) {
    let baseUrl = (window.AppConfig && window.AppConfig.serverUrl) || '';

    // Remove trailing slash from baseUrl if present
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    // Ensure path starts with slash
    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    return `${baseUrl}${path}`;
}

// Tag icons mapping
const TAG_ICONS = {
    'dmvcframework': '🔧',
    'trace': '🔍',
    'error': '❌',
    'errors': '❌',
    'debug': '🐛',
    'info': 'ℹ️',
    'warning': '⚠️',
    'system': '⚙️',
    'access': '🔐',
    'security': '🛡️',
    'database': '💾',
    'api': '🌐',
    'default': '📝'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    await loadConfiguration();
    await discoverLogs();
});

// Event Listeners
function initializeEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            setFilter(level);
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });

    // Action buttons
    document.getElementById('clearBtn').addEventListener('click', clearLogs);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('autoScrollBtn').addEventListener('click', toggleAutoScroll);
}

// Load configuration from server
async function loadConfiguration() {
    try {
        const response = await fetch(getUrl('/api/config'));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        state.config = await response.json();
        console.log('✓ Configuration loaded:', state.config);
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Use default config
        state.config = {
            updateInterval: 2000,
            maxEntriesPerTag: 1000,
            autoScroll: true
        };
    }
}

// Discover log files from server API
async function discoverLogs() {
    try {
        showLoadingMessage();

        const response = await fetch(getUrl('/api/logs'));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        state.logFiles = data.logs || [];

        console.log(`✓ Discovered ${state.logFiles.length} log files`);

        if (state.logFiles.length === 0) {
            showNoLogsMessage();
            return;
        }

        // Extract unique tags
        state.detectedTags.clear();
        state.logFiles.forEach(log => {
            state.detectedTags.add(log.tag);
        });

        // Initialize UI with discovered tags
        initializeTabs();
        startAutoUpdate();

    } catch (error) {
        console.error('Error discovering log files:', error);
        showErrorMessage('No se pudo conectar con el servidor. Asegúrate de que server.py esté ejecutándose.');
    }
}

// Initialize tabs based on detected tags
function initializeTabs() {
    const tabsContainer = document.getElementById('tabsContainer');
    const contentContainer = document.getElementById('logContentContainer');

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    const tags = Array.from(state.detectedTags).sort();

    if (tags.length === 0) {
        showNoLogsMessage();
        return;
    }

    tags.forEach((tag, index) => {
        // Create tab button
        const tabBtn = document.createElement('button');
        tabBtn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        tabBtn.dataset.tab = tag;

        const icon = TAG_ICONS[tag.toLowerCase()] || TAG_ICONS.default;

        // Count files for this tag
        const fileCount = state.logFiles.filter(f => f.tag === tag).length;

        tabBtn.innerHTML = `
            <span class="tab-icon">${icon}</span>
            ${capitalizeTag(tag)}
            <span class="badge" id="badge-${tag}">0</span>
            ${fileCount > 1 ? `<span class="file-count" title="${fileCount} archivos">(${fileCount})</span>` : ''}
        `;

        tabBtn.addEventListener('click', () => switchTab(tag));
        tabsContainer.appendChild(tabBtn);

        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;
        tabContent.id = `tab-${tag}`;

        const logEntries = document.createElement('div');
        logEntries.className = 'log-entries';
        logEntries.id = `log-${tag}`;

        tabContent.appendChild(logEntries);
        contentContainer.appendChild(tabContent);

        // Initialize log array for this tag
        state.logsByTag[tag] = [];
    });

    // Set initial tab
    if (tags.length > 0) {
        state.currentTab = tags[0];
    }

    updateTagsCount();
}

function capitalizeTag(tag) {
    return tag.split(/[-_]/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Tab Management
function switchTab(tabName) {
    state.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    applyFilters();
}

// Filter Management
function setFilter(level) {
    state.currentFilter = level;
    applyFilters();
}

function applyFilters() {
    if (!state.currentTab) return;

    const container = document.getElementById(`log-${state.currentTab}`);
    if (!container) return;

    const entries = container.querySelectorAll('.log-entry');
    let visibleCount = 0;

    entries.forEach(entry => {
        const level = entry.dataset.level;
        const text = entry.textContent.toLowerCase();

        const matchesFilter = state.currentFilter === 'all' || level === state.currentFilter;
        const matchesSearch = !state.searchQuery || text.includes(state.searchQuery);

        if (matchesFilter && matchesSearch) {
            entry.classList.remove('hidden');
            visibleCount++;
        } else {
            entry.classList.add('hidden');
        }
    });

    updateStats(visibleCount);
}

// Log Loading
async function loadLogs() {
    if (state.isPaused) return;

    try {
        // Get all log files for each tag
        const tagFiles = {};
        state.logFiles.forEach(file => {
            if (!tagFiles[file.tag]) {
                tagFiles[file.tag] = [];
            }
            tagFiles[file.tag].push(file);
        });

        // Load logs for each tag
        await Promise.all(
            Object.entries(tagFiles).map(([tag, files]) =>
                loadLogsForTag(tag, files)
            )
        );

        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

async function loadLogsForTag(tag, files) {
    try {
        const allLogs = [];

        // Load all files for this tag
        for (const file of files) {
            const logs = await loadLogFile(file);
            allLogs.push(...logs);
        }

        // Sort by timestamp
        allLogs.sort((a, b) => {
            if (a.timestamp < b.timestamp) return -1;
            if (a.timestamp > b.timestamp) return 1;
            return 0;
        });

        // Keep only the last maxEntries
        const maxEntries = state.config?.maxEntriesPerTag || 1000;
        state.logsByTag[tag] = allLogs.slice(-maxEntries);

        displayLogs(tag);
        updateBadge(tag);

    } catch (error) {
        console.error(`Error loading logs for tag ${tag}:`, error);
    }
}

async function loadLogFile(fileInfo) {
    try {
        const response = await fetch(getUrl(fileInfo.path), {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        return parseLogFile(text, fileInfo);

    } catch (error) {
        console.error(`Error loading ${fileInfo.filename}:`, error);
        return [];
    }
}

function parseLogFile(text, fileInfo) {
    const lines = text.split('\n').filter(line => line.trim());
    const logs = [];

    lines.forEach(line => {
        const parsed = parseLogLine(line, fileInfo);
        if (parsed) {
            logs.push(parsed);
        }
    });

    return logs;
}

function parseLogLine(line, fileInfo) {
    // Pattern: 2025-11-25 17:22:04:997 [TID    25512][INFO   ] Message [tag]
    // More flexible pattern to handle varying spaces
    const pattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}:\d{3})\s+\[TID\s+(\d+)\]\[(\w+)\s*\]\s+(.+?)(?:\s+\[([^\]]+)\])?\s*$/;

    const match = line.match(pattern);

    if (match) {
        return {
            timestamp: match[1],
            tid: match[2],
            level: match[3].trim(),
            message: match[4].trim(),
            tag: match[5] || fileInfo.tag,
            source: fileInfo.filename,
            raw: line
        };
    }

    return null;
}

function displayLogs(tag) {
    const container = document.getElementById(`log-${tag}`);
    if (!container) return;

    const shouldScroll = state.autoScroll && (container.scrollHeight - container.scrollTop <= container.clientHeight + 100);

    // Clear container
    container.innerHTML = '';

    const logs = state.logsByTag[tag] || [];

    if (logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div>No hay logs disponibles para "${capitalizeTag(tag)}"</div>
            </div>
        `;
        return;
    }

    // Create log entries
    logs.forEach(log => {
        const entry = createLogEntry(log);
        container.appendChild(entry);
    });

    // Apply filters
    applyFilters();

    // Auto scroll
    if (shouldScroll) {
        container.scrollTop = container.scrollHeight;
    }
}


function createLogEntry(log) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${log.level}`;
    entry.dataset.level = log.level;

    const levelClass = log.level;

    entry.innerHTML = `
        <span class="log-timestamp">${log.timestamp}</span>
        <span class="log-level ${levelClass}">${log.level}</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
        <span class="log-tag">[${log.tag}]</span>
        ${log.source ? `<span class="log-source" title="Archivo: ${log.source}">📄</span>` : ''}
    `;

    return entry;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// UI Updates
function updateBadge(tag) {
    const badge = document.getElementById(`badge-${tag}`);
    if (badge) {
        badge.textContent = (state.logsByTag[tag] || []).length;
    }
}

function updateStats(visibleCount) {
    const totalEntries = state.currentTab ? (state.logsByTag[state.currentTab] || []).length : 0;
    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('filteredEntries').textContent = visibleCount;
}

function updateTagsCount() {
    document.getElementById('tagsCount').textContent = state.detectedTags.size;
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES');
    document.getElementById('lastUpdate').textContent = timeString;
}

// Messages
function showLoadingMessage() {
    const container = document.getElementById('logContentContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <div>Cargando logs...</div>
        </div>
    `;
}

function showNoLogsMessage() {
    const container = document.getElementById('logContentContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <div>No se encontraron archivos de log</div>
            <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                Verifica la configuración en <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">config.json</code>
            </div>
        </div>
    `;
}

function showErrorMessage(message) {
    const container = document.getElementById('logContentContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div>${escapeHtml(message)}</div>
            <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                Inicia el servidor con:<br>
                <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">python server.py</code>
            </div>
        </div>
    `;
}

// Actions
function clearLogs() {
    if (!state.currentTab) return;

    if (confirm('¿Estás seguro de que quieres limpiar la vista de logs?')) {
        state.logsByTag[state.currentTab] = [];
        displayLogs(state.currentTab);
        updateBadge(state.currentTab);
    }
}

function togglePause() {
    state.isPaused = !state.isPaused;
    const btn = document.getElementById('pauseBtn');

    if (state.isPaused) {
        btn.textContent = '▶️ Reanudar';
        btn.classList.add('active');
        updateStatusIndicator(false);
    } else {
        btn.textContent = '⏸️ Pausar';
        btn.classList.remove('active');
        updateStatusIndicator(true);
        loadLogs(); // Immediate update
    }
}

function toggleAutoScroll() {
    state.autoScroll = !state.autoScroll;
    const btn = document.getElementById('autoScrollBtn');
    btn.classList.toggle('active', state.autoScroll);
}

function updateStatusIndicator(isActive) {
    const status = document.getElementById('status');
    if (isActive) {
        status.innerHTML = '<span class="pulse"></span>Conectado';
        status.style.background = 'rgba(0, 255, 136, 0.1)';
        status.style.borderColor = 'var(--success)';
    } else {
        status.innerHTML = '<span class="pulse" style="background: var(--warning);"></span>Pausado';
        status.style.background = 'rgba(255, 170, 0, 0.1)';
        status.style.borderColor = 'var(--warning)';
    }
}

// Auto Update
function startAutoUpdate() {
    // Initial load
    loadLogs();

    // Set up interval
    const interval = state.config?.updateInterval || 2000;
    state.updateIntervalId = setInterval(() => {
        loadLogs();
    }, interval);
}

function stopAutoUpdate() {
    if (state.updateIntervalId) {
        clearInterval(state.updateIntervalId);
        state.updateIntervalId = null;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
});

// Periodic file discovery to detect new log files and tags
let fileDiscoveryIntervalId = null;

async function rediscoverFiles() {
    try {
        const response = await fetch(getUrl('/api/refresh'));
        if (!response.ok) {
            console.error('Failed to refresh log files');
            return;
        }

        const data = await response.json();
        const newLogFiles = data.logs || [];

        // Extract new tags
        const newTags = new Set();
        newLogFiles.forEach(log => {
            newTags.add(log.tag);
        });

        // Check if there are new tags
        const hasNewTags = Array.from(newTags).some(tag => !state.detectedTags.has(tag));

        if (hasNewTags) {
            console.log('✓ New tags detected, updating UI...');

            // Update state
            state.logFiles = newLogFiles;
            const oldCurrentTab = state.currentTab;

            // Clear and rebuild tags
            state.detectedTags.clear();
            newLogFiles.forEach(log => {
                state.detectedTags.add(log.tag);
            });

            // Rebuild tabs
            initializeTabs();

            // Try to restore previous tab
            if (oldCurrentTab && state.detectedTags.has(oldCurrentTab)) {
                switchTab(oldCurrentTab);
            }

            // Reload logs for all tags
            loadLogs();
        } else {
            // Just update the file list (in case file sizes changed)
            state.logFiles = newLogFiles;
        }

    } catch (error) {
        console.error('Error rediscovering files:', error);
    }
}

function startFileDiscovery() {
    // Check for new files every 10 seconds
    fileDiscoveryIntervalId = setInterval(rediscoverFiles, 10000);
    console.log('✓ File discovery started (checking every 10 seconds)');
}

function stopFileDiscovery() {
    if (fileDiscoveryIntervalId) {
        clearInterval(fileDiscoveryIntervalId);
        fileDiscoveryIntervalId = null;
    }
}

// Start file discovery after initial load
setTimeout(() => {
    startFileDiscovery();
}, 5000); // Wait 5 seconds after page load

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopFileDiscovery();
});
