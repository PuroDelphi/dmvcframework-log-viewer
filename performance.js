// Performance Optimizations for Log Monitor
(function () {
    'use strict';

    // Debounce function to limit function calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for scroll events
    function throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Virtual scrolling implementation
    class VirtualScroller {
        constructor(container, items, renderItem, itemHeight = 40) {
            this.container = container;
            this.items = items;
            this.renderItem = renderItem;
            this.itemHeight = itemHeight;
            this.visibleStart = 0;
            this.visibleEnd = 0;
            this.totalHeight = 0;
            this.viewport = null;
            this.content = null;

            this.init();
        }

        init() {
            // Create viewport and content containers
            this.viewport = document.createElement('div');
            this.viewport.style.height = '100%';
            this.viewport.style.overflowY = 'auto';
            this.viewport.style.overflowX = 'hidden'; // Fix horizontal scroll
            this.viewport.style.position = 'relative';
            this.viewport.className = 'virtual-viewport';

            this.content = document.createElement('div');
            this.content.style.position = 'relative';
            this.content.style.width = '100%';
            this.content.className = 'virtual-content';

            this.viewport.appendChild(this.content);
            this.container.innerHTML = '';
            this.container.appendChild(this.viewport);

            // Add scroll listener
            this.viewport.addEventListener('scroll', throttle(() => this.onScroll(), 16));

            this.update(this.items);
        }

        update(newItems) {
            this.items = newItems;
            this.totalHeight = this.items.length * this.itemHeight;
            this.content.style.height = `${this.totalHeight}px`;
            this.render();
        }

        onScroll() {
            this.render();
        }

        render() {
            const scrollTop = this.viewport.scrollTop;
            const viewportHeight = this.viewport.clientHeight;

            // Calculate visible range with buffer
            const buffer = 5;
            this.visibleStart = Math.max(0, Math.floor(scrollTop / this.itemHeight) - buffer);
            this.visibleEnd = Math.min(
                this.items.length,
                Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + buffer
            );

            // Clear and render only visible items
            this.content.innerHTML = '';

            for (let i = this.visibleStart; i < this.visibleEnd; i++) {
                const item = this.items[i];
                const element = this.renderItem(item);
                element.style.position = 'absolute';
                element.style.top = `${i * this.itemHeight}px`;
                element.style.width = '100%';
                this.content.appendChild(element);
            }
        }

        isAtBottom() {
            // Tolerance of 50px
            return this.viewport.scrollHeight - this.viewport.scrollTop - this.viewport.clientHeight <= 50;
        }

        scrollToBottom() {
            this.viewport.scrollTop = this.viewport.scrollHeight;
        }

        destroy() {
            // Cleanup if needed
        }
    }

    // Helper to filter logs based on current state
    function getFilteredLogs(tag) {
        const logs = state.logsByTag[tag] || [];

        return logs.filter(log => {
            const matchesLevel = state.currentFilter === 'all' || log.level === state.currentFilter;
            const matchesSearch = !state.searchQuery ||
                log.message.toLowerCase().includes(state.searchQuery) ||
                log.raw.toLowerCase().includes(state.searchQuery);

            // Use global matchesDateTimeFilter if available (from datetime-filter.js)
            const matchesDateTime = window.matchesDateTimeFilter ? window.matchesDateTimeFilter(log.timestamp) : true;

            return matchesLevel && matchesSearch && matchesDateTime;
        });
    }

    // Memory management: Limit logs in memory
    const originalLoadLogsForTag = window.loadLogsForTag;
    if (originalLoadLogsForTag) {
        window.loadLogsForTag = async function (tag, files) {
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

                // Keep only the last maxEntries (memory optimization)
                const maxEntries = state.config?.maxEntriesPerTag || 500;
                const limitedLogs = allLogs.slice(-maxEntries);

                // Clear old logs from memory
                state.logsByTag[tag] = limitedLogs;

                displayLogs(tag);
                updateBadge(tag);

            } catch (error) {
                console.error(`Error loading logs for tag ${tag}:`, error);
            }
        };
    }

    // Optimize displayLogs with virtual scrolling
    const originalDisplayLogs = window.displayLogs;
    const virtualScrollers = {};

    window.displayLogs = function (tag) {
        const container = document.getElementById(`log-${tag}`);
        if (!container) return;

        // Get FILTERED logs first
        const filteredLogs = getFilteredLogs(tag);

        if (filteredLogs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div>No hay logs que coincidan con los filtros</div>
                </div>
            `;
            // Update stats
            updateStats(0);
            // Destroy scroller if exists to reset state
            if (virtualScrollers[tag]) {
                delete virtualScrollers[tag];
            }
            return;
        }

        // Use virtual scrolling for large datasets
        if (state.config?.enableVirtualScroll && filteredLogs.length > 100) {

            if (virtualScrollers[tag] && container.contains(virtualScrollers[tag].viewport)) {
                // UPDATE existing scroller
                const scroller = virtualScrollers[tag];
                const wasAtBottom = scroller.isAtBottom();

                scroller.update(filteredLogs);

                // Smart auto-scroll: Only scroll if user was at bottom AND autoScroll is enabled
                if (state.autoScroll && wasAtBottom) {
                    scroller.scrollToBottom();
                }
            } else {
                // CREATE new scroller
                virtualScrollers[tag] = new VirtualScroller(
                    container,
                    filteredLogs,
                    (log) => {
                        const entry = document.createElement('div');
                        entry.className = `log-entry ${log.level} no-animation`;
                        entry.dataset.level = log.level;
                        entry.dataset.timestamp = log.timestamp;

                        entry.innerHTML = `
                            <span class="log-timestamp">${log.timestamp}</span>
                            <span class="log-level ${log.level}">${log.level}</span>
                            <span class="log-message">${escapeHtml(log.message)}</span>
                            <span class="log-tag">[${log.tag}]</span>
                            ${log.source ? `<span class="log-source" title="Archivo: ${log.source}">📄</span>` : ''}
                        `;
                        return entry;
                    },
                    45 // item height in pixels
                );

                // Initial scroll to bottom if enabled
                if (state.autoScroll) {
                    virtualScrollers[tag].scrollToBottom();
                }
            }
        } else {
            // Use normal rendering for small datasets
            // Check if we need to scroll before clearing
            const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 50;

            container.innerHTML = '';
            filteredLogs.forEach(log => {
                const entry = createLogEntry(log);
                entry.classList.add('no-animation');
                container.appendChild(entry);
            });

            if (state.autoScroll && wasAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }

        // Update stats
        updateStats(filteredLogs.length);
    };

    // Debounced filter application
    window.applyFilters = debounce(function () {
        if (state.currentTab) {
            displayLogs(state.currentTab);
        }
    }, 100);

    // Memory cleanup on tab switch
    const originalSwitchTab = window.switchTab;
    if (originalSwitchTab) {
        window.switchTab = function (tabName) {
            // Call original function
            originalSwitchTab.call(this, tabName);

            // Suggest garbage collection (browser may ignore)
            if (window.gc) {
                window.gc();
            }
        };
    }

    // Periodic memory cleanup
    setInterval(() => {
        // Remove old logs beyond maxEntries for all tags
        const maxEntries = state.config?.maxEntriesPerTag || 500;
        Object.keys(state.logsByTag).forEach(tag => {
            if (state.logsByTag[tag].length > maxEntries) {
                state.logsByTag[tag] = state.logsByTag[tag].slice(-maxEntries);
            }
        });
    }, 30000); // Every 30 seconds

    console.log('✓ Performance optimizations loaded (v3 - Smart Scroll)');

})();
