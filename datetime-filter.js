// Date/Time Filter Functionality
(function () {
    // State for date/time filter
    const dateTimeFilter = {
        startDate: null,
        startTime: null,
        endDate: null,
        endTime: null,
        active: false
    };

    // Track previous log count to avoid unnecessary animations
    const previousLogCounts = {};

    // Initialize date/time filter controls
    function initDateTimeFilter() {
        const startDateInput = document.getElementById('startDate');
        const startTimeInput = document.getElementById('startTime');
        const endDateInput = document.getElementById('endDate');
        const endTimeInput = document.getElementById('endTime');
        const clearBtn = document.getElementById('clearDateFilter');

        // Add event listeners
        [startDateInput, startTimeInput, endDateInput, endTimeInput].forEach(input => {
            input.addEventListener('change', updateDateTimeFilter);
        });

        clearBtn.addEventListener('click', clearDateTimeFilter);
    }

    function updateDateTimeFilter() {
        const startDate = document.getElementById('startDate').value;
        const startTime = document.getElementById('startTime').value;
        const endDate = document.getElementById('endDate').value;
        const endTime = document.getElementById('endTime').value;

        dateTimeFilter.startDate = startDate;
        dateTimeFilter.startTime = startTime;
        dateTimeFilter.endDate = endDate;
        dateTimeFilter.endTime = endTime;
        dateTimeFilter.active = !!(startDate || startTime || endDate || endTime);

        // Reapply filters
        if (window.applyFilters) {
            window.applyFilters();
        }
    }

    function clearDateTimeFilter() {
        document.getElementById('startDate').value = '';
        document.getElementById('startTime').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('endTime').value = '';

        dateTimeFilter.startDate = null;
        dateTimeFilter.startTime = null;
        dateTimeFilter.endDate = null;
        dateTimeFilter.endTime = null;
        dateTimeFilter.active = false;

        if (window.applyFilters) {
            window.applyFilters();
        }
    }

    // Check if a log entry matches the date/time filter
    window.matchesDateTimeFilter = function (logTimestamp) {
        if (!dateTimeFilter.active) return true;

        // Parse log timestamp: "2025-11-25 17:22:04:997"
        const logDate = logTimestamp.substring(0, 10); // "2025-11-25"
        const logTime = logTimestamp.substring(11, 19); // "17:22:04"

        // Check start date/time
        if (dateTimeFilter.startDate) {
            if (logDate < dateTimeFilter.startDate) return false;
            if (logDate === dateTimeFilter.startDate && dateTimeFilter.startTime) {
                if (logTime < dateTimeFilter.startTime) return false;
            }
        }

        // Check end date/time
        if (dateTimeFilter.endDate) {
            if (logDate > dateTimeFilter.endDate) return false;
            if (logDate === dateTimeFilter.endDate && dateTimeFilter.endTime) {
                if (logTime > dateTimeFilter.endTime) return false;
            }
        }

        return true;
    };

    // Override the original applyFilters function
    const originalApplyFilters = window.applyFilters;
    window.applyFilters = function () {
        if (!state.currentTab) return;

        const container = document.getElementById(`log-${state.currentTab}`);
        if (!container) return;

        const entries = container.querySelectorAll('.log-entry');
        let visibleCount = 0;

        entries.forEach(entry => {
            const level = entry.dataset.level;
            const timestamp = entry.dataset.timestamp;
            const text = entry.textContent.toLowerCase();

            const matchesFilter = state.currentFilter === 'all' || level === state.currentFilter;
            const matchesSearch = !state.searchQuery || text.includes(state.searchQuery);
            const matchesDateTime = matchesDateTimeFilter(timestamp);

            if (matchesFilter && matchesSearch && matchesDateTime) {
                entry.classList.remove('hidden');
                visibleCount++;
            } else {
                entry.classList.add('hidden');
            }
        });

        updateStats(visibleCount);
    };

    // Override createLogEntry to add timestamp data attribute and control animation
    const originalCreateLogEntry = window.createLogEntry;
    window.createLogEntry = function (log) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${log.level}`;
        entry.dataset.level = log.level;
        entry.dataset.timestamp = log.timestamp; // Add timestamp for filtering

        const levelClass = log.level;

        entry.innerHTML = `
            <span class="log-timestamp">${log.timestamp}</span>
            <span class="log-level ${levelClass}">${log.level}</span>
            <span class="log-message">${escapeHtml(log.message)}</span>
            <span class="log-tag">[${log.tag}]</span>
            ${log.source ? `<span class="log-source" title="Archivo: ${log.source}">📄</span>` : ''}
        `;

        return entry;
    };

    // Override displayLogs to control animations
    const originalDisplayLogs = window.displayLogs;
    window.displayLogs = function (tag) {
        const container = document.getElementById(`log-${tag}`);
        if (!container) return;

        const shouldScroll = state.autoScroll && (container.scrollHeight - container.scrollTop <= container.clientHeight + 100);

        const logs = state.logsByTag[tag] || [];
        const currentCount = logs.length;
        const previousCount = previousLogCounts[tag] || 0;
        const hasNewLogs = currentCount > previousCount;

        // Clear container
        container.innerHTML = '';

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
        logs.forEach((log, index) => {
            const entry = createLogEntry(log);

            // Disable animation for existing logs (only animate new ones)
            if (!hasNewLogs || index < previousCount) {
                entry.classList.add('no-animation');
            }

            container.appendChild(entry);
        });

        // Update previous count
        previousLogCounts[tag] = currentCount;

        // Apply filters
        applyFilters();

        // Auto scroll
        if (shouldScroll) {
            container.scrollTop = container.scrollHeight;
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDateTimeFilter);
    } else {
        initDateTimeFilter();
    }

    // Export for debugging
    window.dateTimeFilter = dateTimeFilter;
})();
